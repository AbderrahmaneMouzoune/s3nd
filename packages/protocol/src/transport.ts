import type { TransferProgress } from './types.js'

/** What the client hands a transport: a body it may count, and where to send it. */
export interface Outgoing {
  url: string
  method: string
  headers: Record<string, string>
  body: BodyInit | Uint8Array
  /** Byte size, when known: what progress is measured against. */
  size?: number
  signal?: AbortSignal
  onProgress?: (progress: TransferProgress) => void
  /**
   * Whether an `XMLHttpRequest` may stand in for `fetch` to report progress.
   * Only when the caller did not bring their own `fetch`: one passed in is
   * there for a reason (auth, retries, tests) and is never bypassed.
   */
  allowXhr?: boolean
}

/** The part of a `Response` the client reads, so an XHR answer can stand in for one. */
export interface Incoming {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
}

/** Progress is reported in steps of this much, so a large buffer still moves the bar. */
const PROGRESS_CHUNK = 64 * 1024

export function sizeOf(body: unknown): number | undefined {
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength
  if (body instanceof ArrayBuffer) return body.byteLength
  if (ArrayBuffer.isView(body)) return body.byteLength
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size

  return undefined
}

function isStream(body: unknown): body is ReadableStream<Uint8Array> {
  return typeof (body as ReadableStream)?.getReader === 'function'
}

function abortError(signal: AbortSignal | undefined): unknown {
  return signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}

/**
 * Sends a request and reports how much of its body has gone out.
 *
 * In a browser that is an `XMLHttpRequest`: its `upload.onprogress` is the only
 * way to see bytes leave, since `fetch` reports nothing until the response.
 * Elsewhere, or with a `fetch` of the caller's, the body is wrapped in a
 * stream that counts what is read from it.
 * Without `onProgress`, it is a plain `fetch`.
 */
export async function transmit(doFetch: typeof globalThis.fetch, outgoing: Outgoing): Promise<Incoming> {
  const { onProgress } = outgoing

  if (!onProgress) {
    return doFetch(outgoing.url, {
      method: outgoing.method,
      headers: outgoing.headers,
      body: outgoing.body as BodyInit,
      signal: outgoing.signal,
      ...(isStream(outgoing.body) ? { duplex: 'half' } : {}),
    } as RequestInit)
  }

  if (outgoing.allowXhr && typeof XMLHttpRequest !== 'undefined' && !isStream(outgoing.body)) {
    return sendWithXhr(outgoing, onProgress)
  }

  const total = outgoing.size ?? sizeOf(outgoing.body)
  const counted = countedStream(outgoing.body, (loaded) => onProgress({ loaded, total }))

  const response = await doFetch(outgoing.url, {
    method: outgoing.method,
    headers: { ...outgoing.headers, ...(total != null ? { 'content-length': String(total) } : {}) },
    body: counted,
    signal: outgoing.signal,
    duplex: 'half',
  } as RequestInit)

  return response
}

/** Turns any body into a stream of bytes that reports each chunk as it is read. */
function countedStream(body: BodyInit | Uint8Array, report: (loaded: number) => void): ReadableStream<Uint8Array> {
  let source: ReadableStream<Uint8Array> | undefined
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let loaded = 0

  return new ReadableStream<Uint8Array>({
    async start() {
      report(0)
      source = isStream(body) ? body : (new Response(body as BodyInit).body ?? undefined)
      reader = source?.getReader()
    },
    async pull(controller) {
      if (!reader) {
        controller.close()
        return
      }

      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }

      // Hand a large chunk on in slices, so progress moves at a steady pace.
      for (let offset = 0; offset < value.byteLength; offset += PROGRESS_CHUNK) {
        const slice = value.subarray(offset, offset + PROGRESS_CHUNK)
        controller.enqueue(slice)
        loaded += slice.byteLength
        report(loaded)
      }
    },
    async cancel(reason) {
      await reader?.cancel(reason)
    },
  })
}

function sendWithXhr(outgoing: Outgoing, onProgress: (progress: TransferProgress) => void): Promise<Incoming> {
  return new Promise((resolve, reject) => {
    const { signal } = outgoing
    if (signal?.aborted) {
      reject(abortError(signal))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open(outgoing.method, outgoing.url)

    for (const [name, value] of Object.entries(outgoing.headers)) {
      // The browser sets these itself and refuses to be told.
      if (name.toLowerCase() === 'content-length') continue
      xhr.setRequestHeader(name, value)
    }

    const total = outgoing.size ?? sizeOf(outgoing.body)
    onProgress({ loaded: 0, total })
    xhr.upload.onprogress = (event) => {
      onProgress({ loaded: event.loaded, total: event.lengthComputable ? event.total : total })
    }

    const onAbort = () => xhr.abort()
    signal?.addEventListener('abort', onAbort, { once: true })
    const done = () => signal?.removeEventListener('abort', onAbort)

    xhr.onload = () => {
      done()
      const text = xhr.responseText
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        json: async () => JSON.parse(text),
      })
    }
    xhr.onerror = () => {
      done()
      // A status of 0 is all the browser says about a CORS refusal.
      reject(new TypeError('The request did not reach the server (network error, or refused by CORS).'))
    }
    xhr.onabort = () => {
      done()
      reject(abortError(signal))
    }

    xhr.send(outgoing.body as XMLHttpRequestBodyInit)
  })
}

/** Reads a response body to the end, reporting each chunk against `Content-Length`. */
export async function readCounted(
  response: Response,
  onProgress: (progress: TransferProgress) => void,
): Promise<Uint8Array> {
  const header = response.headers.get('content-length')
  const total = header != null && /^\d+$/.test(header) ? Number(header) : undefined

  onProgress({ loaded: 0, total })
  if (!response.body) return new Uint8Array(await response.arrayBuffer())

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    loaded += value.byteLength
    onProgress({ loaded, total })
  }

  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes
}
