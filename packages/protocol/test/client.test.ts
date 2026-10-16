import { describe, expect, it, vi } from 'vitest'

import { createTransferClient, PROTOCOL_HEADER, PROTOCOL_VERSION, TransferError } from '../src/index.js'

const BASE = 'http://drop.test/api/transfers'

/** A fetch that answers one canned response, and records what it was asked. */
function stubFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = []

  const fetchImpl = vi.fn(async (input: any, init: any) => {
    calls.push({ url: String(input), init })
    return response
  }) as unknown as typeof globalThis.fetch

  return { fetchImpl, calls }
}

function created(kind: 'snapshot' | 'file' = 'snapshot') {
  return Response.json({ code: 'K7QP2M4X', kind, createdAt: '2026-01-01T00:00:00.000Z' }, { status: 201 })
}

describe('createTransferClient', () => {
  it('sends the configured headers on every request', async () => {
    const { fetchImpl, calls } = stubFetch(created())
    const client = createTransferClient({ baseUrl: BASE, headers: { authorization: 'Bearer t' }, fetch: fetchImpl })

    await client.createSnapshot({ data: 1 })

    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer t')
  })

  it('announces the protocol version on every request', async () => {
    const calls: RequestInit[] = []
    const fetchImpl = vi.fn(async (_input: any, init: any) => {
      calls.push(init)
      return init.method === 'POST' ? created() : new Response(null, { status: 204 })
    }) as unknown as typeof globalThis.fetch
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await client.createSnapshot({ data: 1 })
    await client.createFile({ body: new Uint8Array([1]), filename: 'a.txt' })
    await client.remove('K7QP2M4X')

    expect(calls).toHaveLength(3)
    for (const init of calls) {
      expect((init.headers as Record<string, string>)[PROTOCOL_HEADER]).toBe(String(PROTOCOL_VERSION))
    }
    expect(PROTOCOL_HEADER).toBe('s3nd-protocol')
  })

  it('keeps its own version header over a configured one', async () => {
    const { fetchImpl, calls } = stubFetch(created())
    const client = createTransferClient({ baseUrl: BASE, headers: { 's3nd-protocol': '9' }, fetch: fetchImpl })

    await client.createSnapshot({ data: 1 })

    expect((calls[0]!.init.headers as Record<string, string>)['s3nd-protocol']).toBe('1')
  })

  it('surfaces UNSUPPORTED_PROTOCOL as a TransferError', async () => {
    const { fetchImpl } = stubFetch(
      Response.json({ error: { code: 'UNSUPPORTED_PROTOCOL', message: 'Speaks 1.' } }, { status: 400 }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.read('K7QP2M4X')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROTOCOL', status: 400 })
  })

  it('percent-encodes the filename into the header', async () => {
    const { fetchImpl, calls } = stubFetch(created('file'))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await client.createFile({ body: new Uint8Array([1]), filename: 'rapport été.pdf' })

    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['x-s3nd-filename']).toBe(encodeURIComponent('rapport été.pdf'))
  })

  it('accepts a Uint8Array as a file body', async () => {
    const { fetchImpl, calls } = stubFetch(created('file'))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    // The obvious thing to hand this method; the DOM lib's BodyInit only
    // admits it under a narrower ArrayBuffer parameter than TextEncoder gives.
    await client.createFile({ body: new TextEncoder().encode('hi'), filename: 'a.txt' })

    expect(calls[0]!.init.body).toBeInstanceOf(Uint8Array)
  })

  it('tolerates a baseUrl with a trailing slash', async () => {
    const { fetchImpl, calls } = stubFetch(created())
    const client = createTransferClient({ baseUrl: `${BASE}/`, fetch: fetchImpl })

    await client.createSnapshot({ data: 1 })

    expect(calls[0]!.url).toBe(BASE)
  })

  it('encodes the code into the path', async () => {
    const { fetchImpl, calls } = stubFetch(Response.json({ code: 'A', kind: 'snapshot', createdAt: '' }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await client.read('K7QP 2M4X')

    expect(calls[0]!.url).toBe(`${BASE}/${encodeURIComponent('K7QP 2M4X')}`)
  })

  it('reads the documented error body back into a TransferError', async () => {
    const body = { error: { code: 'TOO_LARGE', message: 'That file is too big.' } }
    const { fetchImpl } = stubFetch(Response.json(body, { status: 413 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.createSnapshot({ data: 1 })).rejects.toMatchObject({
      name: 'TransferError',
      code: 'TOO_LARGE',
      status: 413,
      message: 'That file is too big.',
    })
  })

  it('still produces a typed error when the server is not one of ours', async () => {
    const { fetchImpl } = stubFetch(new Response('<html>gateway timeout</html>', { status: 504 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    const error = await client.createSnapshot({ data: 1 }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(TransferError)
    expect((error as TransferError).code).toBe('INTERNAL')
    expect((error as TransferError).status).toBe(504)
  })

  it('maps a bare 401 to UNAUTHORIZED', async () => {
    const { fetchImpl } = stubFetch(new Response('', { status: 401 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.read('K7QP2M4X')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('turns 404 into a value, not an exception', async () => {
    const body = { error: { code: 'NOT_FOUND', message: 'Unknown or expired code.' } }
    const { fetchImpl } = stubFetch(Response.json(body, { status: 404 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    expect(await client.read('K7QP2M4X')).toBeNull()
  })

  it('falls back to the global fetch when none is passed', () => {
    expect(() => createTransferClient({ baseUrl: BASE })).not.toThrow()
  })

  it('says so plainly on a runtime with no fetch at all', () => {
    const original = globalThis.fetch
    // @ts-expect-error — simulating an exotic runtime, which is the only case
    // where this guard fires: Node 18+ and every browser ship fetch.
    delete globalThis.fetch

    try {
      expect(() => createTransferClient({ baseUrl: BASE })).toThrow(TransferError)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('createTransferClient — response validation', () => {
  it('names the cause when a 200 is not JSON, as a login page would be', async () => {
    const { fetchImpl } = stubFetch(
      new Response('<!doctype html><title>Sign in</title>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    const error = await client.read('K7QP2M4X').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(TransferError)
    expect(error).toMatchObject({ code: 'INTERNAL', status: 200 })
    expect((error as Error).message).toMatch(/200 with text\/html/)
  })

  it('refuses JSON that does not parse', async () => {
    const { fetchImpl } = stubFetch(
      new Response('{"code":', { status: 201, headers: { 'content-type': 'application/json' } }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.createSnapshot({ data: 1 })).rejects.toMatchObject({ code: 'INTERNAL', status: 201 })
  })

  it('refuses JSON of the wrong shape rather than handing back an undefined code', async () => {
    const { fetchImpl } = stubFetch(Response.json({ ok: true }, { status: 201 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.createSnapshot({ data: 1 })).rejects.toMatchObject({ code: 'INTERNAL' })
  })

  it('refuses an unknown kind', async () => {
    const { fetchImpl } = stubFetch(
      Response.json({ code: 'K7QP2M4X', kind: 'folder', createdAt: '2026-01-01T00:00:00.000Z' }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    await expect(client.read('K7QP2M4X')).rejects.toMatchObject({ code: 'INTERNAL' })
  })

  it('accepts a JSON content type with parameters', async () => {
    const { fetchImpl } = stubFetch(
      new Response(JSON.stringify({ code: 'K7QP2M4X', kind: 'file', createdAt: '2026-01-01T00:00:00.000Z' }), {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    expect((await client.read('K7QP2M4X'))?.kind).toBe('file')
  })
})

describe('createTransferClient — timeout', () => {
  /** A fetch that never answers, but gives up when its signal aborts, as a real one does. */
  function hangingFetch() {
    return vi.fn(
      (_input: any, init: any) =>
        new Promise<Response>((_resolve, reject) => {
          const signal: AbortSignal | undefined = init?.signal
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ) as unknown as typeof globalThis.fetch
  }

  it('rejects with TIMEOUT once the timeout passes', async () => {
    const client = createTransferClient({ baseUrl: BASE, fetch: hangingFetch(), timeout: 20 })

    const error = await client.read('K7QP2M4X').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(TransferError)
    expect(error).toMatchObject({ code: 'TIMEOUT' })
    expect((error as Error).message).toMatch(/20 ms/)
  })

  it("keeps the caller's own abort an AbortError, not a timeout", async () => {
    const client = createTransferClient({ baseUrl: BASE, fetch: hangingFetch(), timeout: 10_000 })
    const controller = new AbortController()

    const pending = client.read('K7QP2M4X', { signal: controller.signal }).catch((caught: unknown) => caught)
    controller.abort()

    const error = await pending
    expect(error).not.toBeInstanceOf(TransferError)
    expect((error as Error).name).toBe('AbortError')
  })

  it('still passes the signal through when there is no timeout', async () => {
    const { fetchImpl, calls } = stubFetch(Response.json(null, { status: 404 }))
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })
    const controller = new AbortController()

    await client.read('K7QP2M4X', { signal: controller.signal }).catch(() => undefined)
    expect(calls[0]!.init.signal).toBe(controller.signal)
  })

  it('does not fire after a call that finished in time', async () => {
    vi.useFakeTimers()
    try {
      const { fetchImpl } = stubFetch(created())
      const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl, timeout: 50 })

      await client.createSnapshot({ data: 1 })
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('combines the signals by hand where AbortSignal.any is missing, as on Node 20.0', async () => {
    const original = AbortSignal.any
    // @ts-expect-error — simulating a runtime from before AbortSignal.any.
    delete AbortSignal.any

    try {
      const timedOut = createTransferClient({ baseUrl: BASE, fetch: hangingFetch(), timeout: 20 })
      const controller = new AbortController()
      await expect(timedOut.read('K7QP2M4X', { signal: controller.signal })).rejects.toMatchObject({
        code: 'TIMEOUT',
      })

      const aborted = createTransferClient({ baseUrl: BASE, fetch: hangingFetch(), timeout: 10_000 })
      const pending = aborted.read('K7QP2M4X', { signal: controller.signal }).catch((caught: unknown) => caught)
      controller.abort()
      expect(((await pending) as Error).name).toBe('AbortError')
    } finally {
      AbortSignal.any = original
    }
  })

  it('refuses a timeout that is not a positive number', () => {
    expect(() => createTransferClient({ baseUrl: BASE, timeout: 0 })).toThrowError(TypeError)
    expect(() => createTransferClient({ baseUrl: BASE, timeout: Number.NaN })).toThrowError(TypeError)
  })

  it('sends a delete token in its own header', async () => {
    const { fetchImpl, calls } = stubFetch(new Response(null, { status: 204 }))
    const client = createTransferClient({
      baseUrl: BASE,
      fetch: fetchImpl,
      headers: { authorization: 'Bearer server' },
    })

    await client.remove('K7QP2M4X', { deleteToken: 'tok' })

    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['x-s3nd-delete-token']).toBe('tok')
    expect(headers.authorization).toBe('Bearer server')
  })

  it('reads a bare 429 as RATE_LIMITED, with its retry-after', async () => {
    const { fetchImpl } = stubFetch(
      new Response('Too Many Requests', { status: 429, headers: { 'retry-after': '12' } }),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    const error = (await client.read('K7QP2M4X').catch((e) => e)) as TransferError

    expect(error.code).toBe('RATE_LIMITED')
    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(12)
  })

  it('turns a retry-after date into seconds from now', async () => {
    const later = new Date(Date.now() + 90_000).toUTCString()
    const { fetchImpl } = stubFetch(
      Response.json(
        { error: { code: 'RATE_LIMITED', message: 'slow' } },
        { status: 429, headers: { 'retry-after': later } },
      ),
    )
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl })

    const error = (await client.read('K7QP2M4X').catch((e) => e)) as TransferError

    expect(error.retryAfter).toBeGreaterThanOrEqual(88)
    expect(error.retryAfter).toBeLessThanOrEqual(90)
  })
})
