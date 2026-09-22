/**
 * Everything the template reads from the environment, in one place. The
 * bucket itself is configured through the variables `createBucket()` already
 * understands: S3ND_BUCKET, S3ND_ENDPOINT, S3ND_REGION, S3ND_PREFIX and the
 * AWS credentials.
 */

const HOUR = 3600
const DAY = 24 * HOUR

function integer(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback

  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, received "${raw}".`)
  }

  return value
}

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (raw == null || raw === '') return fallback

  return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no'
}

/**
 * The ceiling is a ceiling: when a deployment sets a default longer than the
 * longest life it allows, the default comes down rather than the ceiling
 * going up. Both numbers hold afterwards, and the default is always one of
 * the lifetimes the form offers.
 */
const maxExpiresIn = integer('DROP_MAX_EXPIRES_IN', 7 * DAY)
const expiresIn = Math.min(integer('DROP_EXPIRES_IN', DAY), maxExpiresIn)

export const dropConfig = {
  /** Shown in the header and the page title. */
  name: process.env.DROP_NAME?.trim() || 'drop',
  /** Seconds a transfer lives when the sender picks nothing. One day by default. */
  expiresIn,
  /** Seconds. The longest life a sender may choose. Seven days by default. */
  maxExpiresIn,
  /** Bytes. Four megabytes by default, under Vercel's 4.5 MB request limit. */
  maxSize: integer('DROP_MAX_SIZE_MB', 4) * 1024 * 1024,
  /** When set, `POST /api/transfers` needs `Authorization: Bearer <password>`. */
  password: process.env.DROP_PASSWORD?.trim() || undefined,
  /** `stream` pipes downloads through the function; `redirect` presigns them. */
  rawMode: (process.env.DROP_RAW_MODE === 'redirect' ? 'redirect' : 'stream') as 'stream' | 'redirect',
  /**
   * Whether the pickup page renders what is behind the code — the image, the
   * video, the first lines of the text — before anything is downloaded. Turn
   * it off for a deployment where a preview is one look too many.
   */
  preview: flag('DROP_PREVIEW', true),
  /**
   * Bytes. Above this, a file is only described, never rendered: a preview
   * pulls the object through the function like a download does.
   */
  previewMaxSize: integer('DROP_PREVIEW_MAX_MB', 16) * 1024 * 1024,
}
