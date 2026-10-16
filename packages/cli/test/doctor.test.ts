import { describe, expect, it, vi } from 'vitest'

import { createBucket } from '@s3nd/core'
import type { S3Client } from '@aws-sdk/client-s3'

import { conformanceChecks, runChecks, toChecks, type Check } from '../src/doctor.js'

/**
 * A stand-in shaped to exactly what `doctor` exercises: the three object verbs,
 * HeadBucket, and the lifecycle configuration. Purpose-built rather than shared
 * with the core package's test helpers, so the CLI's tests do not depend on
 * another package's test internals.
 */
function createDoctorClient() {
  const objects = new Map<string, Buffer>()
  let lifecycle: Record<string, any>[] | undefined
  let cors: Record<string, any>[] | undefined

  const send = vi.fn(async (command: any) => {
    const name = command.constructor.name
    const { Key, Body } = command.input ?? {}

    if (name === 'HeadBucketCommand') return {}

    if (name === 'PutObjectCommand') {
      objects.set(Key, Buffer.from(Body))
      return { ETag: '"etag"' }
    }

    if (name === 'GetObjectCommand') {
      const stored = objects.get(Key)
      if (!stored) {
        throw Object.assign(new Error('missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } })
      }

      return {
        Body: {
          transformToByteArray: async () => stored,
          transformToString: async () => stored.toString('utf8'),
        },
        ContentType: 'text/plain',
        ContentLength: stored.byteLength,
        Metadata: {},
        ETag: '"etag"',
      }
    }

    if (name === 'DeleteObjectCommand') {
      objects.delete(Key)
      return {}
    }

    if (name === 'GetBucketLifecycleConfigurationCommand') {
      if (lifecycle === undefined) {
        throw Object.assign(new Error('none'), {
          name: 'NoSuchLifecycleConfiguration',
          $metadata: { httpStatusCode: 404 },
        })
      }

      return { Rules: lifecycle }
    }

    if (name === 'GetBucketCorsCommand') {
      if (cors === undefined) {
        throw Object.assign(new Error('none'), { name: 'NoSuchCORSConfiguration', $metadata: { httpStatusCode: 404 } })
      }

      return { CORSRules: cors }
    }

    throw new Error(`Unexpected command: ${name}`)
  })

  return {
    client: {
      send,
      destroy: vi.fn(),
      config: {
        region: 'eu-west-3',
        credentials: async () => ({ accessKeyId: 'AKIAEXAMPLE1234', secretAccessKey: 'secret' }),
      },
    } as unknown as S3Client,
    objects,
    setLifecycle(rules: Record<string, any>[] | undefined) {
      lifecycle = rules
    },
    setCors(rules: Record<string, any>[] | undefined) {
      cors = rules
    },
  }
}

function find(checks: Check[], name: string): Check {
  const check = checks.find((candidate) => candidate.name === name)
  if (!check) throw new Error(`No check named "${name}" in: ${checks.map((c) => c.name).join(', ')}`)

  return check
}

describe('runChecks', () => {
  it('reports a healthy bucket', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([{ Status: 'Enabled', Expiration: { Days: 2 }, Filter: { Prefix: '' } }])
    memory.setCors([{ AllowedMethods: ['GET', 'PUT'], AllowedOrigins: ['https://app.example'], AllowedHeaders: ['*'] }])

    const checks = await runChecks(createBucket({ bucket: 'transfers', client: memory.client }))

    expect(checks.every((check) => check.status === 'ok')).toBe(true)
    expect(find(checks, 'Configuration').detail).toContain('transfers')
    expect(find(checks, 'Expiry cleanup').detail).toContain('2 day')
  })

  it('never prints the whole access key', async () => {
    const memory = createDoctorClient()
    const checks = await runChecks(createBucket({ bucket: 'transfers', client: memory.client }))

    const detail = find(checks, 'Credentials').detail
    expect(detail).toContain('1234')
    expect(detail).not.toContain('AKIAEXAMPLE')
  })

  it('leaves no probe object behind', async () => {
    const memory = createDoctorClient()
    await runChecks(createBucket({ bucket: 'transfers', client: memory.client }))

    expect(memory.objects.size).toBe(0)
  })

  it('warns when nothing will ever delete an expired transfer', async () => {
    const memory = createDoctorClient()
    // setLifecycle was never called: the bucket has no configuration at all.
    const checks = await runChecks(createBucket({ bucket: 'transfers', client: memory.client }))

    const lifecycle = find(checks, 'Expiry cleanup')
    expect(lifecycle.status).toBe('warn')
    expect(lifecycle.fix).toContain('lifecycle rule')
  })

  it('warns when the rules exist but miss the prefix in use', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([{ Status: 'Enabled', Expiration: { Days: 1 }, Filter: { Prefix: 'somewhere-else/' } }])

    const checks = await runChecks(
      createBucket({ bucket: 'transfers', prefix: 'snapshots', client: memory.client }),
      'snapshots',
    )

    expect(find(checks, 'Expiry cleanup').status).toBe('warn')
  })

  it('accepts a rule whose prefix covers the one in use', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([{ Status: 'Enabled', Expiration: { Days: 1 }, Filter: { Prefix: 'snap' } }])

    const checks = await runChecks(
      createBucket({ bucket: 'transfers', prefix: 'snapshots', client: memory.client }),
      'snapshots',
    )

    expect(find(checks, 'Expiry cleanup').status).toBe('ok')
  })

  it('reads the prefix of a rule filtered with And', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([
      {
        Status: 'Enabled',
        Expiration: { Days: 1 },
        Filter: { And: { Prefix: 'transfers/', ObjectSizeGreaterThan: 0 } },
      },
    ])

    const checks = await runChecks(
      createBucket({ bucket: 'b', prefix: 'transfers', client: memory.client }),
      'transfers',
    )

    expect(find(checks, 'Expiry cleanup')).toMatchObject({ status: 'ok', detail: 'expires after 1 day(s)' })
  })

  it('does not read an And rule on another prefix as covering the whole bucket', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([
      { Status: 'Enabled', Expiration: { Days: 1 }, Filter: { And: { Prefix: 'logs/', ObjectSizeLessThan: 10 } } },
    ])

    const checks = await runChecks(createBucket({ bucket: 'b', client: memory.client }))

    expect(find(checks, 'Expiry cleanup').status).toBe('warn')
  })

  it('treats a rule filtered by tag as not covering, and says why', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([
      { Status: 'Enabled', Expiration: { Days: 1 }, Filter: { Tag: { Key: 'temp', Value: 'yes' } } },
      {
        Status: 'Enabled',
        Expiration: { Days: 1 },
        Filter: { And: { Prefix: 'transfers/', Tags: [{ Key: 'temp', Value: 'yes' }] } },
      },
    ])

    const checks = await runChecks(
      createBucket({ bucket: 'b', prefix: 'transfers', client: memory.client }),
      'transfers',
    )

    const lifecycle = find(checks, 'Expiry cleanup')
    expect(lifecycle.status).toBe('warn')
    expect(lifecycle.detail).toContain('tags')
    expect(lifecycle.fix).toContain('Leave tags out')
  })

  it('matches a rule prefix with or without its trailing slash', async () => {
    for (const [rulePrefix, configured] of [
      ['transfers/', 'transfers'],
      ['transfers', 'transfers/'],
      ['transfers/', '/transfers/'],
    ]) {
      const memory = createDoctorClient()
      memory.setLifecycle([{ Status: 'Enabled', Expiration: { Days: 1 }, Filter: { Prefix: rulePrefix } }])

      const checks = await runChecks(
        createBucket({ bucket: 'b', prefix: configured, client: memory.client }),
        configured,
      )

      expect(find(checks, 'Expiry cleanup').status, `${rulePrefix} vs ${configured}`).toBe('ok')
    }
  })

  it('does not take a sibling prefix for the one in use', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([{ Status: 'Enabled', Expiration: { Days: 1 }, Filter: { Prefix: 'transfers-old/' } }])

    const checks = await runChecks(
      createBucket({ bucket: 'b', prefix: 'transfers', client: memory.client }),
      'transfers',
    )

    expect(find(checks, 'Expiry cleanup').status).toBe('warn')
  })

  it('ignores a disabled rule', async () => {
    const memory = createDoctorClient()
    memory.setLifecycle([{ Status: 'Disabled', Expiration: { Days: 1 }, Filter: { Prefix: '' } }])

    const checks = await runChecks(createBucket({ bucket: 'transfers', client: memory.client }))

    expect(find(checks, 'Expiry cleanup').status).toBe('warn')
  })

  it('stops at the first blocking failure instead of cascading', async () => {
    const client = { send: async () => ({}), destroy: () => {} } as never
    const checks = await runChecks(createBucket({ bucket: 'transfers', client }))

    // No credentials provider on this client, so nothing past that is meaningful.
    expect(find(checks, 'Credentials').status).toBe('fail')
    expect(checks.some((check) => check.name === 'Bucket reachable')).toBe(false)
  })

  it('warns when no CORS rule lets a browser PUT', async () => {
    const memory = createDoctorClient()

    const missing = find(
      await runChecks(createBucket({ bucket: 'transfers', client: memory.client })),
      'Browser uploads (CORS)',
    )
    memory.setCors([{ AllowedMethods: ['GET'], AllowedOrigins: ['*'], AllowedHeaders: ['*'] }])
    const getOnly = find(
      await runChecks(createBucket({ bucket: 'transfers', client: memory.client })),
      'Browser uploads (CORS)',
    )
    memory.setCors([{ AllowedMethods: ['PUT'], AllowedOrigins: ['*'], AllowedHeaders: ['Content-Type'] }])
    const allowed = find(
      await runChecks(createBucket({ bucket: 'transfers', client: memory.client })),
      'Browser uploads (CORS)',
    )

    expect(missing).toMatchObject({ status: 'warn', detail: 'no CORS configuration' })
    expect(missing.fix).toContain('presign')
    expect(getOnly.status).toBe('warn')
    expect(allowed.status).toBe('ok')
  })
})

describe('doctor --conformance', () => {
  it('turns the report into checks, a skipped rule not failing doctor', () => {
    const checks = toChecks([
      { name: 'Server', status: 'pass', detail: 'files: proxy' },
      { name: 'Expiry', status: 'fail', detail: 'GET /:code once expired: expected 404' },
      { name: 'Cross-origin requests', status: 'skip', detail: 'pass `server.cors.origin`' },
    ])

    expect(checks).toEqual([
      { name: 'Conformance: Server', status: 'ok', detail: 'files: proxy' },
      { name: 'Conformance: Expiry', status: 'fail', detail: 'GET /:code once expired: expected 404' },
      { name: 'Conformance: Cross-origin requests', status: 'skip', detail: 'pass `server.cors.origin`' },
    ])
  })

  it('reports a server that does not answer as a failed check, not a crash', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })

    const checks = await conformanceChecks({ baseUrl: 'http://drop.test/api/transfers', fetch })

    expect(checks[0]).toMatchObject({ name: 'Conformance: Server', status: 'fail' })
    expect(checks.slice(1).every((check) => check.status === 'skip')).toBe(true)
  })
})
