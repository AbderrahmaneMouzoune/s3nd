import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Readable } from 'node:stream'

import { normalizeBody, type NormalizedBody } from './body.js'
import { createS3Client, resolveConfig } from './config.js'
import { S3ndError } from './errors.js'
import { assertValidKey, encodeKey, generateKey, joinKey, normalizePrefix, sanitizeFilename } from './key.js'
import { DEFAULT_CONTENT_TYPE, lookupContentType } from './mime.js'
import { chunksOf, partsOf, SizeExceeded, slicesOf, uploadMultipart } from './multipart.js'
import { decodeSnapshot, encodeSnapshot, ENVELOPE_VERSION } from './snapshot.js'
import { createSyncCodes } from '@s3nd/protocol'
import type {
  BucketConfig,
  CopyOptions,
  CopyResult,
  DeleteOptions,
  DeleteSnapshotOptions,
  GetOptions,
  GetSnapshotOptions,
  GetUrlOptions,
  HasSnapshotOptions,
  HeadOptions,
  ListedObject,
  ListOptions,
  PutOptions,
  PresignedPut,
  PresignUploadOptions,
  PutSnapshotOptions,
  ResolvedConfig,
  Snapshot,
  SnapshotEnvelope,
  SnapshotResult,
  StoredFile,
  StoredFileInfo,
  SyncCodes,
  UploadBody,
  UploadOptions,
  UploadResult,
} from './types.js'

/** S3 caps `DeleteObjects` at 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000
/** S3 caps `ListObjectsV2` at 1000 keys per page. */
const LIST_PAGE_SIZE = 1000
/** SigV4 caps presigned URL lifetime at 7 days. */
const MAX_EXPIRES_IN = 604_800
const DEFAULT_EXPIRES_IN = 3600
/** User metadata must be US-ASCII, so the original filename is stored encoded. */
const FILENAME_METADATA_KEY = 'filename'
/**
 * A snapshot's expiry, mirrored out of the gzipped envelope into user metadata
 * so `hasSnapshot()` can answer from a `HeadObject` alone.
 */
const EXPIRES_AT_METADATA_KEY = 's3nd-expires-at'
const SNAPSHOT_CONTENT_TYPE = 'application/json'
const COMPRESSED_SNAPSHOT_CONTENT_TYPE = 'application/gzip'

