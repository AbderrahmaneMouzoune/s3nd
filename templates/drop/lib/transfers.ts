import { timingSafeEqual } from 'node:crypto'

import type { TransferMetadata } from '@s3nd/react'
import { createTransferHandler, type TransferHandler } from '@s3nd/core'

import { dropConfig } from './config'
import type { DropGuard } from './guard'
import { store } from './store'

/** Compares two strings without leaking, through timing, where they differ. */
function sameSecret(given: string | null, expected: string): boolean {
  if (given == null) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)

  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * A transfer as this deployment describes it: the protocol's metadata, plus
 * what its guard holds. The extra keys are additive, so a client that only
 * knows the protocol — the CLI, `@s3nd/react` — reads straight past them.
 */
export interface DropTransfer extends TransferMetadata {
  /** A line the sender wrote for whoever picks it up. */
  note?: string
  /** The first download burns it. */
  oneTime: boolean
  /** A password was set, and this answer is only being served because it matched. */
  protected: boolean
}

export interface HandlerOptions {
  /** Seconds this upload's transfer should live. The default when absent. */
  expiresIn?: number
  /** Overrides `DROP_RAW_MODE` for one request; a one-time code must stream. */
  raw?: 'stream' | 'redirect'
}

/**
 * One handler per distinct configuration, built on first use. Expiry is
 * decided when the handler is created, and a sender chooses among a fixed few
 * lifetimes, so this map holds a handful of entries however much traffic runs
 * through it.
 */
const handlers = new Map<string, TransferHandler>()

/**
 * The four-route transfer protocol, served by `app/api/transfers` and called
 * in-process by the pickup page. Uploading needs the password when one is
 * set; reading and burning a code never do, because the code is the secret —
 * unless the sender put a password of their own on that one transfer, which
 * the route layer checks before anything reaches this handler.
 */
export function transfers(options: HandlerOptions = {}): TransferHandler {
  const expiresIn = options.expiresIn ?? dropConfig.expiresIn
  const raw = options.raw ?? dropConfig.rawMode
  const cacheKey = `${expiresIn}:${raw}`

  let handler = handlers.get(cacheKey)

  if (!handler) {
    handler = createTransferHandler({
      bucket: store(),
      basePath: '/api/transfers',
      app: dropConfig.name,
      expiresIn,
      raw,
      authorize: (request) => {
        if (request.method !== 'POST' || !dropConfig.password) return true

        const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
        return sameSecret(bearer, dropConfig.password)
      },
    })

    handlers.set(cacheKey, handler)
  }

  return handler
}

/**
 * The canonical form of what someone typed or pasted — `k7qp-2m4x` and
 * `K7QP 2M4X` are the same code — or `null` when it cannot be one. The routes
 * need it before the handler does: a guard is stored under the canonical code.
 */
export function normalizeCode(raw: string): string | null {
  try {
    return store().codes.normalize(raw)
  } catch {
    return null
  }
}

/**
 * What a code holds, asked of the handler in-process rather than over HTTP:
 * the pickup page and its card both call this. `null` for a code that is
 * unknown, expired or malformed; anything else the bucket answers is thrown.
 *
 * It answers whoever asks: a password is enforced by the route layer and by
 * the page, not here.
 */
export async function lookupTransfer(code: string): Promise<TransferMetadata | null> {
  const response = await transfers()(new Request(`http://drop.internal/api/transfers/${encodeURIComponent(code)}`))

  if (response.status === 404 || response.status === 400) return null
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `The bucket answered ${response.status}.`)
  }

  return (await response.json()) as TransferMetadata
}

/**
 * The protocol's answer, with what the guard knows folded in: the device that
 * sent it (the protocol only records one for snapshots), the note, and the
 * two flags a receiver has to be told about.
 */
export function withGuard(meta: TransferMetadata, guard: DropGuard | null): DropTransfer {
  return {
    ...meta,
    device: meta.device ?? guard?.device,
    note: guard?.note,
    oneTime: guard?.oneTime ?? false,
    protected: guard?.password != null,
  }
}
