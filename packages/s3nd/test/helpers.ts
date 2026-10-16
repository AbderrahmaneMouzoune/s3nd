import { S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { vi } from 'vitest'

import { createBucket } from '../src/bucket.js'

export interface StubCall {
  command: { constructor: { name: string }; input: Record<string, any> }
  options?: { abortSignal?: AbortSignal }
}

/**
 * Minimal stand-in for `S3Client`: records the commands it is handed and
 * replies with a canned response. Keeps the tests offline and dependency-free.
 */
export function createStubClient(response: Record<string, unknown> = {}, error?: Error) {
  const calls: StubCall[] = []

  const send = vi.fn(async (command: any, options?: any) => {
    calls.push({ command, options })
    if (error) throw error
    return response
  })

  return { client: { send, destroy: vi.fn() } as unknown as S3Client, calls, send }
}

/** Removes every environment variable s3nd reads, so tests are hermetic. */
export function clearBucketEnv(): void {
  for (const name of [
    'S3ND_BUCKET',
    'S3_BUCKET',
    'S3ND_REGION',
    'AWS_REGION',
    'AWS_DEFAULT_REGION',
    'S3ND_ENDPOINT',
    'S3_ENDPOINT',
    'S3ND_PUBLIC_URL',
    'S3_PUBLIC_URL',
  ]) {
    vi.stubEnv(name, undefined)
  }
}

/** Mimics the body of a `GetObject` response, with the AWS SDK stream helpers. */
export function s3Body(content: string) {
  const bytes = new TextEncoder().encode(content)

  return {
    transformToByteArray: async () => bytes,
    transformToString: async () => content,
  }
}

/** The error the AWS SDK raises when the key does not exist. */
export function notFoundError(): Error {
  return Object.assign(new Error('The specified key does not exist.'), {
    name: 'NoSuchKey',
    $metadata: { httpStatusCode: 404 },
  })
}

/**
 * A miniature S3: keeps objects in a Map and honours the conditional headers,
 * so a snapshot can genuinely round-trip without a network.
 */
export interface MemoryClientOptions {
  /**
   * How the backend treats `If-None-Match` / `If-Match` on `PutObject`:
   * honour them like S3 and R2 (the default), refuse them with a status like
   * some older builds (`{ refuse: 501 }`), or ignore them and overwrite.
   */
  conditionalWrites?: 'supported' | 'ignored' | { refuse: number; name?: string }
}

export function createMemoryClient(options: MemoryClientOptions = {}) {
  const conditionalWrites = options.conditionalWrites ?? 'supported'
  const objects = new Map<
    string,
    {
      body: Uint8Array
      contentType?: string
      metadata?: Record<string, string>
      etag: string
      lastModified: Date
    }
  >()
  /** Multipart uploads started and neither completed nor aborted. */
  const uploads = new Map<
    string,
    { key: string; contentType?: string; metadata?: Record<string, string>; parts: Map<number, Uint8Array> }
  >()
  let counter = 0
  let lifecycle: Record<string, any>[] | undefined

  function precondition(message: string): Error {
    return Object.assign(new Error(message), {
      name: 'PreconditionFailed',
      $metadata: { httpStatusCode: 412 },
    })
  }

  async function bytesOf(body: any): Promise<Uint8Array> {
    if (body instanceof Uint8Array || typeof body === 'string') return Buffer.from(body)

    const chunks: Uint8Array[] = []
    for await (const chunk of body) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks)
  }

  /** What PutObject and CompleteMultipartUpload do with If-None-Match / If-Match. */
  function checkPreconditions(input: any, stored: { etag: string } | undefined): void {
    const conditional = input.IfNoneMatch != null || input.IfMatch != null

    if (conditional && typeof conditionalWrites === 'object') {
      throw Object.assign(new Error('A header you provided implies functionality that is not implemented'), {
        name: conditionalWrites.name ?? 'NotImplemented',
        $metadata: { httpStatusCode: conditionalWrites.refuse },
      })
    }

    // A backend that does not know the headers writes unconditionally.
    if (conditionalWrites !== 'supported') return

    if (input.IfNoneMatch === '*' && stored) {
      throw precondition('At least one of the pre-conditions you specified did not hold')
    }

    if (input.IfMatch != null && (!stored || input.IfMatch !== `"${stored.etag}"`)) {
      throw precondition('At least one of the pre-conditions you specified did not hold')
    }
  }

  function noSuchUpload(): Error {
    return Object.assign(new Error('The specified upload does not exist.'), {
      name: 'NoSuchUpload',
      $metadata: { httpStatusCode: 404 },
    })
  }

  const send = vi.fn(async (command: any, options?: { abortSignal?: AbortSignal }) => {
    const name = command.constructor.name
    const input = command.input
    const stored = objects.get(input.Key)

    if (options?.abortSignal?.aborted) {
      throw Object.assign(new Error('Request aborted'), { name: 'AbortError' })
    }

    if (name === 'CreateMultipartUploadCommand') {
      counter += 1
      const uploadId = `upload-${counter}`
      uploads.set(uploadId, {
        key: input.Key,
        contentType: input.ContentType,
        metadata: input.Metadata,
        parts: new Map(),
      })

      return { UploadId: uploadId }
    }

    if (name === 'UploadPartCommand') {
      const upload = uploads.get(input.UploadId)
      if (!upload || upload.key !== input.Key) throw noSuchUpload()

      const body = await bytesOf(input.Body)
      upload.parts.set(input.PartNumber, body)

      return { ETag: `"part-${input.PartNumber}-${body.byteLength}"` }
    }

    if (name === 'CompleteMultipartUploadCommand') {
      const upload = uploads.get(input.UploadId)
      if (!upload || upload.key !== input.Key) throw noSuchUpload()

      checkPreconditions(input, stored)

      const listed: { PartNumber: number; ETag: string }[] = input.MultipartUpload?.Parts ?? []
      const pieces = listed.map((part, index) => {
        const body = upload.parts.get(part.PartNumber)
        // S3 wants every listed part, in ascending order, with the ETag it
        // handed out, and every part but the last at least 5 MiB.
        if (!body || part.PartNumber !== index + 1 || part.ETag !== `"part-${part.PartNumber}-${body.byteLength}"`) {
          throw Object.assign(new Error('One or more of the specified parts could not be found.'), {
            name: 'InvalidPart',
            $metadata: { httpStatusCode: 400 },
          })
        }

        if (index < listed.length - 1 && body.byteLength < 5 * 1024 * 1024) {
          throw Object.assign(new Error('Your proposed upload is smaller than the minimum allowed size.'), {
            name: 'EntityTooSmall',
            $metadata: { httpStatusCode: 400 },
          })
        }

        return body
      })

      uploads.delete(input.UploadId)
      counter += 1
      const etag = `etag-${counter}-${listed.length}`
      objects.set(input.Key, {
        body: Buffer.concat(pieces),
        contentType: upload.contentType,
        metadata: upload.metadata,
        etag,
        lastModified: new Date(),
      })

      return { ETag: `"${etag}"` }
    }

    if (name === 'AbortMultipartUploadCommand') {
      if (!uploads.delete(input.UploadId)) throw noSuchUpload()
      return {}
    }

    if (name === 'PutObjectCommand') {
      checkPreconditions(input, stored)

      counter += 1
      const etag = `etag-${counter}`
      objects.set(input.Key, {
        body: await bytesOf(input.Body),
        contentType: input.ContentType,
        metadata: input.Metadata,
        etag,
        lastModified: new Date(),
      })

      return { ETag: `"${etag}"` }
    }

    if (name === 'GetObjectCommand') {
      if (!stored) {
        throw Object.assign(new Error('The specified key does not exist.'), {
          name: 'NoSuchKey',
          $metadata: { httpStatusCode: 404 },
        })
      }

      return {
        Body: Object.assign(Readable.from([Buffer.from(stored.body)]), {
          transformToByteArray: async () => stored.body,
          transformToString: async () => Buffer.from(stored.body).toString('utf8'),
        }),
        ContentType: stored.contentType,
        ContentLength: stored.body.byteLength,
        LastModified: stored.lastModified,
        Metadata: stored.metadata ?? {},
        ETag: `"${stored.etag}"`,
      }
    }

    if (name === 'HeadObjectCommand') {
      if (!stored) {
        throw Object.assign(new Error('Not Found'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } })
      }

      return {
        ContentType: stored.contentType,
        ContentLength: stored.body.byteLength,
        LastModified: stored.lastModified,
        Metadata: stored.metadata ?? {},
        ETag: `"${stored.etag}"`,
      }
    }

    if (name === 'ListObjectsV2Command') {
      const keys = [...objects.keys()].filter((key) => key.startsWith(input.Prefix ?? '')).sort()
      const start = input.ContinuationToken ? Number(input.ContinuationToken) : 0
      const maxKeys = input.MaxKeys ?? 1000
      const page = keys.slice(start, start + maxKeys)
      const truncated = start + maxKeys < keys.length

      return {
        Contents: page.map((key) => {
          const object = objects.get(key)!
          return { Key: key, Size: object.body.byteLength, ETag: `"${object.etag}"`, LastModified: object.lastModified }
        }),
        IsTruncated: truncated,
        NextContinuationToken: truncated ? String(start + maxKeys) : undefined,
      }
    }

    if (name === 'CopyObjectCommand') {
      const [, ...rest] = String(input.CopySource).split('/')
      const sourceKey = rest.map(decodeURIComponent).join('/')
      const source = objects.get(sourceKey)

      if (!source) {
        throw Object.assign(new Error('The specified key does not exist.'), {
          name: 'NoSuchKey',
          $metadata: { httpStatusCode: 404 },
        })
      }

      // REPLACE is what a presigned upload's completion asks for.
      const replace = input.MetadataDirective === 'REPLACE'
      counter += 1
      const etag = `etag-${counter}`
      const lastModified = new Date()
      objects.set(input.Key, {
        ...source,
        ...(replace ? { contentType: input.ContentType, metadata: input.Metadata } : {}),
        etag,
        lastModified,
      })

      return { CopyObjectResult: { ETag: `"${etag}"`, LastModified: lastModified } }
    }

    if (name === 'DeleteObjectCommand') {
      objects.delete(input.Key)
      return {}
    }

    if (name === 'HeadBucketCommand') {
      return {}
    }

    if (name === 'GetBucketLifecycleConfigurationCommand') {
      if (lifecycle === undefined) {
        throw Object.assign(new Error('The lifecycle configuration does not exist.'), {
          name: 'NoSuchLifecycleConfiguration',
          $metadata: { httpStatusCode: 404 },
        })
      }

      return { Rules: lifecycle }
    }

    throw new Error(`Unexpected command: ${name}`)
  })

  return {
    client: {
      send,
      destroy: vi.fn(),
      // Shaped like the real client's, so `doctor` can be exercised against it.
      config: {
        region: 'eu-west-3',
        credentials: async () => ({ accessKeyId: 'AKIAEXAMPLE1234', secretAccessKey: 'secret' }),
      },
    } as unknown as S3Client,
    objects,
    uploads,
    send,
    /** Installs the lifecycle rules `GetBucketLifecycleConfiguration` reports. */
    setLifecycle(rules: Record<string, any>[] | undefined) {
      lifecycle = rules
    },
  }
}

