import type { TransferClientErrorCode, TransferErrorBody } from './types.js'

/**
 * Shared by every s3nd error class, in every package. `Symbol.for` hands back
 * the same symbol to every copy of every module, which is the point: when an
 * application ends up with two copies of this package (one through `require`,
 * one through `import`), `instanceof` sees two unrelated classes, but both
 * copies still find this brand.
 */
const BRAND = Symbol.for('s3nd.error')

/**
 * What the protocol says no with. A client throws it when the server answered
 * with an error; the sync code helpers throw it with `INVALID_SYNC_CODE` for
 * something typed that cannot be a code, which is the same answer a server
 * would give. Separate from `@s3nd/core`'s `S3ndError` on purpose: that one
 * means "something went wrong on the server's side of S3".
 */
export class TransferError extends Error {
  readonly code: TransferClientErrorCode
  /** HTTP status the server answered with, when there was a response at all. */
  readonly status: number | undefined
  /**
   * Seconds the server asked to wait before trying again, from `retry-after`,
   * on a `RATE_LIMITED` answer that carried one.
   */
  readonly retryAfter: number | undefined

  constructor(
    code: TransferClientErrorCode,
    message: string,
    options?: { status?: number; retryAfter?: number; cause?: unknown },
  ) {
    super(message, options)
    this.name = 'TransferError'
    this.code = code
    this.status = options?.status
    this.retryAfter = options?.retryAfter
    Object.defineProperty(this, BRAND, { value: 'TransferError' })

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransferError)
    }
  }
}

/** True for a `TransferError` from any copy of this package, which `instanceof` is not. */
export function isTransferError(error: unknown): error is TransferError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<symbol, unknown>)[BRAND] === 'TransferError' &&
    (error as Error).name === 'TransferError'
  )
}

/** Narrows an unknown payload to the documented error body, when it is one. */
export function parseTransferErrorBody(payload: unknown): TransferErrorBody['error'] | undefined {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) return undefined

  const error = (payload as TransferErrorBody).error
  if (typeof error !== 'object' || error === null) return undefined
  if (typeof error.code !== 'string' || typeof error.message !== 'string') return undefined

  return error
}
