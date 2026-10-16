export { Bucket, createBucket } from './bucket.js'
export { createTransferHandler } from './handler.js'
export type { TransferHandler, TransferHandlerConfig } from './handler.js'

export { S3ndError, isS3ndError, type S3ndErrorCode } from './errors.js'

/**
 * Re-exported from `@s3nd/protocol`, which owns them, so a server imports from
 * one package only. A sync code that cannot be read throws `TransferError`
 * with `INVALID_SYNC_CODE`, the same error a client gets from the server, and
 * the handler answers it as is.
 */
export {
  TransferError,
  createSyncCode,
  createSyncCodes,
  isTransferError,
  normalizeSyncCode,
  syncCodeAlphabets,
  type TransferErrorCode,
} from '@s3nd/protocol'

export type {
  BucketConfig,
  BucketCredentials,
  CopyOptions,
  CopyResult,
  DeleteOptions,
  DeleteSnapshotOptions,
  GetOptions,
  GetSnapshotOptions,
  GetUrlOptions,
  HasSnapshotOptions,
  HeadOptions,
  ListedObject,
  ListOptions,
  PresignedPut,
  PresignUploadOptions,
  PutOptions,
  PutSnapshotOptions,
  Snapshot,
  SnapshotEnvelope,
  SnapshotResult,
  StoredFile,
  StoredFileInfo,
  SyncCodeOptions,
  SyncCodes,
  UploadBody,
  UploadOptions,
  UploadResult,
} from './types.js'
