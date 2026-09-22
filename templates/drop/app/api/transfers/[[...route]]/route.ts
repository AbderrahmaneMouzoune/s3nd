import type { CreatedTransfer, TransferMetadata } from '@s3nd/react'

import { dropConfig } from '@/lib/config'
import { hashPassphrase, isUnlocked, readGuard, removeGuard, writeGuard, type DropGuard } from '@/lib/guard'
import { PASSPHRASE_MIN_LENGTH, PROTECTED_HEADER, readSendOptions } from '@/lib/options'
import { normalizeCode, transfers, withGuard } from '@/lib/transfers'

export const dynamic = 'force-dynamic'

const BASE_PATH = '/api/transfers'

/**
 * The transfer protocol, on this deployment:
 *
 *   POST   /api/transfers            create a transfer, get the code back
 *   GET    /api/transfers/:code      metadata
 *   GET    /api/transfers/:code/raw  the bytes
 *   DELETE /api/transfers/:code      burn it
 *
 * `createTransferHandler()` answers all four. This file sits in front of it
 * and holds what belongs to this deployment rather than to the protocol: the
 * lifetime the sender chose, the password they put on this one transfer, the
 * note, and burning a one-time code once its bytes have gone out.
 *
 * The CLI works against it too:
 *   s3nd put ./file --remote https://your.drop/api/transfers --token <password>
 */

/** Everything after the mount point: `[]`, `[code]` or `[code, 'raw']`. */
function segmentsOf(request: Request): string[] {
  const { pathname } = new URL(request.url)

  return pathname
    .slice(BASE_PATH.length)
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(decodeURIComponent)
}

const STATUS = { INVALID_REQUEST: 400, UNAUTHORIZED: 401, INTERNAL: 500 } as const

function fail(code: keyof typeof STATUS, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message } }, { status: STATUS[code], headers })
}

/**
 * The answer a protected code gives to a request that has not proved it knows
 * the password. The header is what tells the pickup page to ask for one
 * rather than to report a failure: the code itself exists, and whoever holds
 * it already knows that much.
 */
function locked(): Response {
  return fail('UNAUTHORIZED', 'This transfer is protected by a password.', { [PROTECTED_HEADER]: '1' })
}

/** Creating a transfer: the sender's options, then the handler, then the guard. */
async function create(request: Request): Promise<Response> {
  const options = readSendOptions(request, dropConfig)

  if (options.passphrase && options.passphrase.length < PASSPHRASE_MIN_LENGTH) {
    return fail('INVALID_REQUEST', `A password must be at least ${PASSPHRASE_MIN_LENGTH} characters.`)
  }

  const response = await transfers({ expiresIn: options.expiresIn })(request)
  if (response.status !== 201) return response

  const created = (await response.json()) as CreatedTransfer

  const guard: DropGuard = {
    device: options.device,
    note: options.note,
    oneTime: options.oneTime,
    password: options.passphrase ? await hashPassphrase(options.passphrase) : undefined,
  }

  // Nothing to remember: most uploads — every CLI one — land here.
  if (!guard.device && !guard.note && !guard.oneTime && !guard.password) {
    return Response.json(created, { status: 201 })
  }

  try {
    await writeGuard(created.code, guard, options.expiresIn)
  } catch {
    // The bytes are in the bucket but the password that was meant to cover
    // them is not. Burn the transfer rather than hand back a code that is
    // less protected than the sender asked for.
    await burn(created.code).catch(() => undefined)

    return fail('INTERNAL', 'The transfer was written but its options were not, so it has been burned. Try again.')
  }

  return Response.json(created, { status: 201 })
}

/** Reading the metadata: the protocol's answer, with the guard folded in. */
async function describe(request: Request, guard: DropGuard | null): Promise<Response> {
  const response = await transfers()(request)
  if (!response.ok) return response

  return Response.json(withGuard((await response.json()) as TransferMetadata, guard))
}

/**
 * Serving the bytes. A one-time code is streamed whatever `DROP_RAW_MODE`
 * says — a presigned redirect would hand out a URL that outlives the burn —
 * and the transfer goes as soon as the body has been read out of the bucket.
 */
async function serveRaw(request: Request, code: string, guard: DropGuard | null): Promise<Response> {
  if (!guard?.oneTime) return transfers()(request)

  const response = await transfers({ raw: 'stream' })(request)
  if (!response.ok) return response

  const bytes = await response.arrayBuffer()
  await burn(code)

  return new Response(bytes, { status: 200, headers: response.headers })
}

/** Burns a code: the transfer, then the guard that described it. */
async function burn(code: string): Promise<void> {
  await transfers()(new Request(`http://drop.internal${BASE_PATH}/${code}`, { method: 'DELETE' }))
  await removeGuard(code)
}

async function route(request: Request): Promise<Response> {
  const [rawCode, tail] = segmentsOf(request)

  if (rawCode === undefined) {
    return request.method === 'POST' ? create(request) : transfers()(request)
  }

  // An unreadable code never reaches the bucket: the handler answers for it,
  // in the protocol's own words.
  const code = normalizeCode(rawCode)
  if (code === null) return transfers()(request)

  const guard = await readGuard(code)

  if (!(await isUnlocked(code, guard, request))) return locked()

  if (tail === 'raw') return serveRaw(request, code, guard)

  if (tail === undefined && request.method === 'GET') return describe(request, guard)

  if (tail === undefined && request.method === 'DELETE') {
    const response = await transfers()(request)
    if (response.ok || response.status === 204) await removeGuard(code)

    return response
  }

  return transfers()(request)
}

export const GET = route
export const POST = route
export const DELETE = route
