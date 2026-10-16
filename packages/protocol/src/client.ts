import { isTransferError, parseTransferErrorBody, TransferError } from './transfer-error.js'
import { FILENAME_HEADER, PROTOCOL_HEADER, PROTOCOL_VERSION } from './types.js'
import type { CreatedTransfer, CreateSnapshotBody, TransferMetadata } from './types.js'

export interface TransferClientConfig {
  /**
   * Where the transfer routes live, e.g. `https://drop.example.com/api/transfers`
   * or a same-origin `/api/transfers`.
   */
  baseUrl: string
  /**
   * Sent on every request — an API key, a session cookie header, a bearer
   * token. The `s3nd-protocol` header is the client's own and cannot be
   * overridden here.
   */
  headers?: Record<string, string>
  /** Swap the implementation in tests, or to add retries. Defaults to global `fetch`. */
  fetch?: typeof globalThis.fetch
  /**
   * Milliseconds a call may take, reading the response included, before it
   * rejects with a `TransferError` coded `TIMEOUT`. No limit by default. A
   * call's own `signal` still works alongside it, and still rejects with its
   * own `AbortError`.
   */
  timeout?: number
}

/** Uploading structured state: it comes back inline from `read()`. */
export interface CreateSnapshotInput extends CreateSnapshotBody {
  signal?: AbortSignal
}

/** Uploading opaque bytes: they come back from `readBytes()`. */
export interface CreateFileInput {
  /**
   * `Uint8Array` is spelled out alongside `BodyInit` on purpose: it is the
   * obvious thing to hand this method, and the DOM lib only admits it under a
   * narrower `ArrayBuffer` parameter than `TextEncoder` or `readFile` produce.
   */
  body: BodyInit | Uint8Array
  filename: string
  contentType?: string
  signal?: AbortSignal
}

export interface TransferClient {
  /** Stores application state and returns the code to carry to the other device. */
  createSnapshot(input: CreateSnapshotInput): Promise<CreatedTransfer>
  /** Stores a file and returns its code. */
  createFile(input: CreateFileInput): Promise<CreatedTransfer>
  /** What a code points at, or `null` when it is unknown or expired. */
  read(code: string, options?: { signal?: AbortSignal }): Promise<TransferMetadata | null>
  /** The bytes behind a code, or `null` when it is unknown or expired. */
  readBytes(code: string, options?: { signal?: AbortSignal }): Promise<Uint8Array | null>
  /** Burns a code. Deleting one that is already gone is not an error. */
  remove(code: string, options?: { signal?: AbortSignal }): Promise<void>
}

const TRANSFER_KINDS: readonly unknown[] = ['snapshot', 'file']

/**
 * The fields every transfer body has, checked rather than cast: a wrong
 * `baseUrl`, or a proxy answering in place of the server, should fail here
 * and say so, not surface later as a code reading "undefined".
 */
function isTransferShape(value: unknown): value is { code: string; kind: string; createdAt: string } {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.code === 'string' &&
    candidate.code.length > 0 &&
    TRANSFER_KINDS.includes(candidate.kind) &&
    typeof candidate.createdAt === 'string'
  )
}

function isJson(response: Response): boolean {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
  return type === 'application/json' || type.endsWith('+json')
}

/**
 * Reads a 2xx body that the protocol says is a transfer. An SSO login page or
 * a misrouted request answers 200 with HTML, which `response.json()` would
 * report as an unrelated `SyntaxError`.
 */
