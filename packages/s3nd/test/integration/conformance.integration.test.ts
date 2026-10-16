import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createBucket, type Bucket } from '../../src/bucket.js'
import { createTransferHandler } from '../../src/handler.js'
import { runConformance } from '@s3nd/protocol/conformance'

/**
 * The conformance suite against the handler on a real S3-compatible server:
 * presigned URLs signed for MinIO and sent to it, conditional writes, real
 * object metadata. Skipped without S3ND_TEST_ENDPOINT, like the rest of this
 * directory.
 */
const endpoint = process.env.S3ND_TEST_ENDPOINT
const credentials = {
  accessKeyId: process.env.S3ND_TEST_ACCESS_KEY ?? 'minioadmin',
  secretAccessKey: process.env.S3ND_TEST_SECRET_KEY ?? 'minioadmin',
}
const name = `s3nd-conformance-${randomUUID().slice(0, 8)}`
const BASE = 'http://drop.test/api/transfers'

describe.skipIf(!endpoint)('runConformance against createTransferHandler on a real bucket', () => {
  let bucket: Bucket

  beforeAll(async () => {
    const admin = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials })
    await admin.send(new CreateBucketCommand({ Bucket: name }))
    admin.destroy()

    bucket = createBucket({ bucket: name, endpoint, credentials, prefix: 'transfers', maxSize: 64 * 1024 })
  })

  afterAll(() => bucket?.destroy())

  it('keeps every rule of PROTOCOL.md', async () => {
    const handler = createTransferHandler({
      bucket,
      expiresIn: 2,
      upload: 'both',
      protectDelete: true,
      cors: { origin: ['https://app.test'] },
    })

    // The routes are served in process; the presigned PUT goes to MinIO.
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init)
      return new URL(request.url).origin === new URL(BASE).origin ? handler(request) : globalThis.fetch(request)
    }

    const report = await runConformance({
      baseUrl: BASE,
      fetch,
      server: {
        expiresIn: 2,
        maxSize: 64 * 1024,
        upload: 'both',
        protectDelete: true,
        cors: { origin: 'https://app.test' },
      },
    })

    expect(report.filter((result) => result.status === 'fail')).toEqual([])
    expect(report.find((result) => result.name === 'Presigned uploads')?.status).toBe('pass')
  })
})
