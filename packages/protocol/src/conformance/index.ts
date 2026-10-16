/**
 * An executable form of `PROTOCOL.md`: point it at any s3nd server, whatever
 * it is written in, and it reports which rules the server keeps.
 *
 * It depends on no test framework. It returns a report rather than throwing,
 * so the same run feeds a CI assertion, `s3nd doctor --conformance`, or a
 * dashboard. It talks to the server through `fetch` and nothing else, so it
 * runs on Node, Bun and Deno. Not from a browser page: it reads a `302` from
 * `/raw` itself, which a browser's `fetch` hides.
 *
 * ```ts
 * import { runConformance } from '@s3nd/protocol/conformance'
 *
 * const report = await runConformance({ baseUrl: 'https://drop.example.com/api/transfers', headers })
 * const failed = report.filter((result) => result.status === 'fail')
 * ```
 *
 * The run creates real transfers and burns each one when it is done with it.
 * Point it at a deployment whose storage you do not mind it writing to.
 */
import type { UploadMode } from '../types.js'

// Named in `ConformanceServer`, so a caller can write the type without the main entry.
export type { UploadMode } from '../types.js'
import {
  codes,
  cors,
  deleteTokens,
  discover,
  expiry,
  files,
  jsonFile,
  presigned,
  rateLimit,
  requests,
  size,
  snapshots,
  versionHeader,
  type Context,
} from './checks.js'
import { Skip, Violation, type Probe } from './http.js'

/** `skip`: the check does not apply to this server, or needs an option it was not given. */
export type ConformanceStatus = 'pass' | 'fail' | 'skip'

export interface ConformanceResult {
  name: string
  status: ConformanceStatus
  /** What was checked, why it failed, or why it was skipped. */
  detail: string
}

/**
 * What the server under test is configured with. The protocol leaves these
 * to each server, so the suite cannot find them out by itself; each one it is
 * given turns a skipped check into a real one, and a mismatch into a failure.
 */
export interface ConformanceServer {
  /** The code alphabet. Defaults to Crockford base32, the protocol's default. */
  alphabet?: string
  /**
   * Transfer lifetime in seconds, or `null` when transfers do not expire. When
   * it is at most `expiryWait`, the suite waits it out and checks that an
   * expired transfer reads as `NOT_FOUND`.
   */
  expiresIn?: number | null
  /** The longest the suite waits for a transfer to expire, in seconds. Defaults to 15. */
  expiryWait?: number
  /** The largest file accepted, in bytes. One byte more must be `TOO_LARGE`. */
  maxSize?: number
  /** An origin the server accepts cross-origin requests from. */
  cors?: { origin: string }
  /** The upload mode. Detected when absent; checked against when given. */
  upload?: UploadMode
  /** Whether `DELETE` requires the delete token. Detected when absent; checked against when given. */
  protectDelete?: boolean
  /**
   * How many requests on one code the server answers before `RATE_LIMITED`.
   * The suite sends one more and expects a `429`. It runs last, since it
   * leaves the client limited.
   */
  rateLimit?: { requests: number }
}

export interface ConformanceOptions {
  /** Where the routes are mounted, e.g. `https://drop.example.com/api/transfers`. */
  baseUrl: string
  /** Sent with every request to the server (its credentials), never to storage. */
  headers?: Record<string, string>
  /** Defaults to the global `fetch`. */
  fetch?: typeof globalThis.fetch
  /** Per request, in milliseconds. Defaults to 15 seconds. */
  timeout?: number
  server?: ConformanceServer
}

const CHECKS: { name: string; run: (context: Context) => Promise<string> }[] = [
  { name: 'Version header', run: versionHeader },
  { name: 'Snapshots', run: snapshots },
  { name: 'Files', run: files },
  { name: 'A .json file stays a file', run: jsonFile },
  { name: 'Malformed requests', run: requests },
  { name: 'Codes', run: codes },
  { name: 'Expiry', run: expiry },
  { name: 'Size limit', run: size },
  { name: 'Cross-origin requests', run: cors },
  { name: 'Presigned uploads', run: presigned },
  { name: 'Delete tokens', run: deleteTokens },
  // Last: it leaves this client rate limited.
  { name: 'Rate limiting', run: rateLimit },
]

function describe(error: unknown): string {
  if (error instanceof Violation || error instanceof Skip) return error.message
  if (error instanceof Error && error.name === 'TimeoutError') return 'a request timed out'

  return `a request failed: ${error instanceof Error ? error.message : String(error)}`
}

/**
 * Runs every check against the server at `baseUrl`, one after the other, and
 * reports each. It never throws for what the server does: a refused
 * connection is a failed check like any other.
 */
export async function runConformance(options: ConformanceOptions): Promise<ConformanceResult[]> {
  const fetch = options.fetch ?? globalThis.fetch
  if (typeof fetch !== 'function') {
    throw new TypeError('No fetch implementation available. Pass one as `fetch` on runConformance().')
  }

  const probe: Probe = {
    base: options.baseUrl.replace(/\/+$/, ''),
    headers: options.headers ?? {},
    fetch,
    timeout: options.timeout ?? 15_000,
  }
  const server = options.server ?? {}

  try {
    const { traits, detail } = await discover(probe, server)
    const results: ConformanceResult[] = [{ name: 'Server', status: 'pass', detail }]

    for (const check of CHECKS) {
      try {
        results.push({ name: check.name, status: 'pass', detail: await check.run({ probe, server, traits }) })
      } catch (error) {
        results.push({ name: check.name, status: error instanceof Skip ? 'skip' : 'fail', detail: describe(error) })
      }
    }

    return results
  } catch (error) {
    // Without the discovery answers there is nothing to hold the rest to.
    return [
      { name: 'Server', status: 'fail', detail: describe(error) },
      ...CHECKS.map((check) => ({
        name: check.name,
        status: 'skip' as const,
        detail: 'the server did not answer the discovery requests',
      })),
    ]
  }
}
