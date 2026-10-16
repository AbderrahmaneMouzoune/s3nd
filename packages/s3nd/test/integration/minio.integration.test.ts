import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createBucket, type Bucket } from '../../src/bucket.js'
import { createTransferHandler } from '../../src/handler.js'
import { createTransferClient } from '@s3nd/protocol'

/**
 * Runs against a real S3-compatible server, MinIO in CI, which is what the
 * in-memory double in `helpers.ts` cannot stand in for: checksum headers,
 * aws-chunked streaming bodies, conditional writes, presigned URLs.
 *
 * Point it at a server with S3ND_TEST_ENDPOINT (and optionally
 * S3ND_TEST_ACCESS_KEY / S3ND_TEST_SECRET_KEY, minioadmin by default), then
 * `bun run test:integration` in this package. Without the endpoint the suite
 * is skipped, so it never needs a network by accident.
 */
const endpoint = process.env.S3ND_TEST_ENDPOINT
const credentials = {
  accessKeyId: process.env.S3ND_TEST_ACCESS_KEY ?? 'minioadmin',
  secretAccessKey: process.env.S3ND_TEST_SECRET_KEY ?? 'minioadmin',
}
// A bucket per run, so a rerun never trips over what the last one left.
const name = `s3nd-it-${randomUUID().slice(0, 8)}`

describe.skipIf(!endpoint)('Bucket against a real S3-compatible server', () => {
  let bucket: Bucket

  beforeAll(async () => {
    const admin = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials })
    await admin.send(new CreateBucketCommand({ Bucket: name }))
    admin.destroy()

    // Built the way a user builds it: s3nd creates the client from the
    // endpoint, so this exercises createS3Client()'s defaults too.
    bucket = createBucket({ bucket: name, endpoint, credentials, prefix: 'transfers' })
  })

  afterAll(() => bucket?.destroy())

  it('uploads a buffer and reads it back', async () => {
    const bytes = new TextEncoder().encode('hello bucket')
    const uploaded = await bucket.put('buffer', bytes, { filename: 'hello.txt' })

    expect(uploaded.size).toBe(bytes.byteLength)

    const file = await bucket.get('buffer')
    expect(file?.filename).toBe('hello.txt')
    expect(file?.contentType).toContain('text/plain')
    expect(await file?.text()).toBe('hello bucket')
  })

  it('uploads a Node stream', async () => {
    // A streaming body is where the SDK's default checksums switch to a
    // trailer, which is what an S3-compatible server may not implement.
    const chunks = Array.from({ length: 64 }, (_, index) => `chunk ${index};`)
    const contentLength = Buffer.byteLength(chunks.join(''))
    await bucket.put('stream', Readable.from(chunks), { contentType: 'text/plain', contentLength })

    expect(await (await bucket.get('stream'))?.text()).toBe(chunks.join(''))
  })

  it('answers null for a key that does not exist', async () => {
    expect(await bucket.get('nothing-here')).toBeNull()
  })

  it('round-trips a gzipped snapshot', async () => {
    const data = { notes: Array.from({ length: 200 }, (_, index) => ({ id: index, text: 'same words again' })) }
    const written = await bucket.putSnapshot('snapshot', data, { app: 'it', version: 2, device: 'ci' })

    expect(written.size).toBeLessThan(JSON.stringify(data).length)

    const read = await bucket.getSnapshot<typeof data>('snapshot')
    expect(read).toMatchObject({ app: 'it', version: 2, device: 'ci', data })
  })

  it('refuses a write over an existing key with ifAbsent', async () => {
    await bucket.put('absent', 'first', { ifAbsent: true })

    await expect(bucket.put('absent', 'second', { ifAbsent: true })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    })
    expect(await (await bucket.get('absent'))?.text()).toBe('first')
  })

  it('writes with the current ETag and refuses a stale one with ifMatch', async () => {
    const first = await bucket.put('match', 'one')
    const second = await bucket.put('match', 'two', { ifMatch: first.etag })

    await expect(bucket.put('match', 'three', { ifMatch: first.etag })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    })

    await bucket.put('match', 'three', { ifMatch: second.etag })
    expect(await (await bucket.get('match'))?.text()).toBe('three')
  })

  it('signs a URL that really serves the object', async () => {
    await bucket.put('signed', 'over a presigned URL', { filename: 'signed.txt' })

    const response = await fetch(await bucket.getUrl('signed', { download: true }))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('over a presigned URL')
    expect(response.headers.get('content-disposition')).toContain('attachment')
  })

  it('deletes many keys in one batch', async () => {
    const keys = Array.from({ length: 5 }, (_, index) => `batch-${index}`)
    await Promise.all(keys.map((key) => bucket.put(key, key)))

    await bucket.delete([...keys, 'never-existed'])

    for (const key of keys) expect(await bucket.get(key)).toBeNull()
  })

  it('serves the transfer protocol end to end', async () => {
    const handler = createTransferHandler({ bucket })
    const client = createTransferClient({
      baseUrl: 'http://drop.test/api/transfers',
      fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
    })

    const snapshot = await client.createSnapshot({ data: { notes: ['one'] }, version: 1 })
    expect(await client.read(snapshot.code)).toMatchObject({ kind: 'snapshot', data: { notes: ['one'] } })

    const file = await client.createFile({
      body: new TextEncoder().encode('file over the protocol'),
      filename: 'note.txt',
    })
    expect(new TextDecoder().decode((await client.readBytes(file.code)) ?? new Uint8Array())).toBe(
      'file over the protocol',
    )

    await client.remove(snapshot.code)
    expect(await client.read(snapshot.code)).toBeNull()
  })
})
