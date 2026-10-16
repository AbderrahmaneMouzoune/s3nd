import { Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBucket } from '../src/bucket.js'
import { partsOf } from '../src/multipart.js'
import type { S3ndError } from '../src/errors.js'
import { clearBucketEnv, createMemoryClient } from './helpers.js'

beforeEach(clearBucketEnv)
afterEach(() => vi.unstubAllEnvs())

const MiB = 1024 * 1024

/** Deterministic bytes, so a reassembly in the wrong order shows. */
function bytes(length: number): Buffer {
  const buffer = Buffer.alloc(length)
  for (let index = 0; index < length; index += 1) buffer[index] = (index * 7 + (index >> 12)) % 251
  return buffer
}

/** Hands the bytes out in uneven chunks, the way a socket would. */
function streamOf(buffer: Buffer, chunk = 300_001): Readable {
  const pieces: Buffer[] = []
  for (let offset = 0; offset < buffer.length; offset += chunk) pieces.push(buffer.subarray(offset, offset + chunk))
  return Readable.from(pieces)
}

function commandNames(send: ReturnType<typeof createMemoryClient>['send']): string[] {
  return send.mock.calls.map(([command]) => (command as { constructor: { name: string } }).constructor.name)
}

describe('partsOf', () => {
  it('regroups uneven chunks into exact parts, the last one short', async () => {
    async function* chunks() {
      yield new Uint8Array([1, 2, 3])
      yield new Uint8Array([4])
      yield new Uint8Array([5, 6, 7, 8, 9])
    }

    const parts: number[][] = []
    for await (const part of partsOf(chunks(), 4)) parts.push([...part])

    expect(parts).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9]])
  })
})

