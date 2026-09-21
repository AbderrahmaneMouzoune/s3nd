/**
 * Everything the template reads from the environment, in one place. The
 * bucket itself is configured through the variables `createBucket()` already
 * understands: S3ND_BUCKET, S3ND_ENDPOINT, S3ND_REGION, S3ND_PREFIX and the
 * AWS credentials.
 */

function integer(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback

  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, received "${raw}".`)
  }

  return value
}

export const dropConfig = {
  /** Shown in the header and the page title. */
  name: process.env.DROP_NAME?.trim() || 'drop',
  /** Seconds a transfer lives. One day by default. */
  expiresIn: integer('DROP_EXPIRES_IN', 24 * 3600),
  /** Bytes. Four megabytes by default, under Vercel's 4.5 MB request limit. */
  maxSize: integer('DROP_MAX_SIZE_MB', 4) * 1024 * 1024,
  /** When set, `POST /api/transfers` needs `Authorization: Bearer <password>`. */
  password: process.env.DROP_PASSWORD?.trim() || undefined,
  /** `stream` pipes downloads through the function; `redirect` presigns them. */
  rawMode: (process.env.DROP_RAW_MODE === 'redirect' ? 'redirect' : 'stream') as 'stream' | 'redirect',
}