async function readTransfer<T>(response: Response, what: string): Promise<T> {
  if (!isJson(response)) {
    throw new TransferError(
      'INTERNAL',
      `Expected ${what} as JSON, but the server answered ${response.status} with ${response.headers.get('content-type') ?? 'no content type'}. Is \`baseUrl\` pointing at the transfer routes?`,
      { status: response.status },
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new TransferError('INTERNAL', `The server answered ${what} that is not valid JSON.`, {
      status: response.status,
      cause: error,
    })
  }

  if (!isTransferShape(payload)) {
    throw new TransferError(
      'INTERNAL',
      `The server answered ${what} without a string \`code\`, a known \`kind\` and a \`createdAt\`.`,
      { status: response.status },
    )
  }

  return payload as T
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

/**
 * `AbortSignal.any` where the runtime has it (Node 20.3+, every current
 * browser), and the same thing by hand on the Node 20 releases before it.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)

  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }

  return controller.signal
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

/**
 * Turns a non-2xx response into a `TransferError`, preferring the documented
 * error body and falling back to the status when the server is not one of ours.
 */
async function toTransferError(response: Response): Promise<TransferError> {
  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = undefined
  }

  const parsed = parseTransferErrorBody(payload)

  if (parsed) {
    return new TransferError(parsed.code, parsed.message, { status: response.status })
  }

  return new TransferError(
    response.status === 401 || response.status === 403 ? 'UNAUTHORIZED' : 'INTERNAL',
    `The server answered ${response.status} ${response.statusText || ''}`.trim() + '.',
    { status: response.status },
  )
}

/**
 * A client for the s3nd transfer protocol. Zero server dependencies: it
 * is `fetch` and nothing else, so it bundles for a browser, a worker, the CLI
 * or React Native alike.
 */
export function createTransferClient(config: TransferClientConfig): TransferClient {
  const doFetch = config.fetch ?? globalThis.fetch
  const baseHeaders = config.headers ?? {}

  const { timeout } = config
  if (timeout !== undefined && !(Number.isFinite(timeout) && timeout > 0)) {
    throw new TypeError('`timeout` must be a positive number of milliseconds.')
  }

  if (typeof doFetch !== 'function') {
    throw new TransferError(
      'INTERNAL',
      'No fetch implementation available. Pass one as `fetch` on createTransferClient().',
    )
  }

  async function send(path: string, init: RequestInit): Promise<Response> {
    const response = await doFetch(joinUrl(config.baseUrl, path), {
      ...init,
      headers: {
        ...baseHeaders,
        ...(init.headers as Record<string, string> | undefined),
        // Lets a server refuse a version it does not speak, rather than
        // misreading a payload whose shape it does not know.
        [PROTOCOL_HEADER]: String(PROTOCOL_VERSION),
      },
    })

    if (!response.ok) throw await toTransferError(response)

    return response
  }

  /**
   * Runs a whole call, request and response body, under `timeout`. Running
   * out answers `TIMEOUT`, which an interface shows as a failure; the caller
   * aborting is not a failure and rejects as the abort it is.
   */
  async function withTimeout<T>(
    signal: AbortSignal | undefined,
    call: (signal?: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (timeout === undefined) return call(signal)

    const deadline = new AbortController()
    const timer = setTimeout(() => deadline.abort(), timeout)

    try {
      return await call(signal ? anySignal([signal, deadline.signal]) : deadline.signal)
    } catch (error) {
      if (deadline.signal.aborted && !signal?.aborted) {
        throw new TransferError('TIMEOUT', `The server did not answer within ${timeout} ms.`, { cause: error })
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  /** 404 is a value here, not an error: an unknown code is an ordinary outcome. */
  async function sendAllowingMissing(path: string, init: RequestInit): Promise<Response | null> {
    try {
      return await send(path, init)
    } catch (error) {
      if (isTransferError(error) && error.code === 'NOT_FOUND') return null
      throw error
    }
  }

  return {
    createSnapshot(input) {
      const body: CreateSnapshotBody = { data: input.data, version: input.version, device: input.device }

      return withTimeout(input.signal, async (signal) => {
        const response = await send('', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        })

        return readTransfer<CreatedTransfer>(response, 'the created transfer')
      })
    },

    createFile(input) {
      return withTimeout(input.signal, async (signal) => {
        const response = await send('', {
          method: 'POST',
          headers: {
            'content-type': input.contentType ?? 'application/octet-stream',
            [FILENAME_HEADER]: encodeURIComponent(input.filename),
          },
          body: input.body as BodyInit,
          signal,
        })

        return readTransfer<CreatedTransfer>(response, 'the created transfer')
      })
    },

    read(code, options = {}) {
      return withTimeout(options.signal, async (signal) => {
        const response = await sendAllowingMissing(`/${encodeURIComponent(code)}`, { method: 'GET', signal })

        return response ? readTransfer<TransferMetadata>(response, 'a transfer') : null
      })
    },

    readBytes(code, options = {}) {
      return withTimeout(options.signal, async (signal) => {
        const response = await sendAllowingMissing(`/${encodeURIComponent(code)}/raw`, { method: 'GET', signal })

        return response ? new Uint8Array(await response.arrayBuffer()) : null
      })
    },

    remove(code, options = {}) {
      return withTimeout(options.signal, async (signal) => {
        await sendAllowingMissing(`/${encodeURIComponent(code)}`, { method: 'DELETE', signal })
      })
    },
  }
}
