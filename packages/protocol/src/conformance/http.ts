import {
  DELETE_TOKEN_HEADER,
  FILENAME_HEADER,
  PROTOCOL_HEADER,
  PROTOCOL_VERSION,
  TRANSFER_ERROR_STATUS,
  type CreatedTransfer,
  type TransferErrorCode,
} from '../types.js'

/**
 * Thrown by an assertion: the server answered, and the answer breaks a rule of
 * `PROTOCOL.md`. Its message is what the report shows, so it names the request
 * and the rule rather than a stack.
 */
export class Violation extends Error {}

/** Thrown when a check does not apply to this server; the message says why. */
export class Skip extends Error {}

/** Everything a check needs to talk to the server under test. */
export interface Probe {
  /** The base URL, without a trailing slash. */
  base: string
  /** Sent on every request to the server, never to the bucket. */
  headers: Record<string, string>
  fetch: typeof globalThis.fetch
  timeout: number
}

export interface CallInit {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
  /**
   * The `s3nd-protocol` value to send. `null` sends none, as a 0.x client
   * does. Defaults to the version this package speaks.
   */
  protocol?: string | null
  /** Leave the probe's own headers (its credentials) out, as a browser preflight does. */
  bare?: boolean
}

/**
 * One request to the server under test. Every answer it produces must carry
 * the version header (section 2.1), so that is checked here, once, for all of
 * them.
 */
export async function call(probe: Probe, path: string, init: CallInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.bare ? {} : probe.headers), ...init.headers }
  const protocol = init.protocol === undefined ? String(PROTOCOL_VERSION) : init.protocol
  if (protocol !== null) headers[PROTOCOL_HEADER] = protocol

  const method = init.method ?? 'GET'
  const response = await probe.fetch(`${probe.base}${path}`, {
    method,
    headers,
    body: init.body,
    // A 302 from /raw is the server's own answer; following it would check
    // the bucket's response instead.
    redirect: 'manual',
    signal: AbortSignal.timeout(probe.timeout),
  })

  const version = response.headers.get(PROTOCOL_HEADER)
  if (version !== String(PROTOCOL_VERSION)) {
    throw new Violation(
      `${method} ${path || '/'} answered ${response.status} without \`${PROTOCOL_HEADER}: ${PROTOCOL_VERSION}\`` +
        (version === null ? '' : ` (it sent "${version}")`) +
        ' (section 2.1)',
    )
  }

  return response
}

/** What the response says, for a message: its status and the start of its body. */
async function describe(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  const body = text.length > 160 ? `${text.slice(0, 160)}…` : text
  return body ? `${response.status} ${body}` : String(response.status)
}

export async function expectStatus(response: Response, status: number, what: string): Promise<void> {
  if (response.status !== status) {
    throw new Violation(`${what}: expected ${status}, got ${await describe(response)}`)
  }
}

export async function expectJson(response: Response, status: number, what: string): Promise<Record<string, unknown>> {
  await expectStatus(response, status, what)

  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) throw new Violation(`${what}: content-type is "${type}", not JSON`)

  const body: unknown = await response.json().catch(() => undefined)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Violation(`${what}: the body is not a JSON object`)
  }

  return body as Record<string, unknown>
}

/**
 * The error contract, all of it: the status that code maps to (section 6.2),
 * a JSON body, and the `{ error: { code, message } }` shape (section 6.1).
 */
export async function expectError(response: Response, code: TransferErrorCode, what: string): Promise<void> {
  const status = TRANSFER_ERROR_STATUS[code]
  if (response.status !== status) {
    throw new Violation(`${what}: expected ${status} ${code}, got ${await describe(response)}`)
  }

  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) {
    throw new Violation(`${what}: the ${status} has content-type "${type}"; an error body is JSON (section 6.1)`)
  }

  const body = (await response.json().catch(() => undefined)) as { error?: { code?: unknown; message?: unknown } }
  const error = body?.error
  if (typeof error?.code !== 'string' || typeof error.message !== 'string') {
    throw new Violation(`${what}: the body is not { error: { code, message } } (section 6.1)`)
  }

  if (error.code !== code) throw new Violation(`${what}: expected error code ${code}, got ${error.code}`)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

export function isDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))
}

/** The `201` of `POST /` and of `POST /:code/complete` (sections 5.1 and 8.6). */
export function expectCreated(body: Record<string, unknown>, kind: 'snapshot' | 'file', what: string): CreatedTransfer {
  if (typeof body.code !== 'string' || body.code.length === 0) throw new Violation(`${what}: no \`code\``)
  if (body.kind !== kind) throw new Violation(`${what}: \`kind\` is ${JSON.stringify(body.kind)}, not "${kind}"`)
  if (!isDate(body.createdAt)) throw new Violation(`${what}: \`createdAt\` is not an ISO 8601 date`)
  if (body.expiresAt !== undefined && !isDate(body.expiresAt)) {
    throw new Violation(`${what}: \`expiresAt\` is present but not an ISO 8601 date`)
  }
  if (body.size !== undefined && !(Number.isInteger(body.size) && (body.size as number) >= 0)) {
    throw new Violation(`${what}: \`size\` is present but not a whole number`)
  }
  if (body.deleteToken !== undefined && typeof body.deleteToken !== 'string') {
    throw new Violation(`${what}: \`deleteToken\` is present but not a string`)
  }

  return body as unknown as CreatedTransfer
}

export function json(body: unknown): CallInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export function file(bytes: Uint8Array, filename: string, contentType = 'application/octet-stream'): CallInit {
  return {
    method: 'POST',
    headers: { 'content-type': contentType, [FILENAME_HEADER]: encodeURIComponent(filename) },
    body: bytes as BodyInit,
  }
}

/** A `DELETE /:code`, with the transfer's token when there is one. */
export function burn(probe: Probe, code: string, deleteToken?: string): Promise<Response> {
  return call(probe, `/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: deleteToken ? { [DELETE_TOKEN_HEADER]: deleteToken } : {},
  })
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((byte, index) => byte === b[index])
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