/** The AWS SDK adds these helpers to the body of a `GetObject` response. */
type SdkStream = Readable & {
  transformToByteArray(): Promise<Uint8Array>
  transformToString(encoding?: string): Promise<string>
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** S3 answers a failed IfMatch/IfNoneMatch with 412, or 409 under a race. */
/**
 * 400s that say something about the body or the request itself, whatever the
 * conditional headers. Anything else a backend answers with 400 to a
 * conditional write is taken as it refusing the header.
 */
const UNRELATED_BAD_REQUESTS = new Set([
  'EntityTooLarge',
  'EntityTooSmall',
  'BadDigest',
  'InvalidDigest',
  'KeyTooLongError',
  'MetadataTooLarge',
  'RequestTimeout',
  'IncompleteBody',
])

/**
 * A backend that does not implement `If-None-Match` / `If-Match` on
 * `PutObject` either ignores the header (nothing to catch, see providers.mdx)
 * or refuses the request: 501, or a 400 about the header. Only meaningful for a
 * write that sent one.
 */
function isConditionalWriteRefusal(error: unknown): boolean {
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
  const status = candidate?.$metadata?.httpStatusCode

  if (status === 501) return true
  if (status !== 400) return false

  return !UNRELATED_BAD_REQUESTS.has(candidate?.name ?? '') && !UNRELATED_BAD_REQUESTS.has(candidate?.Code ?? '')
}

function isPreconditionFailure(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  const status = candidate?.$metadata?.httpStatusCode

  return (
    status === 412 ||
    status === 409 ||
    candidate?.name === 'PreconditionFailed' ||
    candidate?.name === 'ConditionalRequestConflict'
  )
}

/**
 * S3 wants the quoted entity-tag form, while every ETag this package hands back
 * has its quotes stripped. Accept either so `ifMatch: result.etag` just works.
 */
function quoteEtag(etag: string): string {
  return /^(?:W\/)?".*"$/.test(etag) ? etag : `"${etag}"`
}

function isNotFound(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  return (
    candidate?.name === 'NoSuchKey' || candidate?.name === 'NotFound' || candidate?.$metadata?.httpStatusCode === 404
  )
}

function decodeMetadataValue(value: string | undefined): string | undefined {
  if (value == null) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function tooLarge(size: number, maxSize: number): S3ndError {
  return new S3ndError(
    'FILE_TOO_LARGE',
    `Upload is ${size} bytes, which exceeds the configured maxSize of ${maxSize} bytes.`,
  )
}

/** Reads a whole (small) stream, stopping as soon as it passes `maxSize`. */
async function collect(
  body: AsyncIterable<unknown> | ReadableStream,
  maxSize: number | undefined,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let length = 0

  for await (const chunk of chunksOf(body)) {
    length += chunk.byteLength
    if (maxSize != null && length > maxSize) throw new SizeExceeded(maxSize)
    chunks.push(chunk)
  }

  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes
}

async function* prepend<T>(head: T, rest: AsyncIterable<T>): AsyncGenerator<T> {
  yield head
  yield* rest
}

/**
 * `createSyncCodes` throws a plain `TypeError` for a shape it cannot use, since
 * `@s3nd/protocol` has no configuration errors of its own. Here it is this
 * package's configuration, so it reads as one.
 */
function codesFor(options: ResolvedConfig['syncCode']): SyncCodes {
  try {
    return createSyncCodes(options)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new S3ndError('INVALID_CONFIG', `\`syncCode\`: ${error.message}`, { cause: error })
    }
    throw error
  }
}

/** The fields `GetObject` and `HeadObject` responses share. */
interface ObjectHeaders {
  ContentType?: string
  ContentLength?: number
  ETag?: string
  LastModified?: Date
  Metadata?: Record<string, string>
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false

  const time = Date.parse(expiresAt)
  return !Number.isNaN(time) && time <= Date.now()
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }

  return batches
}

function contentDispositionFor(download: boolean | string | undefined): string | undefined {
  if (!download) return undefined
  if (download === true) return 'attachment'

  return `attachment; filename="${sanitizeFilename(download)}"`
}

/**
 * Server-side bucket handle. Credentials never leave the server: every method
 * talks to S3 directly, so no CORS configuration and no browser-side signing.
 *
 * Every method speaks the same key — the one `upload()` returns. The configured
 * `prefix` is an internal namespace, applied on the way in and out.
 */
export class Bucket {
  readonly bucket: string

  /**
   * Creates and reads back the codes a person carries between devices, in the
   * shape `syncCode` configured — so generation and normalization can never
   * disagree about the alphabet.
   */
  readonly codes: SyncCodes

  private readonly config: ResolvedConfig
  private s3: S3Client | undefined

  constructor(config: BucketConfig = {}) {
    this.config = resolveConfig(config)
    this.bucket = this.config.bucket
    this.codes = codesFor(this.config.syncCode)
  }

  /** The bucket-level `prefix`, normalized, or undefined when there is none. */
  get prefix(): string | undefined {
    return this.config.prefix
  }

  /** The configured `maxSize`, in bytes, or undefined when there is none. */
  get maxSize(): number | undefined {
    return this.config.maxSize
  }

  /** Underlying `S3Client`, created on first use. */
  get client(): S3Client {
    this.s3 ??= createS3Client(this.config)
    return this.s3
  }

