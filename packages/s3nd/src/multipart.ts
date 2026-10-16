import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  type CompletedPart,
  type CreateMultipartUploadCommandInput,
  type S3Client,
} from '@aws-sdk/client-s3'

/** S3 refuses parts under 5 MiB, the last one excepted. */
export const MIN_PART_SIZE = 5 * 1024 * 1024
/** S3 caps a multipart upload at 10,000 parts. */
export const MAX_PARTS = 10_000
export const DEFAULT_PART_SIZE = 8 * 1024 * 1024
export const DEFAULT_MULTIPART_THRESHOLD = 16 * 1024 * 1024
/** Parts in flight at once: enough to fill the pipe, few enough to bound memory. */
const QUEUE_SIZE = 4

/**
 * Reads any accepted body as a sequence of byte chunks, without importing
 * `node:stream`: a Node `Readable` is async-iterable, a web stream has a reader.
 */
export async function* chunksOf(
  body: Uint8Array | AsyncIterable<unknown> | ReadableStream,
): AsyncGenerator<Uint8Array> {
  if (body instanceof Uint8Array) {
    yield body
    return
  }

  if (typeof (body as ReadableStream).getReader === 'function') {
    const reader = (body as ReadableStream<unknown>).getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        yield toBytes(value)
      }
    } finally {
      reader.releaseLock()
    }
  }

  for await (const value of body as AsyncIterable<unknown>) {
    yield toBytes(value)
  }
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (typeof value === 'string') return new TextEncoder().encode(value)
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)

  throw new TypeError(`A stream yielded ${typeof value}, where bytes were expected.`)
}

/**
 * Regroups chunks of any size into parts of exactly `partSize` bytes, the last
 * one excepted. Only one part is ever held in memory per call to `next()`.
 */
export async function* partsOf(chunks: AsyncIterable<Uint8Array>, partSize: number): AsyncGenerator<Uint8Array> {
  let buffer = new Uint8Array(partSize)
  let filled = 0

  for await (const chunk of chunks) {
    let offset = 0

    while (offset < chunk.byteLength) {
      const take = Math.min(partSize - filled, chunk.byteLength - offset)
      buffer.set(chunk.subarray(offset, offset + take), filled)
      filled += take
      offset += take

      if (filled === partSize) {
        yield buffer
        buffer = new Uint8Array(partSize)
        filled = 0
      }
    }
  }

  if (filled > 0) yield buffer.subarray(0, filled)
}

/** Cuts bytes already in memory into parts without copying them. */
export async function* slicesOf(bytes: Uint8Array, partSize: number): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.byteLength; offset += partSize) {
    yield bytes.subarray(offset, offset + partSize)
  }
}

/** Raised from inside the part loop when the bytes outgrow `maxSize`. */
export class SizeExceeded extends Error {
  constructor(readonly limit: number) {
    super(`The body exceeds the configured maxSize of ${limit} bytes.`)
  }
}

export interface MultipartInput {
  client: S3Client
  /** Everything `CreateMultipartUpload` takes besides `Bucket` and `Key`. */
  create: Omit<CreateMultipartUploadCommandInput, 'Bucket' | 'Key'>
  bucket: string
  key: string
  /** Parts already cut to size, the first one included. */
  parts: AsyncIterable<Uint8Array>
  maxSize?: number
  ifMatch?: string
  ifNoneMatch?: string
  signal?: AbortSignal
}

/**
 * Drives `CreateMultipartUpload` → `UploadPart`… → `CompleteMultipartUpload`.
 * Any failure, an abort or an oversized body included, sends
 * `AbortMultipartUpload` so the parts stop being billed, then rethrows.
 */
export async function uploadMultipart(input: MultipartInput): Promise<{ etag?: string; size: number }> {
  const { client, bucket, key, signal } = input

  const created = await client.send(new CreateMultipartUploadCommand({ ...input.create, Bucket: bucket, Key: key }), {
    abortSignal: signal,
  })
  const uploadId = created.UploadId
  if (!uploadId) throw new Error('S3 started a multipart upload without an UploadId.')

  const completed: CompletedPart[] = []
  const inFlight = new Set<Promise<void>>()
  let failure: { error: unknown } | undefined
  let size = 0
  let partNumber = 0

  try {
    for await (const part of input.parts) {
      if (failure) break
      signal?.throwIfAborted()

      size += part.byteLength
      if (input.maxSize != null && size > input.maxSize) throw new SizeExceeded(input.maxSize)

      partNumber += 1
      if (partNumber > MAX_PARTS) {
        throw new Error(`The body needs more than ${MAX_PARTS} parts; raise \`partSize\`.`)
      }

      const number = partNumber
      const sending: Promise<void> = client
        .send(
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: number,
            Body: part,
            ContentLength: part.byteLength,
          }),
          { abortSignal: signal },
        )
        .then((response) => {
          // The SDK checksums each part by default; S3 wants those checksums
          // repeated on completion, so they ride along with the ETag.
          completed[number - 1] = {
            PartNumber: number,
            ETag: response.ETag,
            ChecksumCRC32: response.ChecksumCRC32,
            ChecksumCRC32C: response.ChecksumCRC32C,
            ChecksumCRC64NVME: response.ChecksumCRC64NVME,
            ChecksumSHA1: response.ChecksumSHA1,
            ChecksumSHA256: response.ChecksumSHA256,
          }
        })
        .catch((error: unknown) => {
          failure ??= { error }
        })
        .finally(() => inFlight.delete(sending))

      inFlight.add(sending)
      if (inFlight.size >= QUEUE_SIZE) await Promise.race(inFlight)
    }

    await Promise.all(inFlight)
    if (failure) throw failure.error
    signal?.throwIfAborted()

    const response = await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completed.map(withoutEmptyChecksums) },
        // Conditional writes are checked when the object comes into existence,
        // which for a multipart upload is the moment it completes.
        IfMatch: input.ifMatch,
        IfNoneMatch: input.ifNoneMatch,
      }),
      { abortSignal: signal },
    )

    return { etag: response.ETag?.replace(/"/g, ''), size }
  } catch (error) {
    await Promise.allSettled(inFlight)
    // Without the caller's signal: it may be the very reason we are here.
    await client
      .send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }))
      .catch(() => undefined)

    throw error
  }
}

function withoutEmptyChecksums(part: CompletedPart): CompletedPart {
  return Object.fromEntries(Object.entries(part).filter(([, value]) => value != null)) as CompletedPart
}
