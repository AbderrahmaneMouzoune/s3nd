import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTransferClient, type TransferProgress } from '../src/index.js'

const BASE = 'http://drop.test/api/transfers'

afterEach(() => vi.unstubAllGlobals())

describe('progress', () => {
  it('counts a proxied upload as the server reads it', async () => {
    const seen: TransferProgress[] = []
    let received = 0

    const client = createTransferClient({
      baseUrl: BASE,
      fetch: async (input, init) => {
        const request = new Request(input as string, init as RequestInit)
        received = (await request.arrayBuffer()).byteLength
        return Response.json({ code: 'K7QP2M4X', kind: 'file', createdAt: 'x' }, { status: 201 })
      },
    })

    await client.createFile({ body: new Uint8Array(200_000), filename: 'a', onProgress: (p) => seen.push(p) })

    expect(received).toBe(200_000)
    expect(seen[0]).toEqual({ loaded: 0, total: 200_000 })
    expect(seen.at(-1)).toEqual({ loaded: 200_000, total: 200_000 })
  })

  it('counts a download against its Content-Length', async () => {
    const seen: TransferProgress[] = []
    const client = createTransferClient({
      baseUrl: BASE,
      fetch: async () =>
        new Response(new Blob([new Uint8Array(70_000)]).stream(), { headers: { 'content-length': '70000' } }),
    })

    const bytes = await client.readBytes('K7QP2M4X', { onProgress: (p) => seen.push(p) })

    expect(bytes?.byteLength).toBe(70_000)
    expect(seen[0]).toEqual({ loaded: 0, total: 70_000 })
    expect(seen.at(-1)).toEqual({ loaded: 70_000, total: 70_000 })
  })

  it('goes through XMLHttpRequest where there is one, for upload.onprogress', async () => {
    const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = []

    class FakeXhr {
      status = 0
      statusText = ''
      responseText = ''
      upload: { onprogress?: (event: { loaded: number; total: number; lengthComputable: boolean }) => void } = {}
      onload?: () => void
      onerror?: () => void
      onabort?: () => void
      private request = { method: '', url: '', headers: {} as Record<string, string> }

      open(method: string, url: string) {
        this.request.method = method
        this.request.url = url
      }
      setRequestHeader(name: string, value: string) {
        this.request.headers[name] = value
      }
      getAllResponseHeaders() {
        return 'content-type: application/json\r\n'
      }
      abort() {
        this.onabort?.()
      }
      send(body: unknown) {
        sent.push({ ...this.request, body })
        this.upload.onprogress?.({ loaded: 5, total: 10, lengthComputable: true })
        this.upload.onprogress?.({ loaded: 10, total: 10, lengthComputable: true })
        this.status = 201
        this.responseText = JSON.stringify({ code: 'K7QP2M4X', kind: 'file', createdAt: 'x' })
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr)

    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const seen: TransferProgress[] = []
    const client = createTransferClient({ baseUrl: BASE, headers: { authorization: 'Bearer t' } })

    const created = await client.createFile({
      body: new Uint8Array(10),
      filename: 'a.bin',
      onProgress: (p) => seen.push(p),
    })

    expect(created.code).toBe('K7QP2M4X')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(sent[0]).toMatchObject({ method: 'POST', url: BASE, headers: { authorization: 'Bearer t' } })
    expect(seen.map((p) => p.loaded)).toEqual([0, 5, 10])
  })

  it('never bypasses a fetch of your own, even where XMLHttpRequest exists', async () => {
    vi.stubGlobal(
      'XMLHttpRequest',
      class {
        constructor() {
          throw new Error('XMLHttpRequest should not be used')
        }
      },
    )
    const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
      await new Request(input as string, init).arrayBuffer()
      return Response.json({ code: 'K7QP2M4X', kind: 'file', createdAt: 'x' }, { status: 201 })
    })
    const seen: TransferProgress[] = []
    const client = createTransferClient({ baseUrl: BASE, fetch: fetchImpl as unknown as typeof fetch })

    await client.createFile({ body: new Uint8Array(10), filename: 'a', onProgress: (p) => seen.push(p) })

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(seen.at(-1)).toEqual({ loaded: 10, total: 10 })
  })

  it('aborts an XMLHttpRequest upload with the signal', async () => {
    class HangingXhr {
      upload = {}
      onabort?: () => void
      open() {}
      setRequestHeader() {}
      send() {}
      abort() {
        this.onabort?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', HangingXhr)

    vi.stubGlobal('fetch', vi.fn())
    const controller = new AbortController()
    const client = createTransferClient({ baseUrl: BASE })
    const pending = client.createFile({
      body: new Uint8Array(1),
      filename: 'a',
      signal: controller.signal,
      onProgress: () => {},
    })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