  /**
   * Uploads a body to the bucket. Writing to a key that already exists replaces
   * it — S3 has no distinct "update" call.
   *
   * A body up to `multipartThreshold` goes in one `PutObject`. Anything larger,
   * and any stream without a `contentLength`, goes through a multipart upload
   * cut in `partSize` pieces, so a stream of any size reaches S3 without being
   * buffered whole and without its length being known upfront.
   *
   * Multipart does not raise your runtime's request limit, though: a body that
   * reaches your server through a request is still bound by it (6 MB on
   * synchronous Lambda, 4.5 MB on Vercel serverless functions).
   */
  async upload(body: UploadBody, options: UploadOptions = {}): Promise<UploadResult> {
    const normalized = await normalizeBody(body, options.contentLength)
    const declaredSize = normalized.contentLength
    const filename = options.filename ?? normalized.filename
    const maxSize = this.config.maxSize

    if (maxSize != null && declaredSize != null && declaredSize > maxSize) {
      throw tooLarge(declaredSize, maxSize)
    }

    const key = options.key ?? generateKey(filename)
    const path = this.resolvePath(key, options.prefix)

    const contentType =
      options.contentType ??
      normalized.contentType ??
      lookupContentType(key) ??
      (filename ? lookupContentType(filename) : undefined) ??
      DEFAULT_CONTENT_TYPE

    // Keeping the original filename lets get() hand it back, which is what you
    // need to build a Content-Disposition when serving the file later.
    const metadata = { ...options.metadata }
    if (filename && metadata[FILENAME_METADATA_KEY] == null) {
      metadata[FILENAME_METADATA_KEY] = encodeURIComponent(filename)
    }

    const object = {
      ContentType: contentType,
      CacheControl: options.cacheControl,
      ContentDisposition: options.contentDisposition,
      Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      ACL: options.acl,
    }
    const ifMatch = options.ifMatch ? quoteEtag(options.ifMatch) : undefined
    const ifNoneMatch = options.ifAbsent ? '*' : undefined

    const putObject = async (payload: NormalizedBody['body'], size: number | undefined) => {
      const response = await this.client.send(
        new PutObjectCommand({
          ...object,
          Bucket: this.bucket,
          Key: path,
          Body: payload,
          ContentLength: size,
          IfMatch: ifMatch,
          IfNoneMatch: ifNoneMatch,
        }),
        { abortSignal: options.signal },
      )

      return { etag: response.ETag?.replace(/"/g, ''), size }
    }

    const multipart = (parts: AsyncIterable<Uint8Array>) =>
      uploadMultipart({
        client: this.client,
        bucket: this.bucket,
        key: path,
        create: object,
        parts,
        maxSize,
        ifMatch,
        ifNoneMatch,
        signal: options.signal,
      })

    try {
      let stored: { etag?: string; size?: number }

      if (declaredSize != null && declaredSize <= this.config.multipartThreshold) {
        // A stream this small is read into memory first. The SDK's Node
        // handler only pipes a Node `Readable` and would mangle a web
        // stream, and counting the bytes is what holds maxSize to them.
        const payload =
          normalized.body instanceof Uint8Array ? normalized.body : await collect(normalized.body, maxSize)
        stored = await putObject(payload, payload.byteLength)
      } else if (normalized.body instanceof Uint8Array) {
        stored = await multipart(slicesOf(normalized.body, this.config.partSize))
      } else {
        const parts = partsOf(chunksOf(normalized.body), this.config.partSize)

        if (declaredSize != null) {
          stored = await multipart(parts)
        } else {
          // A stream of unknown length that ends inside its first part is a
          // small body after all: one PutObject, no multipart round trips.
          const first = await parts.next()
          const head = first.done ? new Uint8Array(0) : first.value

          if (head.byteLength < this.config.partSize) {
            await parts.return(undefined)
            if (maxSize != null && head.byteLength > maxSize) throw new SizeExceeded(maxSize)
            stored = await putObject(head, head.byteLength)
          } else {
            stored = await multipart(prepend(head, parts))
          }
        }
      }

      return {
        bucket: this.bucket,
        key,
        path,
        contentType,
        size: stored.size,
        etag: stored.etag,
        url: this.publicUrlFor(path),
      }
    } catch (error) {
      if (error instanceof S3ndError) throw error

      if (error instanceof SizeExceeded) {
        throw new S3ndError(
          'FILE_TOO_LARGE',
          `Upload exceeds the configured maxSize of ${error.limit} bytes; it was stopped and nothing was stored.`,
        )
      }

      if ((options.ifMatch != null || options.ifAbsent) && isPreconditionFailure(error)) {
        throw new S3ndError(
          'PRECONDITION_FAILED',
          options.ifAbsent
            ? `"${path}" already exists in bucket "${this.bucket}".`
            : `"${path}" changed in bucket "${this.bucket}" since the ETag you passed as ifMatch. Read it again before writing.`,
          { cause: error },
        )
      }

      if ((options.ifMatch != null || options.ifAbsent) && isConditionalWriteRefusal(error)) {
        throw new S3ndError(
          'CONDITIONAL_WRITE_UNSUPPORTED',
          `Bucket "${this.bucket}" refused a conditional write to "${path}" (${options.ifAbsent ? 'ifAbsent, If-None-Match: *' : 'ifMatch, If-Match'}): the backend does not seem to support conditional writes on PutObject, which ${options.ifAbsent ? 'ifAbsent' : 'ifMatch'} relies on. S3 supports them since August 2024 and R2 does; MinIO and Ceph RGW depend on the build. ${describe(error)}`,
          { cause: error },
        )
      }

      throw new S3ndError(
        'UPLOAD_FAILED',
        `Failed to upload "${path}" to bucket "${this.bucket}": ${describe(error)}`,
        { cause: error },
      )
    }
  }

  /**
   * Stores the file for an identifier, creating it or replacing what is already
   * there. One object per id: `put(id, …)` then `get(id)` round-trips.
   */
  async put(id: string, body: UploadBody, options: PutOptions = {}): Promise<UploadResult> {
    return this.upload(body, { ...options, key: id })
  }

  /**
   * Stores a snapshot of an application's local state — the shape a local-first
   * app needs to move an IndexedDB database from one device to another.
   *
   * The value is wrapped in a self-describing envelope (app, schema version,
   * device, timestamps), serialized as JSON and gzipped, so what lands in the
   * bucket says what it is and what wrote it.
   */
  async putSnapshot(key: string, data: unknown, options: PutSnapshotOptions = {}): Promise<SnapshotResult> {
    const createdAt = new Date()
    const expiresAt = options.expiresIn != null ? new Date(createdAt.getTime() + options.expiresIn * 1000) : undefined

    if (options.expiresIn != null && (!Number.isFinite(options.expiresIn) || options.expiresIn <= 0)) {
      throw new S3ndError('INVALID_SNAPSHOT', '`expiresIn` must be a positive number of seconds.')
    }

    const compress = options.compress ?? true

    const envelope: SnapshotEnvelope = {
      s3nd: ENVELOPE_VERSION,
      app: options.app,
      version: options.version,
      device: options.device,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      data,
    }

    const result = await this.upload(await encodeSnapshot(envelope, compress), {
      key,
      prefix: options.prefix,
      contentType: compress ? COMPRESSED_SNAPSHOT_CONTENT_TYPE : SNAPSHOT_CONTENT_TYPE,
      cacheControl: 'private, no-store',
      metadata:
        options.metadata || expiresAt
          ? { ...options.metadata, ...(expiresAt ? { [EXPIRES_AT_METADATA_KEY]: expiresAt.toISOString() } : {}) }
          : undefined,
      ifMatch: options.ifMatch,
      ifAbsent: options.ifAbsent,
      signal: options.signal,
    })

    return {
      bucket: result.bucket,
      key: result.key,
      path: result.path,
      etag: result.etag,
      size: result.size,
      compressed: compress,
      createdAt,
      expiresAt,
    }
  }

  /**
   * Reads a snapshot back, or `null` when there is none — including one that
   * has passed its `expiresAt`, which is never handed over even if the object
   * is still sitting in the bucket.
   *
   * Pass `parse` to validate `data`: its return type becomes the type of
   * `data`, and a `parse` that throws surfaces as `INVALID_SNAPSHOT`. Without
   * it, `getSnapshot<T>()` is an unchecked assertion: `data` is whatever JSON
   * is stored, typed as `T` because you said so. A snapshot crosses machines,
   * app versions and, whenever a code leaks, someone else's hands.
   */
  async getSnapshot<T = unknown>(key: string, options: GetSnapshotOptions<T> = {}): Promise<Snapshot<T> | null> {
    const file = await this.get(key, { prefix: options.prefix, signal: options.signal })
    if (!file) return null

    const envelope = await decodeSnapshot(await file.bytes())
    const expiresAt = envelope.expiresAt ? new Date(envelope.expiresAt) : undefined

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return null
    }

    if (options.maxVersion != null && envelope.version != null && envelope.version > options.maxVersion) {
      throw new S3ndError(
        'SNAPSHOT_TOO_NEW',
        `Snapshot is at schema version ${envelope.version}, but this device only understands ${options.maxVersion}. Update the application before restoring.`,
      )
    }

    let data: T
    if (options.parse) {
      try {
        data = options.parse(envelope.data)
      } catch (error) {
        throw new S3ndError(
          'INVALID_SNAPSHOT',
          `Snapshot data under "${file.path}" was refused by \`parse\`: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    } else {
      data = envelope.data as T
    }

    return {
      bucket: file.bucket,
      key: file.key,
      path: file.path,
      data,
      app: envelope.app,
      version: envelope.version,
      device: envelope.device,
      createdAt: new Date(envelope.createdAt),
      expiresAt,
      etag: file.etag,
      size: file.size,
    }
  }

  /**
   * Whether a live snapshot is stored under a key, answered from a `HeadObject`:
   * no body crosses the wire. An expired snapshot counts as absent, the same
   * way `getSnapshot()` treats it.
   *
   * Expiry is read from metadata that snapshots written since v0.2 carry; an
   * older snapshot has none, so it counts as present until `getSnapshot()`
   * opens it.
   */
  async hasSnapshot(key: string, options: HasSnapshotOptions = {}): Promise<boolean> {
    const info = await this.head(key, options)
    if (!info) return false

    return !isExpired(info.metadata[EXPIRES_AT_METADATA_KEY])
  }

  /**
   * Deletes a snapshot, typically once a restore has succeeded, which is the
   * normal end of a transfer. Deleting one that is already gone is a no-op.
   */
  async deleteSnapshot(key: string, options: DeleteSnapshotOptions = {}): Promise<void> {
    await this.delete(key, options)
  }

  /**
   * Reads an object back: its bytes and everything S3 knows about it.
   * Returns `null` when the key does not exist, so a missing file is a value to
   * branch on rather than an exception to catch.
   *
   * The body is a stream that can only be consumed once — use `body`, `bytes()`
   * or `text()`, exactly one of them.
   */
  async get(key: string, options: GetOptions = {}): Promise<StoredFile | null> {
    const path = this.resolvePath(key, options.prefix)

    let response
    try {
      response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: path }), {
        abortSignal: options.signal,
      })
    } catch (error) {
      if (isNotFound(error)) return null

      throw new S3ndError('GET_FAILED', `Failed to read "${path}" from bucket "${this.bucket}": ${describe(error)}`, {
        cause: error,
      })
    }

    const body = response.Body as SdkStream | undefined

    if (!body) {
      throw new S3ndError('GET_FAILED', `S3 returned no body for "${path}" in bucket "${this.bucket}".`)
    }

    return {
      ...this.infoFor(key, path, response),
      body,
      bytes: () => body.transformToByteArray(),
      text: () => body.transformToString(),
    }
  }

  /**
   * Signs a `PUT` a client can send the bytes with, straight to the bucket, so
   * they never transit your server or its request limit.
   *
   * The signature covers the exact `contentLength` and the content type: S3
   * refuses any other body. `maxSize` is checked here, before signing. The
   * filename and `metadata` are signed into the URL, so the uploader cannot
   * change them. A browser needs a CORS rule on the bucket that allows `PUT`
   * with the `content-type` header.
   */
  async presignUpload(key: string, options: PresignUploadOptions): Promise<PresignedPut> {
    const path = this.resolvePath(key, options.prefix)
    const size = options.contentLength

    if (!Number.isInteger(size) || size < 0) {
      throw new S3ndError('INVALID_BODY', '`contentLength` must be a whole, non-negative number of bytes.')
    }

    if (this.config.maxSize != null && size > this.config.maxSize) throw tooLarge(size, this.config.maxSize)

    const expiresIn = options.expiresIn ?? DEFAULT_EXPIRES_IN
    if (!Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > MAX_EXPIRES_IN) {
      throw new S3ndError('URL_FAILED', `\`expiresIn\` must be between 1 and ${MAX_EXPIRES_IN} seconds.`)
    }

    const contentType =
      options.contentType ??
      lookupContentType(key) ??
      (options.filename ? lookupContentType(options.filename) : undefined) ??
      DEFAULT_CONTENT_TYPE

    const metadata = { ...options.metadata }
    if (options.filename && metadata[FILENAME_METADATA_KEY] == null) {
      metadata[FILENAME_METADATA_KEY] = encodeURIComponent(options.filename)
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: options.cacheControl,
      Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })

    // The SDK checksums every PutObject by default, and a presigned one gets
    // the checksum of an empty body signed into its URL, which S3 then holds
    // the real body to. The client computes no checksum for a presigned PUT,
    // so the headers go before the URL is signed.
    command.middlewareStack.add(
      (next) => async (args) => {
        const headers = (args.request as { headers?: Record<string, string> }).headers ?? {}
        for (const name of Object.keys(headers)) {
          if (/^x-amz-(sdk-)?checksum-/i.test(name)) delete headers[name]
        }
        return next(args)
      },
      { step: 'build', priority: 'low', name: 's3ndPresignWithoutChecksum' },
    )

    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    try {
      const url = await getSignedUrl(this.client, command, {
        expiresIn,
        // Signed, so a body of another length or type is refused by S3 itself.
        signableHeaders: new Set(['content-type', 'content-length']),
      })

      return {
        bucket: this.bucket,
        key,
        path,
        url,
        method: 'PUT',
        headers: { 'content-type': contentType },
        expiresAt,
      }
    } catch (error) {
      throw new S3ndError('URL_FAILED', `Failed to sign an upload for "${path}": ${describe(error)}`, {
        cause: error,
      })
    }
  }

  /**
   * Everything `get()` reports except the body, from a `HeadObject`: size,
   * content type, ETag, last-modified and user metadata, without downloading a
   * byte. Returns `null` when the key does not exist.
   *
   * Without `s3:ListBucket` on the bucket, S3 answers a missing key with 403
   * rather than 404, which surfaces as `GET_FAILED` instead of `null`.
   */
  async head(key: string, options: HeadOptions = {}): Promise<StoredFileInfo | null> {
    const path = this.resolvePath(key, options.prefix)

    try {
      const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: path }), {
        abortSignal: options.signal,
      })

