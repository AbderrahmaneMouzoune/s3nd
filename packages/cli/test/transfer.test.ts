import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { S3Client } from '@aws-sdk/client-s3'
import { createBucket, createTransferHandler } from '@s3nd/core'
import { createTransferClient } from '@s3nd/protocol'

import { writeReceived } from '../src/receive.js'
import { openSource } from '../src/transfer.js'

const MiB = 1024 * 1024

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 's3nd-transfer-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

async function drain(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer())
}

function stdinOf(...chunks: string[]): PassThrough {
  const stream = new PassThrough()
  for (const chunk of chunks) stream.write(chunk)
  stream.end()
  return stream
}

describe('openSource', () => {
  it('streams a file, with its size from stat and its own name', async () => {
    const path = join(root, 'report.pdf')
    writeFileSync(path, 'pdf bytes')

    const source = await openSource(path, { spool: false })

    expect(source).toMatchObject({ size: 9, filename: 'report.pdf' })
    expect((await drain(source.body)).toString()).toBe('pdf bytes')
  })

  it('lets --name win over the file name', async () => {
    const path = join(root, 'report.pdf')
    writeFileSync(path, 'x')

    expect((await openSource(path, { name: 'final.pdf', spool: false })).filename).toBe('final.pdf')
  })

  it('says what is wrong with a missing file', async () => {
    await expect(openSource(join(root, 'nope'), { spool: false })).rejects.toThrow(/No such file/)
  })

  it('streams stdin as it comes, size unknown, nothing lost from the first chunk', async () => {
    const source = await openSource('-', { spool: false, stdin: stdinOf('ab', 'cd') })

    expect(source.filename).toBe('stdin')
    expect(source.size).toBeUndefined()
    expect((await drain(source.body)).toString()).toBe('abcd')
  })

  it('spools stdin to learn its size, and removes the spool afterwards', async () => {
    const spools = join(root, 'spools')
    mkdirSync(spools)

    const source = await openSource('-', { spool: true, tmpdir: spools, name: 'dump.sql', stdin: stdinOf('select 1;') })
    expect(source).toMatchObject({ filename: 'dump.sql', size: 9 })
    expect(readdirSync(spools)).toHaveLength(1)
    expect((await drain(source.body)).toString()).toBe('select 1;')
    await source.cleanup()

    expect(readdirSync(spools)).toEqual([])
  })

  it('refuses an empty stdin either way', async () => {
    await expect(openSource('-', { spool: false, stdin: stdinOf() })).rejects.toThrow(/Nothing arrived on stdin/)
    await expect(openSource('-', { spool: true, stdin: stdinOf() })).rejects.toThrow(/Nothing arrived on stdin/)
  })
})

/**
 * Bytes taken from one end of a transfer and not yet handed to the other are
 * what the transfer holds in memory. Holding a whole file shows up here as the
 * whole file, whatever the garbage collector is doing.
 */
function inFlight() {
  let pulled = 0
  let delivered = 0
  let peak = 0

  return {
    pulled(bytes: number) {
      pulled += bytes
      peak = Math.max(peak, pulled - delivered)
    },
    delivered(bytes: number) {
      delivered += bytes
    },
    peak: () => peak,
  }
}

/** Counts what is read out of a stream, as it is read. */
function counted(stream: ReadableStream<Uint8Array>, onBytes: (bytes: number) => void): ReadableStream<Uint8Array> {
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        onBytes(chunk.byteLength)
        controller.enqueue(chunk)
      },
    }),
  )
}

/**
 * An S3 that counts bytes and keeps none of them, so a transfer much larger
 * than what the test lets the process hold can go through it. `GetObject`
 * hands back `size` bytes made up on the fly.
 */
