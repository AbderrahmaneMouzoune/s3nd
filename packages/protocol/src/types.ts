/**
 * The wire contract between a s3nd server and anything that talks to it —
 * a browser, the CLI, another service.
 *
 * It is deliberately small and framework-free. `createTransferHandler()` is one
 * implementation of this contract, but the point of writing it down is that it
 * is not the only possible one: a Rails or Go backend that answers these four
 * routes works with every s3nd client, and the CLI pointed at `--remote`
 * cannot tell the difference.
 *
 * Nothing in this directory may import the AWS SDK. That is what keeps the
 * contract and its client safe to bundle for a browser.
 */

/**
 * Bumped only when the routes or payloads below change shape. Additions that
 * an older peer can ignore (a new optional field, a new error code) do not
 * bump it. `PROTOCOL.md` next to this package is the normative text.
 */
export const PROTOCOL_VERSION = 1

/**
 * Carries `PROTOCOL_VERSION` both ways: a client sends it on every request, a
 * server sets it on every response, errors included. A server refuses a
 * request announcing a version it does not speak, and accepts one without the
 * header, which is how a 0.x client talks.
 */
export const PROTOCOL_HEADER = 's3nd-protocol'

/** Header a raw upload uses to carry the original filename. */
export const FILENAME_HEADER = 'x-s3nd-filename'

/**
 * What sits behind a code.
 *
 * `snapshot` is structured application state — JSON, handed back inline,
 * which is what a local-first app restoring an IndexedDB database wants.
 * `file` is opaque bytes, fetched separately from `/:code/raw`.
 */
export type TransferKind = 'snapshot' | 'file'

/**
 * Stable error codes. A client branches on these rather than on status codes
 * or message text.
 *
 * `NOT_FOUND` deliberately covers an expired code as well as one that never
 * existed: telling them apart would let someone probe which codes have been
 * used.
 */
export type TransferErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_SYNC_CODE'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CODE_TAKEN'
  | 'SNAPSHOT_TOO_NEW'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_PROTOCOL'
  | 'INTERNAL'

/** The body of every non-2xx response. */
export interface TransferErrorBody {
  error: {
    code: TransferErrorCode
    message: string
  }
}

/** 201 body of `POST /`. */
export interface CreatedTransfer {
  code: string
  kind: TransferKind
  createdAt: string
  /** ISO date, absent when the transfer does not expire. */
  expiresAt?: string
  /** Stored size in bytes, after compression for snapshots. */
  size?: number
}

/** 200 body of `GET /:code`. */
export interface TransferMetadata {
  code: string
  kind: TransferKind
  createdAt: string
  expiresAt?: string
  /** Free label for the device that wrote it. */
  device?: string
  /** The writing application's name. */
  app?: string
  /** The writing application's schema version. */
  version?: number
  size?: number
  /** Only for `kind: 'file'`. */
  filename?: string
  /** Only for `kind: 'file'`. */
  contentType?: string
  /** Only for `kind: 'snapshot'` — the state, inline. */
  data?: unknown
}

/** Body of `POST /` when creating a snapshot (`Content-Type: application/json`). */
export interface CreateSnapshotBody {
  data: unknown
  /** Your schema version, so a restoring device can refuse data it cannot read. */
  version?: number
  device?: string
}

/**
 * How a server accepts files. `proxy` takes the bytes in `POST /`; `presign`
 * hands out a URL for the client to send them straight to the bucket; `both`
 * does either. Snapshots always go through `POST /`. See `PROTOCOL.md`.
 */
export type UploadMode = 'proxy' | 'presign' | 'both'

/** Body of `POST /` asking for a presigned upload (`Content-Type: application/json`). */
export interface PresignUploadBody {
  upload: 'presign'
  filename: string
  /** The exact byte size that will be sent. The bucket refuses any other. */
  size: number
  contentType?: string
}

/** 201 body of `POST /` for a presigned upload. */
export interface PresignedUpload {
  /** The transfer's code. Until `POST /:code/complete` it reads as `NOT_FOUND`. */
  code: string
  /** Where to send the bytes. */
  uploadUrl: string
  method: 'PUT'
  /** Headers to send with the bytes, exactly. `Content-Length` comes on top. */
  headers: Record<string, string>
  /** When `uploadUrl` stops being accepted — not the transfer's own expiry. */
  expiresAt: string
}

/** How far a transfer has got. `total` is absent when the size is unknown. */
export interface TransferProgress {
  loaded: number
  total?: number
}

/** The HTTP status each error code answers with. */
export const TRANSFER_ERROR_STATUS: Record<TransferErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_SYNC_CODE: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CODE_TAKEN: 409,
  SNAPSHOT_TOO_NEW: 409,
  TOO_LARGE: 413,
  UNSUPPORTED_PROTOCOL: 400,
  INTERNAL: 500,
}
