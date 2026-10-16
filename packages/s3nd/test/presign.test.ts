import { describe, expect, it } from 'vitest'

import { createTransferHandler, type TransferHandlerConfig } from '../src/handler.js'
import { createTransferClient, isTransferError, type ClientUploadMode, type TransferProgress } from '@s3nd/protocol'
import { bucketPut, memoryBucket, MEMORY_ENDPOINT as ENDPOINT } from './helpers.js'

const BASE = 'http://drop.test/api/transfers'

function setup(handlerConfig: Partial<TransferHandlerConfig> = {}, clientMode: ClientUploadMode = 'presign') {
  const { memory, bucket } = memoryBucket({ maxSize: handlerConfig.bucket ? undefined : 1024 * 1024 })
  const handler = createTransferHandler({ bucket, upload: 'presign', ...handlerConfig })
  const requests: string[] = []

  const client = createTransferClient({
    baseUrl: BASE,
    upload: clientMode,
    headers: { authorization: 'Bearer token' },
    fetch: async (input, init) => {
      const request = new Request(input as string, init as RequestInit)
      requests.push(`${request.method} ${request.url.split('?')[0]}`)

      if (new URL(request.url).origin === ENDPOINT) {
        // The server's credentials must never travel to the bucket.
        expect(request.headers.get('authorization')).toBeNull()
        return bucketPut(memory, request)
      }

      return handler(request)
    },
  })

  return { memory, bucket, handler, client, requests }
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

describe('presigned uploads', () => {
  it('sends the bytes to the bucket, then completes the transfer', async () => {
    const { client, memory, requests } = setup()
    const bytes = new TextEncoder().encode('straight to the bucket')

    const created = await client.createFile({ body: bytes, filename: 'note.txt', contentType: 'text/plain' })

    expect(requests).toEqual([
      `POST ${BASE}`,
      `PUT ${ENDPOINT}/transfers/pending/${created.code}`,
      `POST ${BASE}/${created.code}/complete`,
    ])
    expect(created).toMatchObject({ kind: 'file', size: bytes.byteLength })
    expect(created.deleteToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(memory.objects.has(`pending/${created.code}`)).toBe(false)

    expect(await client.readBytes(created.code)).toEqual(bytes)
    expect(await client.read(created.code)).toMatchObject({
      kind: 'file',
      filename: 'note.txt',
      contentType: 'text/plain',
    })
  })

  it('signs the length and the type, and no checksum', async () => {
    const { handler } = setup()

    const response = await handler(
      new Request(BASE, json({ upload: 'presign', filename: 'a.png', size: 10, contentType: 'image/png' })),
    )
    const body = (await response.json()) as { uploadUrl: string; headers: Record<string, string>; method: string }
    const url = new URL(body.uploadUrl)

    expect(response.status).toBe(201)
    expect(body.method).toBe('PUT')
    expect(body.headers).toEqual({ 'content-type': 'image/png' })
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900')
    expect([...url.searchParams.keys()].filter((name) => /checksum/i.test(name))).toEqual([])
  })

  it('reads as NOT_FOUND until it is completed', async () => {
    const { handler, client } = setup()

    const response = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a.bin', size: 3 })))
    const { code } = (await response.json()) as { code: string }

    expect(await client.read(code)).toBeNull()
    expect(await client.readBytes(code)).toBeNull()
  })

  it('refuses to complete what was never uploaded', async () => {
    const { handler } = setup()

    const ticket = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a.bin', size: 3 })))
    const { code } = (await ticket.json()) as { code: string }
    const response = await handler(new Request(`${BASE}/${code}/complete`, { method: 'POST' }))

    expect(response.status).toBe(404)
  })

  it('answers a repeated completion with the same transfer', async () => {
    const { client, handler } = setup()

    const created = await client.createFile({ body: new Uint8Array([1, 2, 3]), filename: 'a.bin' })
    const again = await handler(new Request(`${BASE}/${created.code}/complete`, { method: 'POST' }))

    expect(again.status).toBe(201)
    const repeated = await again.json()
    expect(repeated).toMatchObject({ code: created.code, kind: 'file', size: 3 })
    // Handed out once, never again.
    expect(repeated.deleteToken).toBeUndefined()
  })

  it('throws away an upload whose size differs from the announced one', async () => {
    const { handler, memory } = setup()

    const ticket = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a.bin', size: 3 })))
    const { code } = (await ticket.json()) as { code: string }
    // What a misbehaving bucket, or a gateway that ignores the signed length, lets through.
    memory.objects.set(`pending/${code}`, {
      body: new Uint8Array(5),
      metadata: { 's3nd-kind': 'file', 's3nd-declared-size': '3' },
      etag: 'x',
      lastModified: new Date(),
    })

    const response = await handler(new Request(`${BASE}/${code}/complete`, { method: 'POST' }))

    expect(response.status).toBe(400)
    expect(memory.objects.has(`pending/${code}`)).toBe(false)
    expect(memory.objects.has(code)).toBe(false)
  })

  it('refuses a file above maxSize before signing anything', async () => {
    const { handler } = setup()

    const response = await handler(
      new Request(BASE, json({ upload: 'presign', filename: 'big.bin', size: 2 * 1024 * 1024 })),
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ error: { code: 'TOO_LARGE' } })
  })

  it('validates the request', async () => {
    const { handler } = setup()

    for (const body of [
      { upload: 'presign', size: 3 },
      { upload: 'presign', filename: 'a', size: -1 },
      { upload: 'presign', filename: 'a', size: 1.5 },
      { upload: 'presign', filename: 'a', size: 0 },
      { upload: 'presign', filename: 'a', size: 3, contentType: 42 },
    ]) {
      const response = await handler(new Request(BASE, json(body)))
      expect(response.status).toBe(400)
    }
  })

  it('keeps pending uploads under pending/, inside the bucket prefix', async () => {
    const { memory, bucket } = memoryBucket({ prefix: 'transfers' })
    const handler = createTransferHandler({ bucket, upload: 'both' })

    const response = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a.bin', size: 3 })))
    const { code, uploadUrl } = (await response.json()) as { code: string; uploadUrl: string }

    expect(new URL(uploadUrl).pathname).toBe(`/transfers/transfers/pending/${code}`)
    expect(memory.objects.size).toBe(0)
  })

  it('burns a pending upload along with its code', async () => {
    const { handler, memory } = setup()

    const ticket = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a.bin', size: 3 })))
    const { code } = (await ticket.json()) as { code: string }
    memory.objects.set(`pending/${code}`, { body: new Uint8Array(3), etag: 'x', lastModified: new Date() })

    const response = await handler(new Request(`${BASE}/${code}`, { method: 'DELETE' }))

    expect(response.status).toBe(204)
    expect(memory.objects.has(`pending/${code}`)).toBe(false)
  })

  it('reports progress as the bytes go out', async () => {
    const { client } = setup()
    const seen: TransferProgress[] = []

    await client.createFile({
      body: new Uint8Array(300 * 1024),
      filename: 'a.bin',
      onProgress: (progress) => seen.push(progress),
    })

    expect(seen[0]).toEqual({ loaded: 0, total: 300 * 1024 })
    expect(seen.at(-1)).toEqual({ loaded: 300 * 1024, total: 300 * 1024 })
    expect(seen.length).toBeGreaterThan(2)
  })

  it('sends a stream of known size', async () => {
    const { client } = setup()
    const bytes = new TextEncoder().encode('streamed')

    const created = await client.createFile({ body: new Blob([bytes]).stream(), size: bytes.byteLength, filename: 'a' })

    expect(await client.readBytes(created.code)).toEqual(bytes)
  })

  it('says what is missing when a stream comes without its size', async () => {
    const { client } = setup()

    const error = await client
      .createFile({ body: new Blob(['x']).stream(), filename: 'a' })
      .catch((caught: unknown) => caught)

    expect(isTransferError(error) && error.code).toBe('INVALID_REQUEST')
  })

  it('reports a bucket that refuses the bytes', async () => {
    const { bucket } = memoryBucket()
    const handler = createTransferHandler({ bucket, upload: 'presign' })
    const client = createTransferClient({
      baseUrl: BASE,
      upload: 'presign',
      fetch: async (input, init) => {
        const request = new Request(input as string, init as RequestInit)
        return new URL(request.url).origin === ENDPOINT ? new Response('nope', { status: 403 }) : handler(request)
      },
    })

    const error = await client.createFile({ body: new Uint8Array(3), filename: 'a' }).catch((caught: unknown) => caught)

    expect(isTransferError(error) && error.status).toBe(403)
  })
})

describe('upload modes', () => {
  it('a proxy server refuses a presign request', async () => {
    const { handler } = setup({ upload: 'proxy' })

    const response = await handler(new Request(BASE, json({ upload: 'presign', filename: 'a', size: 3 })))

    expect(response.status).toBe(400)
  })

  it('a presign-only server refuses raw bytes, but still takes snapshots', async () => {
    const { handler } = setup({ upload: 'presign' })

    const raw = await handler(new Request(BASE, { method: 'POST', body: 'bytes' }))
    const snapshot = await handler(new Request(BASE, json({ data: { a: 1 } })))

    expect(raw.status).toBe(400)
    expect(snapshot.status).toBe(201)
  })

  it('auto falls back to proxy, once and for good, on a server that does not presign', async () => {
    const { client, requests } = setup({ upload: 'proxy' }, 'auto')

    const first = await client.createFile({ body: new Uint8Array([1]), filename: 'a' })
    const second = await client.createFile({ body: new Uint8Array([2]), filename: 'b' })

    expect(first.kind).toBe('file')
    expect(second.kind).toBe('file')
    expect(requests).toEqual([`POST ${BASE}`, `POST ${BASE}`, `POST ${BASE}`])
    expect(await client.readBytes(second.code)).toEqual(new Uint8Array([2]))
  })

  it('auto presigns when the server offers it', async () => {
    const { client, requests } = setup({ upload: 'both' }, 'auto')

    const created = await client.createFile({ body: new Uint8Array([1]), filename: 'a' })

    expect(requests[1]).toBe(`PUT ${ENDPOINT}/transfers/pending/${created.code}`)
  })

  it('proxy is the client default, so nothing changes for existing callers', async () => {
    const { memory, bucket } = memoryBucket()
    const handler = createTransferHandler({ bucket })
    const client = createTransferClient({
      baseUrl: BASE,
      fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
    })

    const created = await client.createFile({ body: new Uint8Array([1, 2]), filename: 'a' })

    expect(memory.objects.has(created.code)).toBe(true)
  })
})
