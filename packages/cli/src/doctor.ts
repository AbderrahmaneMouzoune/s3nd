import { GetBucketCorsCommand, GetBucketLifecycleConfigurationCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

import type { Bucket } from '@s3nd/core'

export type CheckStatus = 'ok' | 'warn' | 'fail'

export interface Check {
  name: string
  status: CheckStatus
  detail: string
  /** What to do about it, when there is something to do. */
  fix?: string
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The failures this catches are the ones that cost an afternoon: credentials
 * that resolve to nothing, a region the endpoint disagrees with, and — the one
 * nobody discovers until a bucket has silently filled up for months — expiring
 * transfers with no lifecycle rule to actually delete them.
 */
export async function runChecks(bucket: Bucket, prefix?: string): Promise<Check[]> {
  const checks: Check[] = []

  const client = bucket.client
  // A caller can hand in their own S3Client, which need not expose `config` the
  // way the SDK's does — so nothing here assumes it is there.
  const config = (client as unknown as { config?: Record<string, unknown> }).config
  const region = await resolve(config?.region)
  const endpoint = await resolveEndpoint(config?.endpoint)

  // The name an older `s3nd init` wrote when it was not given one. It is
  // never the bucket anybody meant, and every check after this would only
  // say so less clearly.
  if (bucket.bucket === 'my-bucket') {
    checks.push({
      name: 'Configuration',
      status: 'fail',
      detail: 'bucket "my-bucket" is a placeholder, not a bucket you created',
      fix: 'Run `s3nd setup` to answer with the real one.',
    })

    return checks
  }

  checks.push({
    name: 'Configuration',
    status: 'ok',
    detail: [`bucket "${bucket.bucket}"`, region ? `region "${region}"` : undefined, endpoint]
      .filter(Boolean)
      .join(', '),
  })

  // The SDK resolves credentials lazily, so a missing profile only surfaces on
  // the first call. Forcing it here turns that into a named check.
  let hasCredentials = false
  try {
    const provider = config?.credentials
    if (typeof provider !== 'function') throw new Error('the client exposes no credentials provider')

    const credentials = (await provider()) as { accessKeyId?: string }
    hasCredentials = Boolean(credentials?.accessKeyId)

    checks.push({
      name: 'Credentials',
      status: hasCredentials ? 'ok' : 'fail',
      detail: hasCredentials
        ? `resolved, key ends in ${credentials.accessKeyId!.slice(-4)}`
        : 'the provider chain returned nothing',
      fix: hasCredentials
        ? undefined
        : 'Run `s3nd setup` to save keys for this machine, or export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    })
  } catch (error) {
    checks.push({
      name: 'Credentials',
      status: 'fail',
      detail: describe(error),
      fix: 'Run `s3nd setup` to save keys for this machine, or export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    })
  }

  if (!hasCredentials) return checks

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket.bucket }))
    checks.push({ name: 'Bucket reachable', status: 'ok', detail: 'HeadBucket succeeded' })
  } catch (error) {
    checks.push({
      name: 'Bucket reachable',
      status: 'fail',
      detail: describe(error),
      fix: 'Check the bucket name, the region, and that these credentials can see it.',
    })

    return checks
  }

  // A permissions check that actually exercises the three verbs s3nd
  // needs, rather than trusting a policy document to say what it means.
  const probeKey = `__s3nd-doctor/${randomUUID()}`
  try {
    await bucket.put(probeKey, 's3nd doctor', { contentType: 'text/plain' })
    const readBack = await bucket.get(probeKey)
    const body = readBack ? await readBack.text() : undefined
    await bucket.delete(probeKey)

    checks.push({
      name: 'Write, read, delete',
      status: body === 's3nd doctor' ? 'ok' : 'fail',
      detail: body === 's3nd doctor' ? 'round-tripped a probe object' : 'the probe did not read back intact',
    })
  } catch (error) {
    checks.push({
      name: 'Write, read, delete',
      status: 'fail',
      detail: describe(error),
      fix: 'Grant s3:PutObject, s3:GetObject and s3:DeleteObject on this bucket.',
    })
  }

  checks.push(await checkLifecycle(bucket, prefix))
  checks.push(await checkCors(bucket))

  return checks
}

const CORS_FIX =
  'Only needed for presigned uploads from a browser (`upload: "presign"` on the handler): add a CORS rule ' +
  "allowing PUT from your app's origin, with the content-type header. See https://doc.s3nd.sh/docs/server."

/**
 * A presigned upload sends the bytes from the browser straight to the bucket,
 * which the browser only allows when the bucket answers the preflight. Without
 * a rule, every upload fails with nothing but "network error" to go on.
 */
async function checkCors(bucket: Bucket): Promise<Check> {
  try {
    const response = await bucket.client.send(new GetBucketCorsCommand({ Bucket: bucket.bucket }))

    const allowsPut = (response.CORSRules ?? []).some(
      (rule) =>
        (rule.AllowedMethods ?? []).some((method) => method.toUpperCase() === 'PUT') &&
        (rule.AllowedHeaders ?? []).some((header) => header === '*' || header.toLowerCase() === 'content-type'),
    )

    return allowsPut
      ? { name: 'Browser uploads (CORS)', status: 'ok', detail: 'a CORS rule allows PUT with content-type' }
      : { name: 'Browser uploads (CORS)', status: 'warn', detail: 'no CORS rule allows PUT', fix: CORS_FIX }
  } catch (error) {
    if ((error as { name?: string })?.name === 'NoSuchCORSConfiguration') {
      return { name: 'Browser uploads (CORS)', status: 'warn', detail: 'no CORS configuration', fix: CORS_FIX }
    }

    return {
      name: 'Browser uploads (CORS)',
      status: 'warn',
      detail: `could not be read (${describe(error)})`,
      fix: 'Grant s3:GetBucketCORS to check this automatically, or verify the rule by hand.',
    }
  }
}

/**
 * `expiresIn` stops a transfer being *handed over*; it does not remove the
 * object. Only a lifecycle rule does that, and forgetting it is the single
 * most common way a s3nd bucket goes wrong.
 */
async function checkLifecycle(bucket: Bucket, prefix?: string): Promise<Check> {
  // Keys are written as `<prefix>/<code>`, so that is what a rule's prefix is
  // matched against, whether the user typed `transfers`, `transfers/` or `/transfers`.
  const trimmed = prefix?.replace(/^\/+|\/+$/g, '') || undefined
  const keyPrefix = trimmed ? `${trimmed}/` : ''
  const scope = trimmed ? `the "${trimmed}" prefix` : 'the bucket'
  const suggestion =
    'Add an S3 lifecycle rule that expires objects under ' +
    (trimmed ? `"${keyPrefix}"` : 'this bucket') +
    ' after a day or two. Without it, expired transfers stay stored and billed.'

  try {
    const response = await bucket.client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket.bucket }))

    const rules = (response.Rules ?? []).filter((rule) => rule.Status === 'Enabled' && rule.Expiration != null)

    if (rules.length === 0) {
      return { name: 'Expiry cleanup', status: 'warn', detail: 'no enabled expiration rule', fix: suggestion }
    }

    const matching = rules.filter((rule) => {
      // The console and Terraform write `Filter.And` as soon as a tag or a size
      // bound joins the prefix; the top-level `Prefix` is the legacy form.
      const rulePrefix = rule.Filter?.Prefix ?? rule.Filter?.And?.Prefix ?? rule.Prefix ?? ''
      return keyPrefix.startsWith(rulePrefix)
    })

    // A tag filter only matches objects carrying that tag, and s3nd tags nothing.
    const covering = matching.filter((rule) => rule.Filter?.Tag == null && (rule.Filter?.And?.Tags ?? []).length === 0)

    if (covering.length === 0) {
      const tagged = matching.length > 0
      return {
        name: 'Expiry cleanup',
        status: 'warn',
        detail: tagged
          ? `${matching.length} expiration rule(s) match ${scope} but filter on tags, which s3nd never sets`
          : `${rules.length} expiration rule(s), none covering ${scope}`,
        fix: tagged ? `${suggestion} Leave tags out of its filter.` : suggestion,
      }
    }

    const days = covering
      .map((rule) => rule.Expiration?.Days)
      .filter((value): value is number => typeof value === 'number')

    return {
      name: 'Expiry cleanup',
      status: 'ok',
      detail: days.length > 0 ? `expires after ${Math.min(...days)} day(s)` : 'an expiration rule covers ' + scope,
    }
  } catch (error) {
    // R2 and MinIO answer NoSuchLifecycleConfiguration; some gateways answer
    // NotImplemented. Neither is a failure of this bucket's configuration.
    const name = (error as { name?: string })?.name

    if (name === 'NoSuchLifecycleConfiguration') {
      return { name: 'Expiry cleanup', status: 'warn', detail: 'no lifecycle configuration', fix: suggestion }
    }

    return {
      name: 'Expiry cleanup',
      status: 'warn',
      detail: `could not be read (${describe(error)})`,
      fix: 'Grant s3:GetLifecycleConfiguration to check this automatically, or verify the rule by hand.',
    }
  }
}

async function resolve(value: unknown): Promise<string | undefined> {
  if (typeof value === 'function') return resolve(await (value as () => Promise<string>)())
  return typeof value === 'string' ? value : undefined
}

async function resolveEndpoint(value: unknown): Promise<string | undefined> {
  if (value == null) return undefined
  if (typeof value === 'function') return resolveEndpoint(await (value as () => Promise<unknown>)())
  if (typeof value === 'string') return `endpoint ${value}`

  const url = value as { hostname?: string; protocol?: string; port?: number | string }
  const port = url?.port ? `:${url.port}` : ''
  return url?.hostname ? `endpoint ${url.protocol ?? 'https:'}//${url.hostname}${port}` : undefined
}
