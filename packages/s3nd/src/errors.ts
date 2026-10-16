/**
 * Shared by every s3nd error class, in every package. `Symbol.for` hands back
 * the same symbol to every copy of every module, which is the point: when an
 * application ends up with two copies of a package (one through `require`,
 * one through `import`), `instanceof` sees two unrelated classes, but both
 * copies still find this brand.
 */
const BRAND = Symbol.for('s3nd.error')

/**
 * Every error `@s3nd/core` throws is a `S3ndError` carrying a stable `code`,
 * so callers can branch on it without string-matching messages. It means
 * "something went wrong on this side": a configuration, a key, a body, a call
 * to S3. An answer from a transfer server is a `TransferError` instead.
 */
export type S3ndErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_KEY'
  | 'INVALID_BODY'
  | 'MISSING_CONTENT_LENGTH'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED'
  | 'GET_FAILED'
  | 'DELETE_FAILED'
  | 'LIST_FAILED'
  | 'COPY_FAILED'
  | 'URL_FAILED'
  | 'PRECONDITION_FAILED'
  | 'CONDITIONAL_WRITE_UNSUPPORTED'
  | 'INVALID_SNAPSHOT'
  | 'SNAPSHOT_TOO_NEW'

export class S3ndError extends Error {
  readonly code: S3ndErrorCode

  constructor(code: S3ndErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'S3ndError'
    this.code = code
    Object.defineProperty(this, BRAND, { value: 'S3ndError' })

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, S3ndError)
    }
  }
}

/** True for a `S3ndError` from any copy of this package, which `instanceof` is not. */
export function isS3ndError(error: unknown): error is S3ndError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<symbol, unknown>)[BRAND] === 'S3ndError' &&
    (error as Error).name === 'S3ndError'
  )
}
