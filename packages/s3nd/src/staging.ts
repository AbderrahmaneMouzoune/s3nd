import { CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

import type { Bucket } from './bucket.js'
import { encodeKey, joinKey } from './key.js'

/**
 * The two raw S3 calls a presigned upload's completion needs, kept out of the
 * `Bucket` surface: they work on full object paths, which is what moving an
 * object between the pending namespace and the live one is about.
 */

export interface ObjectHead {
  size?: number
  contentType?: string
  lastModified?: Date
  metadata: Record<string, string>
}

function isNotFound(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  return (
    candidate?.name === 'NoSuchKey' || candidate?.name === 'NotFound' || candidate?.$metadata?.httpStatusCode === 404
  )
}

/** The full object path of a key under the bucket-level prefix. */
export function pathOf(bucket: Bucket, key: string): string {
  return joinKey(bucket.prefix, key)
}

export async function headObject(bucket: Bucket, path: string): Promise<ObjectHead | null> {
  try {
    const response = await bucket.client.send(new HeadObjectCommand({ Bucket: bucket.bucket, Key: path }))

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata ?? {},
    }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** A server-side copy that replaces the metadata, so none of the pending bookkeeping survives. */
export async function copyObject(
  bucket: Bucket,
  from: string,
  to: string,
  replace: { contentType?: string; cacheControl?: string; metadata: Record<string, string> },
): Promise<void> {
  await bucket.client.send(
    new CopyObjectCommand({
      Bucket: bucket.bucket,
      Key: to,
      CopySource: `${bucket.bucket}/${encodeKey(from)}`,
      MetadataDirective: 'REPLACE',
      ContentType: replace.contentType,
      CacheControl: replace.cacheControl,
      Metadata: replace.metadata,
    }),
  )
}