      return this.infoFor(key, path, response)
    } catch (error) {
      if (isNotFound(error)) return null

      throw new S3ndError('GET_FAILED', `Failed to read "${path}" from bucket "${this.bucket}": ${describe(error)}`, {
        cause: error,
      })
    }
  }

  /** Whether anything is stored under a key. A `HeadObject`, so no body is read. */
  async exists(key: string, options: HeadOptions = {}): Promise<boolean> {
    return (await this.head(key, options)) !== null
  }

  /**
   * Walks the objects in a namespace, page by page, as they come back from
   * `ListObjectsV2`. The keys are relative to the namespace, so each one can be
   * handed straight back to `get()` or `delete()` with the same `prefix`.
   *
   * Needs `s3:ListBucket` on the bucket, which reading and writing do not.
   */
  async *list(options: ListOptions = {}): AsyncGenerator<ListedObject, void, undefined> {
    const limit = options.limit ?? Number.POSITIVE_INFINITY

    if (!(limit === Number.POSITIVE_INFINITY || (Number.isInteger(limit) && limit > 0))) {
      throw new S3ndError('LIST_FAILED', '`limit` must be a positive integer.')
    }

    const namespace = normalizePrefix(options.prefix) ?? this.config.prefix
    const startsWith = options.startsWith ?? ''
    const searchPrefix = namespace ? `${namespace}/${startsWith}` : startsWith

    let remaining = limit
    let continuationToken: string | undefined

    do {
      let response
      try {
        response = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: searchPrefix || undefined,
            ContinuationToken: continuationToken,
            MaxKeys: Math.min(LIST_PAGE_SIZE, remaining),
          }),
          { abortSignal: options.signal },
        )
      } catch (error) {
        throw new S3ndError(
          'LIST_FAILED',
          `Failed to list "${searchPrefix}" in bucket "${this.bucket}": ${describe(error)}`,
          { cause: error },
        )
      }

      for (const object of response.Contents ?? []) {
        if (!object.Key) continue

        const key = namespace ? object.Key.slice(namespace.length + 1) : object.Key
        // Zero-byte "folder" placeholders some consoles create are not files.
        if (key.length === 0 || key.endsWith('/')) continue

        yield {
          bucket: this.bucket,
          key,
          path: object.Key,
          size: object.Size,
          etag: object.ETag?.replace(/"/g, ''),
          lastModified: object.LastModified,
        }

        remaining -= 1
        if (remaining <= 0) return
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)
  }

  /**
   * Copies an object inside the bucket with `CopyObject`. The copy happens on
   * S3's side, so no byte transits through your runtime and its request limit
   * does not apply. Content type and metadata travel with it.
   *
   * Returns `null` when the source does not exist. The destination is replaced
   * if something is already stored there.
   */
  async copy(from: string, to: string, options: CopyOptions = {}): Promise<CopyResult | null> {
    const source = this.resolvePath(from, options.prefix)
    const destination = this.resolvePath(to, options.toPrefix ?? options.prefix)

    if (source === destination) {
      throw new S3ndError('COPY_FAILED', `Cannot copy "${source}" onto itself.`)
    }

    try {
      const response = await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: destination,
          CopySource: `${this.bucket}/${encodeKey(source)}`,
        }),
        { abortSignal: options.signal },
      )

      return {
        bucket: this.bucket,
        key: to,
        path: destination,
        etag: response.CopyObjectResult?.ETag?.replace(/"/g, ''),
        lastModified: response.CopyObjectResult?.LastModified,
      }
    } catch (error) {
      if (isNotFound(error)) return null

      throw new S3ndError(
        'COPY_FAILED',
        `Failed to copy "${source}" to "${destination}" in bucket "${this.bucket}": ${describe(error)}`,
        { cause: error },
      )
    }
  }

  /**
   * `copy()`, then deletes the source. S3 has no rename, so this is two
   * requests and not atomic: if the delete fails, both copies exist and the
   * error says so.
   */
  async move(from: string, to: string, options: CopyOptions = {}): Promise<CopyResult | null> {
    const result = await this.copy(from, to, options)
    if (!result) return null

    await this.delete(from, { prefix: options.prefix, signal: options.signal })
    return result
  }

  /**
   * Returns a URL for an object: the public one when `publicUrl` is configured,
   * a presigned GET otherwise. Use `signed` to force either behaviour.
   */
  async getUrl(key: string, options: GetUrlOptions = {}): Promise<string> {
    const path = this.resolvePath(key, options.prefix)
    const wantsSigned = options.signed ?? this.config.publicUrl == null

    if (!wantsSigned) {
      const url = this.publicUrlFor(path)
      if (!url) {
        throw new S3ndError(
          'URL_FAILED',
          'A public URL was requested but no `publicUrl` is configured. Set it on createBucket(), or drop `signed: false`.',
        )
      }

      return url
    }

    const expiresIn = options.expiresIn ?? DEFAULT_EXPIRES_IN

    if (!Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > MAX_EXPIRES_IN) {
      throw new S3ndError('URL_FAILED', `\`expiresIn\` must be between 1 and ${MAX_EXPIRES_IN} seconds.`)
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ResponseContentDisposition: contentDispositionFor(options.download),
    })

    try {
      return await getSignedUrl(this.client, command, { expiresIn })
    } catch (error) {
      throw new S3ndError('URL_FAILED', `Failed to sign a URL for "${path}": ${describe(error)}`, {
        cause: error,
      })
    }
  }

  /**
   * Deletes one or many objects. Deleting a key that does not exist is not an
   * error — S3 treats it as a no-op, and so does this method.
   */
  async delete(key: string | string[], options: DeleteOptions = {}): Promise<void> {
    const keys = Array.isArray(key) ? key : [key]
    if (keys.length === 0) return

    const paths = keys.map((candidate) => this.resolvePath(candidate, options.prefix))

    if (paths.length === 1) {
      const only = paths[0]!

      try {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: only }), {
          abortSignal: options.signal,
        })
        return
      } catch (error) {
        throw new S3ndError(
          'DELETE_FAILED',
          `Failed to delete "${only}" from bucket "${this.bucket}": ${describe(error)}`,
          { cause: error },
        )
      }
    }

    for (const batch of chunk(paths, DELETE_BATCH_SIZE)) {
      let failures: string[] = []

      try {
        const response = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
          { abortSignal: options.signal },
        )

        failures = (response.Errors ?? []).map((entry) => `${entry.Key ?? '?'} (${entry.Code ?? 'unknown'})`)
      } catch (error) {
        throw new S3ndError(
          'DELETE_FAILED',
          `Failed to delete ${batch.length} objects from bucket "${this.bucket}": ${describe(error)}`,
          { cause: error },
        )
      }

      if (failures.length > 0) {
        throw new S3ndError(
          'DELETE_FAILED',
          `Failed to delete ${failures.length} object(s) from bucket "${this.bucket}": ${failures.join(', ')}.`,
        )
      }
    }
  }

  /**
   * Releases the HTTP sockets of the client s3nd created. A client you
   * passed in yourself is left alone — it is yours to close.
   */
  destroy(): void {
    if (this.config.client) return

    this.s3?.destroy()
    this.s3 = undefined
  }

  private infoFor(key: string, path: string, response: ObjectHeaders): StoredFileInfo {
    const metadata = response.Metadata ?? {}

    return {
      bucket: this.bucket,
      key,
      path,
      contentType: response.ContentType ?? DEFAULT_CONTENT_TYPE,
      filename: decodeMetadataValue(metadata[FILENAME_METADATA_KEY]),
      size: response.ContentLength,
      etag: response.ETag?.replace(/"/g, ''),
      lastModified: response.LastModified,
      metadata,
    }
  }

  /** Validates a caller-supplied key and turns it into a full object key. */
  private resolvePath(key: string, prefix?: string): string {
    assertValidKey(key)

    const path = joinKey(normalizePrefix(prefix) ?? this.config.prefix, key)
    assertValidKey(path)

    return path
  }

  private publicUrlFor(path: string): string | undefined {
    return this.config.publicUrl ? `${this.config.publicUrl}/${encodeKey(path)}` : undefined
  }
}

/** Creates a bucket handle. Cheap: the S3 client is built on first request. */
export function createBucket(config: BucketConfig = {}): Bucket {
  return new Bucket(config)
}
