import { createBucket, type Bucket } from '@s3nd/core'

import { dropConfig } from './config'

let bucket: Bucket | undefined

/**
 * The bucket, built on first use rather than at import time, so `next build`
 * never needs credentials: the configuration is resolved when the first
 * request arrives.
 */
export function store(): Bucket {
  bucket ??= createBucket({
    prefix: process.env.S3ND_PREFIX ?? 'drop',
    maxSize: dropConfig.maxSize,
  })

  return bucket
}