describe('multipart upload', () => {
  it('cuts a buffer above the threshold into parts and reassembles it', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: 10 * MiB })
    const body = bytes(17 * MiB + 123)

    const result = await bucket.upload(body, { key: 'big.bin', contentType: 'application/x-test' })

    expect(commandNames(memory.send)).toEqual([
      'CreateMultipartUploadCommand',
      'UploadPartCommand',
      'UploadPartCommand',
      'UploadPartCommand',
      'CompleteMultipartUploadCommand',
    ])
    expect(Buffer.compare(memory.objects.get('big.bin')!.body, body)).toBe(0)
    expect(memory.objects.get('big.bin')!.contentType).toBe('application/x-test')
    expect(result).toMatchObject({ key: 'big.bin', size: body.length, etag: expect.stringMatching(/^etag-/) })
    expect(memory.uploads.size).toBe(0)
  })

  it('keeps a body at the threshold in a single PutObject', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: 6 * MiB })

    await bucket.upload(bytes(6 * MiB), { key: 'edge.bin' })

    expect(commandNames(memory.send)).toEqual(['PutObjectCommand'])
  })

  it('streams a body of unknown length without buffering it whole', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, partSize: 5 * MiB })
    const body = bytes(12 * MiB)

    const result = await bucket.upload(streamOf(body), { key: 'stream.bin', filename: 'stream.bin' })

    expect(commandNames(memory.send).filter((name) => name === 'UploadPartCommand')).toHaveLength(3)
    for (const [command] of memory.send.mock.calls) {
      const input = (command as { input: { Body?: Uint8Array } }).input
      if (input.Body) expect(input.Body.byteLength).toBeLessThanOrEqual(5 * MiB)
    }
    expect(Buffer.compare(memory.objects.get('stream.bin')!.body, body)).toBe(0)
    expect(memory.objects.get('stream.bin')!.metadata).toEqual({ filename: 'stream.bin' })
    expect(result.size).toBe(body.length)
  })

  it('takes a web stream as well as a Node one', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, partSize: 5 * MiB })
    const body = bytes(6 * MiB)

    await bucket.upload(new Blob([new Uint8Array(body)]).stream(), { key: 'web.bin' })

    expect(commandNames(memory.send)[0]).toBe('CreateMultipartUploadCommand')
    expect(Buffer.compare(memory.objects.get('web.bin')!.body, body)).toBe(0)
  })

  it('sends a stream of known length above the threshold through multipart', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: MiB })
    const body = bytes(9 * MiB)

    await bucket.upload(streamOf(body), { key: 'known.bin', contentLength: body.length })

    expect(commandNames(memory.send)[0]).toBe('CreateMultipartUploadCommand')
    expect(Buffer.compare(memory.objects.get('known.bin')!.body, body)).toBe(0)
  })

  it('stops a stream that outgrows maxSize, and aborts the upload', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, partSize: 5 * MiB, maxSize: 8 * MiB })

    const error = (await bucket.upload(streamOf(bytes(12 * MiB)), { key: 'big.bin' }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('FILE_TOO_LARGE')
    expect(commandNames(memory.send)).toContain('AbortMultipartUploadCommand')
    expect(commandNames(memory.send)).not.toContain('CompleteMultipartUploadCommand')
    expect(memory.objects.has('big.bin')).toBe(false)
    expect(memory.uploads.size).toBe(0)
  })

  it('stops a short stream above maxSize before it is stored', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, maxSize: 10 })

    const error = (await bucket.upload(streamOf(bytes(20)), { key: 'a.bin' }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('FILE_TOO_LARGE')
    expect(memory.send).not.toHaveBeenCalled()
  })

  it('aborts the multipart upload when the signal fires', async () => {
    const memory = createMemoryClient()
    const controller = new AbortController()
    const send = memory.send.getMockImplementation()!
    // Fire the signal once the first part has gone out.
    memory.send.mockImplementation(async (command: any, options?: any) => {
      const response = await send(command, options)
      if (command.constructor.name === 'UploadPartCommand') controller.abort()
      return response
    })
    const bucket = createBucket({ bucket: 'assets', client: memory.client, partSize: 5 * MiB })

    const error = (await bucket
      .upload(streamOf(bytes(16 * MiB)), { key: 'a.bin', signal: controller.signal })
      .catch((e) => e)) as S3ndError

    expect(error.code).toBe('UPLOAD_FAILED')
    expect(commandNames(memory.send)).toContain('AbortMultipartUploadCommand')
    expect(memory.objects.has('a.bin')).toBe(false)
    expect(memory.uploads.size).toBe(0)
  })

  it('aborts the multipart upload when a part fails', async () => {
    const memory = createMemoryClient()
    const send = memory.send.getMockImplementation()!
    memory.send.mockImplementation(async (command: any, options?: any) => {
      if (command.constructor.name === 'UploadPartCommand' && command.input.PartNumber === 2) {
        throw new Error('SlowDown')
      }
      return send(command, options)
    })
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: MiB })

    const error = (await bucket.upload(bytes(17 * MiB), { key: 'a.bin' }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('UPLOAD_FAILED')
    expect(error.message).toContain('SlowDown')
    expect(commandNames(memory.send)).toContain('AbortMultipartUploadCommand')
    expect(memory.uploads.size).toBe(0)
  })

  it('checks ifAbsent when the upload completes', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: MiB })
    await bucket.upload('already here', { key: 'a.bin' })

    const error = (await bucket.upload(bytes(6 * MiB), { key: 'a.bin', ifAbsent: true }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('PRECONDITION_FAILED')
    const complete = memory.send.mock.calls.find(
      ([command]) => (command as any).constructor.name === 'CompleteMultipartUploadCommand',
    )
    expect((complete![0] as any).input.IfNoneMatch).toBe('*')
    expect(memory.uploads.size).toBe(0)
    expect(Buffer.from(memory.objects.get('a.bin')!.body).toString()).toBe('already here')
  })

  it('checks ifMatch when the upload completes', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: MiB })
    const first = await bucket.upload('v1', { key: 'a.bin' })

    const second = await bucket.upload(bytes(6 * MiB), { key: 'a.bin', ifMatch: first.etag })
    const stale = (await bucket
      .upload(bytes(6 * MiB), { key: 'a.bin', ifMatch: first.etag })
      .catch((e) => e)) as S3ndError

    expect(second.etag).not.toBe(first.etag)
    expect(stale.code).toBe('PRECONDITION_FAILED')
  })

  it('round-trips a large snapshot', async () => {
    const memory = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client: memory.client, multipartThreshold: MiB })
    const data = { blob: bytes(3 * MiB).toString('base64') + bytes(3 * MiB).toString('hex') }

    await bucket.putSnapshot('code', data, { compress: false })

    expect(commandNames(memory.send)[0]).toBe('CreateMultipartUploadCommand')
    expect((await bucket.getSnapshot('code'))?.data).toEqual(data)
  })

  it('refuses a part size S3 would reject', () => {
    expect(() => createBucket({ bucket: 'assets', partSize: MiB })).toThrowError(
      expect.objectContaining({ code: 'INVALID_CONFIG' }),
    )
    expect(() => createBucket({ bucket: 'assets', multipartThreshold: -1 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_CONFIG' }),
    )
  })
})