function countingS3(
  options: { serve?: number; onReceive?: (bytes: number) => void; onServe?: (bytes: number) => void } = {},
) {
  let received = 0
  let largestBody = 0
  const stored = new Map<string, { metadata: Record<string, string>; contentType?: string }>()

  function count(body: unknown): number {
    const length = (body as Uint8Array).byteLength
    received += length
    largestBody = Math.max(largestBody, length)
    options.onReceive?.(length)
    return length
  }

  const send = vi.fn(async (command: { constructor: { name: string }; input: Record<string, any> }) => {
    const { input } = command

    switch (command.constructor.name) {
      case 'HeadObjectCommand':
        if (!stored.has(input.Key)) {
          throw Object.assign(new Error('Not Found'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } })
        }
        return { Metadata: stored.get(input.Key)!.metadata }
      case 'PutObjectCommand':
        count(input.Body)
        stored.set(input.Key, { metadata: input.Metadata ?? {}, contentType: input.ContentType })
        return { ETag: '"put"' }
      case 'CreateMultipartUploadCommand':
        stored.set(input.Key, { metadata: input.Metadata ?? {}, contentType: input.ContentType })
        return { UploadId: 'upload' }
      case 'UploadPartCommand':
        count(input.Body)
        return { ETag: `"part-${input.PartNumber}"` }
      case 'CompleteMultipartUploadCommand':
        return { ETag: '"done"' }
      case 'AbortMultipartUploadCommand':
        return {}
      case 'GetObjectCommand': {
        const size = options.serve ?? 0
        async function* generate() {
          for (let sent = 0; sent < size; sent += MiB) {
            const chunk = new Uint8Array(Math.min(MiB, size - sent))
            options.onServe?.(chunk.byteLength)
            yield chunk
          }
        }
        return {
          Body: Readable.from(generate()),
          ContentType: 'application/octet-stream',
          ContentLength: size,
          Metadata: { 's3nd-kind': 'file', filename: 'big.bin' },
        }
      }
      default:
        throw new Error(`Unexpected command: ${command.constructor.name}`)
    }
  })

  return {
    client: { send, destroy: vi.fn() } as unknown as S3Client,
    received: () => received,
    largestBody: () => largestBody,
  }
}

/** The CLI's local mode: the protocol client wired straight into the handler. */
function wired(s3: ReturnType<typeof countingS3>) {
  const handler = createTransferHandler({ bucket: createBucket({ bucket: 'transfers', client: s3.client }) })

  return createTransferClient({
    baseUrl: 'http://s3nd.local/api/transfers',
    fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
  })
}

describe('large transfers stay out of memory', () => {
  const SIZE = 160 * MiB
  /** Four 8 MiB parts in flight, and the chunks around them. Holding the file would be 160. */
  const BUDGET = 72 * MiB

  it('puts a file through a multipart upload without holding it', async () => {
    const path = join(root, 'big.bin')
    const handle = await open(path, 'w')
    await handle.truncate(SIZE)
    await handle.close()

    const flight = inFlight()
    const s3 = countingS3({ onReceive: flight.delivered })
    const client = wired(s3)
    const source = await openSource(path, { spool: false })

    const created = await client.createFile({
      body: counted(source.body, flight.pulled),
      size: source.size,
      filename: source.filename,
    })

    expect(created.size).toBe(SIZE)
    expect(s3.received()).toBe(SIZE)
    expect(s3.largestBody()).toBeLessThanOrEqual(8 * MiB)
    expect(flight.peak()).toBeLessThan(BUDGET)
  })

  it('gets a file into place without holding it', async () => {
    const flight = inFlight()
    const s3 = countingS3({ serve: SIZE, onServe: flight.pulled })
    const client = wired(s3)
    const destination = join(root, 'big.bin')

    const stream = await client.readStream('K7QP2M4X')
    let previous = 0
    const written = await writeReceived(destination, stream!.body, false, (total) => {
      flight.delivered(total - previous)
      previous = total
    })

    expect(stream!.size).toBe(SIZE)
    expect(written).toBe(SIZE)
    expect(statSync(destination).size).toBe(SIZE)
    expect(flight.peak()).toBeLessThan(BUDGET)
  })
})
