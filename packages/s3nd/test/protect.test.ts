import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { createBucket } from '../src/bucket.js'
import { createTransferHandler, type RateLimitContext } from '../src/handler.js'
import { createTransferClient, isTransferError } from '@s3nd/protocol'
import { createMemoryClient } from './helpers.js'

const BASE = 'http://drop.test/api/transfers'

function setup(config: Partial<Parameters<typeof createTransferHandler>[0]> = {}) {
  const memory = createMemoryClient()
  const bucket = createBucket({ bucket: 'transfers', client: memory.client })
  const handler = createTransferHandler({ bucket, ...config })

  return { memory, bucket, handler }
}

function postSnapshot(data: unknown): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data }),
  })
}

function postFile(text: string): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-s3nd-filename': 'note.txt' },
    body: text,
  })
}

function burn(code: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}/${code}`, { method: 'DELETE', headers })
}

async function created(response: Response): Promise<{ code: string; deleteToken: string }> {
  expect(response.status).toBe(201)
  return (await response.json()) as { code: string; deleteToken: string }
}

describe('delete tokens', () => {
  it('hands out a token on creation, and stores only its SHA-256', async () => {
    const { handler, memory } = setup()

    for (const request of [postSnapshot({ a: 1 }), postFile('hello')]) {
      const { code, deleteToken } = await created(await handler(request))
      const stored = memory.objects.get(code)!

      expect(deleteToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(stored.metadata!['s3nd-delete-token-sha256']).toBe(createHash('sha256').update(deleteToken).digest('hex'))
      expect(JSON.stringify(stored.metadata)).not.toContain(deleteToken)
    }
  })

  it('hands out a different token for every transfer', async () => {
    const { handler } = setup()

    const first = await created(await handler(postFile('a')))
    const second = await created(await handler(postFile('b')))

    expect(first.deleteToken).not.toBe(second.deleteToken)
  })

  it('leaves DELETE open without protectDelete, as before', async () => {
    const { handler, memory } = setup()
    const { code } = await created(await handler(postFile('x')))

    expect((await handler(burn(code))).status).toBe(204)
    expect(memory.objects.has(code)).toBe(false)
  })
})

describe('protectDelete', () => {
  it('refuses a DELETE without a token, and keeps the transfer', async () => {
    const { handler, memory } = setup({ protectDelete: true })
    const { code } = await created(await handler(postFile('x')))

    const response = await handler(burn(code))

    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('UNAUTHORIZED')
    expect(memory.objects.has(code)).toBe(true)
  })

  it('refuses a wrong token', async () => {
    const { handler, memory } = setup({ protectDelete: true })
    const { code } = await created(await handler(postSnapshot(1)))

    expect((await handler(burn(code, { 'x-s3nd-delete-token': 'not-it' }))).status).toBe(401)
    expect(memory.objects.has(code)).toBe(true)
  })

  it('burns with the right token, in its header or as a bearer', async () => {
    const { handler, memory } = setup({ protectDelete: true })
    const first = await created(await handler(postFile('x')))
    const second = await created(await handler(postSnapshot(1)))

    expect((await handler(burn(first.code, { 'x-s3nd-delete-token': first.deleteToken }))).status).toBe(204)
    expect((await handler(burn(second.code, { authorization: `Bearer ${second.deleteToken}` }))).status).toBe(204)
    expect(memory.objects.has(first.code)).toBe(false)
    expect(memory.objects.has(second.code)).toBe(false)
  })

  it('reads the token from its own header when authorization carries the server credentials', async () => {
    const { handler } = setup({
      protectDelete: true,
      authorize: (request) => request.headers.get('authorization') === 'Bearer server-key',
    })
    const { code, deleteToken } = await created(
      await handler(
        new Request(BASE, {
          method: 'POST',
          headers: { authorization: 'Bearer server-key', 'content-type': 'text/plain', 'x-s3nd-filename': 'a' },
          body: 'x',
        }),
      ),
    )

    const response = await handler(
      burn(code, { authorization: 'Bearer server-key', 'x-s3nd-delete-token': deleteToken }),
    )

    expect(response.status).toBe(204)
  })

  it('answers 204 for a code already gone, as DELETE always has', async () => {
    const { handler } = setup({ protectDelete: true })

    expect((await handler(burn('K7QP2M4X', { 'x-s3nd-delete-token': 'whatever' }))).status).toBe(204)
  })

  it('refuses to burn a transfer stored without a token hash', async () => {
    const { handler, bucket } = setup({ protectDelete: true })
    await bucket.putSnapshot('K7QP2M4X', { older: true })

    expect((await handler(burn('K7QP2M4X', { 'x-s3nd-delete-token': 'guess' }))).status).toBe(401)
  })

  it('works end to end through the client', async () => {
    const { handler, memory } = setup({ protectDelete: true })
    const client = createTransferClient({
      baseUrl: BASE,
      fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
    })

    const transfer = await client.createSnapshot({ data: { notes: [] } })
    const refused = await client.remove(transfer.code).catch((error: unknown) => error)
    await client.remove(transfer.code, { deleteToken: transfer.deleteToken })

    expect(isTransferError(refused) && refused.code).toBe('UNAUTHORIZED')
    expect(memory.objects.has(transfer.code)).toBe(false)
  })
})

describe('rateLimit', () => {
  it('is asked about every route, with the normalised code', async () => {
    const seen: RateLimitContext[] = []
    const { handler } = setup({
      rateLimit: (_request, context) => {
        seen.push(context)
        return true
      },
    })
    const { code } = await created(await handler(postFile('x')))

    await handler(new Request(`${BASE}/${code.toLowerCase()}`))
    await handler(new Request(`${BASE}/${code}/raw`))
    await handler(burn(code))

    expect(seen).toEqual([
      { route: 'create' },
      { route: 'read', code },
      { route: 'raw', code },
      { route: 'delete', code },
    ])
  })

  it('answers 429 RATE_LIMITED, before the code is looked up', async () => {
    const { handler, memory } = setup({ rateLimit: () => false })

    const response = await handler(new Request(`${BASE}/K7QP2M4X`))

    expect(response.status).toBe(429)
    expect((await response.json()).error.code).toBe('RATE_LIMITED')
    expect(memory.send).not.toHaveBeenCalled()
  })

  it('lets the hook answer with its own response, retry-after included', async () => {
    const { handler } = setup({
      rateLimit: () =>
        Response.json(
          { error: { code: 'RATE_LIMITED', message: 'slow down' } },
          {
            status: 429,
            headers: { 'retry-after': '30' },
          },
        ),
    })
    const client = createTransferClient({
      baseUrl: BASE,
      fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
    })

    const error = await client.read('K7QP2M4X').catch((caught: unknown) => caught)

    expect(isTransferError(error) && error.code).toBe('RATE_LIMITED')
    expect(isTransferError(error) && error.retryAfter).toBe(30)
  })

  it('is not asked about a code that cannot be one', async () => {
    const rateLimit = vi.fn(() => true)
    const { handler } = setup({ rateLimit })

    expect((await handler(new Request(`${BASE}/not%20a%20code!`))).status).toBe(400)
    expect(rateLimit).not.toHaveBeenCalled()
  })
})

describe('burnAfterRead', () => {
  it('deletes a snapshot once it has been read', async () => {
    const { handler, memory } = setup({ burnAfterRead: true })
    const { code } = await created(await handler(postSnapshot({ notes: ['one'] })))

    const first = await handler(new Request(`${BASE}/${code}`))
    const second = await handler(new Request(`${BASE}/${code}`))

    expect(first.status).toBe(200)
    expect((await first.json()).data).toEqual({ notes: ['one'] })
    expect(second.status).toBe(404)
    expect(memory.objects.has(code)).toBe(false)
  })

  it('keeps a file through its metadata read, and burns it once /raw is read in full', async () => {
    const { handler, memory } = setup({ burnAfterRead: true })
    const { code } = await created(await handler(postFile('the bytes')))

    expect((await handler(new Request(`${BASE}/${code}`))).status).toBe(200)
    expect(memory.objects.has(code)).toBe(true)

    const raw = await handler(new Request(`${BASE}/${code}/raw`))
    expect(await raw.text()).toBe('the bytes')

    expect(memory.objects.has(code)).toBe(false)
    expect((await handler(new Request(`${BASE}/${code}/raw`))).status).toBe(404)
  })

  it('leaves a file whose download was abandoned', async () => {
    const { handler, memory } = setup({ burnAfterRead: true })
    const { code } = await created(await handler(postFile('the bytes')))

    const raw = await handler(new Request(`${BASE}/${code}/raw`))
    await raw.body!.cancel()

    expect(memory.objects.has(code)).toBe(true)
  })

  it("refuses raw: 'redirect', where it cannot tell when the bytes were read", () => {
    expect(() => setup({ burnAfterRead: true, raw: 'redirect' })).toThrowError(
      expect.objectContaining({ code: 'INVALID_CONFIG' }),
    )
  })
})