/** Where `memoryBucket()` signs its URLs; a fake `fetch` sends those to `bucketPut()`. */
export const MEMORY_ENDPOINT = 'http://s3.test'

/**
 * A real `S3Client`, so presigning signs real URLs, whose `send` is the
 * in-memory S3's. `getSignedUrl` never calls `send`.
 */
export function memoryBucket(options: { maxSize?: number; prefix?: string } = {}) {
  const memory = createMemoryClient()
  const client = new S3Client({
    region: 'eu-west-3',
    endpoint: MEMORY_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' },
  })
  Object.assign(client, { send: memory.send })

  return { memory, bucket: createBucket({ bucket: 'transfers', client, ...options }) }
}

/**
 * Stands in for the bucket's HTTP side: honours what a presigned URL signs
 * (the length and type) and stores the bytes where the URL points.
 */
export async function bucketPut(memory: ReturnType<typeof createMemoryClient>, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';')
  const key = decodeURIComponent(url.pathname.replace(/^\/transfers\//, ''))
  const body = new Uint8Array(await request.arrayBuffer())

  if (!url.searchParams.has('X-Amz-Signature') || request.method !== 'PUT') {
    return new Response('AccessDenied', { status: 403 })
  }

  if (signed.includes('content-length') && request.headers.get('content-length') !== null) {
    if (Number(request.headers.get('content-length')) !== body.byteLength) {
      return new Response('BadDigest', { status: 400 })
    }
  }

  if ([...url.searchParams.keys()].some((name) => /checksum/i.test(name))) {
    return new Response('BadDigest: a checksum was signed into the URL', { status: 400 })
  }

  const metadata: Record<string, string> = {}
  for (const [name, value] of url.searchParams) {
    if (name.startsWith('x-amz-meta-')) metadata[name.slice('x-amz-meta-'.length)] = value
  }

  memory.objects.set(key, {
    body,
    contentType: request.headers.get('content-type') ?? undefined,
    metadata,
    etag: `put-${body.byteLength}`,
    lastModified: new Date(),
  })

  return new Response(null, { status: 200 })
}
