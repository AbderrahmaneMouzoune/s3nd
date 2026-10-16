import type { Bucket } from './bucket.js'
import { S3ndError, isS3ndError } from './errors.js'
import {
  DELETE_TOKEN_HEADER,
  FILENAME_HEADER,
  isTransferError,
  PROTOCOL_HEADER,
  PROTOCOL_VERSION,
  TRANSFER_ERROR_STATUS,
  TransferError,
} from '@s3nd/protocol'
import type {
  CreatedTransfer,
  CreateSnapshotBody,
  PresignedUpload,
  PresignUploadBody,
  TransferErrorCode,
  TransferMetadata,
  UploadMode,
} from '@s3nd/protocol'
import { copyObject, headObject, pathOf, type ObjectHead } from './staging.js'

/** Marks a stored object as opaque bytes rather than a snapshot envelope. */
const KIND_METADATA_KEY = 's3nd-kind'
/** Files carry their expiry here; snapshots carry it inside their envelope. */
const EXPIRES_METADATA_KEY = 's3nd-expires-at'
/** A presigned upload carries the size it announced, signed into its URL. */
const DECLARED_SIZE_METADATA_KEY = 's3nd-declared-size'
const FILENAME_METADATA_KEY = 'filename'
/**
 * Where presigned uploads wait for `POST /:code/complete`, inside the bucket's
 * prefix. A code has no `/`, so nothing live can ever sit under it, and a
 * lifecycle rule on it removes the uploads nobody completed.
 */
const PENDING_PREFIX = 'pending'
const DEFAULT_PRESIGN_EXPIRES_IN = 900
/** Where a transfer keeps the SHA-256 of its delete token, never the token. */
const DELETE_TOKEN_METADATA_KEY = 's3nd-delete-token-sha256'
const DEFAULT_BASE_PATH = '/api/transfers'
const DEFAULT_EXPIRES_IN = 3600
/** A redirect is followed at once; its signed URL need not outlive that. */
const MAX_REDIRECT_EXPIRES_IN = 300
/** What a cross-origin client is allowed to send, and to read back. */
const CORS_ALLOW_METHODS = 'GET, POST, DELETE'
const CORS_ALLOW_HEADERS = `content-type, authorization, ${PROTOCOL_HEADER}, ${FILENAME_HEADER}, ${DELETE_TOKEN_HEADER}`
const CORS_EXPOSE_HEADERS = `${PROTOCOL_HEADER}, content-disposition, retry-after`
/** A fresh code is 40 bits — a collision needs bad luck, not many retries. */
const CODE_ATTEMPTS = 5

export interface TransferHandlerCors {
  /**
   * Which page origins may call these routes from a browser: a list of exact
   * origins (`https://app.example.com`), a predicate, or `'*'` for any.
   */
  origin: '*' | readonly string[] | ((origin: string) => boolean)
  /**
   * Lets the browser send cookies and `authorization` with the request.
   * Browsers refuse it with `origin: '*'`, so that combination throws.
   */
  credentials?: boolean
  /** How long, in seconds, a browser may cache a preflight answer. */
  maxAge?: number
}

export interface TransferHandlerConfig {
  /** The bucket every transfer is stored in. */
  bucket: Bucket
  /**
   * Where these routes are mounted, so `/:code` can be read off the URL.
   * Defaults to `/api/transfers`.
   */
  basePath?: string
  /** Recorded on every snapshot, and handed back by `GET /:code`. */
  app?: string
  /**
   * Newest schema version this deployment understands. A snapshot written by a
   * newer build answers `SNAPSHOT_TOO_NEW` instead of being handed over.
   */
  maxVersion?: number
  /**
   * Lifetime of a transfer in seconds. Defaults to one hour. Pass `null` for
   * transfers that do not expire.
   *
   * Expiry is enforced on read; removing the object itself is an S3 lifecycle
   * rule's job. `s3nd doctor` checks whether you have one.
   */
  expiresIn?: number | null
  /**
   * Called before anything else. Return `false` for a plain 401, or a `Response`
   * to answer with your own. Without it every route is public — which is what
   * you want for a personal drop box behind a proxy, and not what you want
   * otherwise.
   */
  authorize?: (request: Request) => boolean | Response | Promise<boolean | Response>
  /**
   * How `GET /:code/raw` serves bytes. `stream` pipes them through your server;
   * `redirect` answers 302 with a presigned URL so they never transit it.
   */
  raw?: 'stream' | 'redirect'
  /**
   * How files come in. `proxy` (the default) takes the bytes in `POST /`, so
   * your runtime's request limit applies. `presign` hands the client a signed
   * URL to `PUT` them straight to the bucket, then checks them on
   * `POST /:code/complete`; the bucket needs a CORS rule for browsers, and a
   * lifecycle rule on `pending/` for uploads nobody completes. `both` accepts
   * either. Snapshots always go through `POST /`.
   */
  upload?: UploadMode
  /** Lifetime of a presigned upload URL, in seconds. Defaults to 15 minutes. */
  presignExpiresIn?: number
  /**
   * Called with any error that answers `INTERNAL`: a throwing `authorize`, a
   * failed S3 call, a network error, a corrupt stored snapshot. The client only
   * sees a generic `INTERNAL`, since the raw message can name a bucket or an
   * SDK internal, so this is where to log it. An error thrown here is ignored.
   */
  onError?: (error: unknown, request: Request) => void
  /**
   * Answers browsers calling from another origin: the `OPTIONS` preflight,
   * before `authorize`, and the CORS headers on every response, errors
   * included. Without it nothing is added, which is right for same-origin
   * routes.
   */
  cors?: TransferHandlerCors
  /**
   * Largest request body accepted, in bytes, for snapshots and files alike. A
   * bigger body answers `TOO_LARGE` without being read past the limit, which is
   * what keeps a self-hosted server's memory bounded: set it there.
   *
   * Defaults to the bucket's `maxSize` for files when that is set, and to no
   * limit otherwise, since a platform like Vercel or Lambda already enforces
   * its own. It measures the incoming body, so the raw JSON of a snapshot,
   * where the bucket's `maxSize` measures the gzipped bytes stored.
   */
  maxRequestSize?: number
  /**
   * Called on every request once its code is read, before anything is looked
   * up, so a refused guess learns nothing. Return `false` for a `429
   * RATE_LIMITED`, or a `Response` to answer with your own (a `retry-after`
   * on it reaches the client). `code` is the normalised code, absent on
   * `create`. Without it nothing is limited, which is fine for eight-character
   * codes and not for short ones: see the sync code docs.
   */
  rateLimit?: (request: Request, context: RateLimitContext) => boolean | Response | Promise<boolean | Response>
  /**
   * Require the transfer's delete token on `DELETE /:code`, in the
   * `x-s3nd-delete-token` header or as `authorization: Bearer`. Every
   * transfer is created with one either way; it is returned once, in the
   * `201`, and stored only as its SHA-256. Off by default, so anyone who knows
   * a code can burn it, as before.
   */
  protectDelete?: boolean
  /**
   * Delete a transfer once it has been handed over: a snapshot after its
   * first `GET /:code`, a file once `GET /:code/raw` has sent it in full. Two
   * reads racing can both succeed. Not with `raw: 'redirect'`, where the
   * bytes are read from the bucket after the handler has answered.
   */
  burnAfterRead?: boolean
}

/** What `rateLimit` is told about the request it is asked about. */
export interface RateLimitContext {
  route: 'create' | 'read' | 'raw' | 'delete' | 'complete'
  /** The normalised code. Absent on `create`, which has none yet. */
  code?: string
}

export interface TransferHandler {
  /** Handles any request to the mounted routes. */
  (request: Request): Promise<Response>
  /** Named exports, so a Next route handler is a one-liner. */
  GET: (request: Request) => Promise<Response>
  POST: (request: Request) => Promise<Response>
  DELETE: (request: Request) => Promise<Response>
  /** Answers the CORS preflight when `cors` is set, and refuses `OPTIONS` otherwise. */
  OPTIONS: (request: Request) => Promise<Response>
}

function pendingKey(code: string): string {
  return `${PENDING_PREFIX}/${code}`
}

/** S3 failures in the raw calls become S3ndErrors, so they answer as JSON. */
async function s3<T>(code: 'GET_FAILED' | 'UPLOAD_FAILED', what: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw new S3ndError(code, `${what}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

function fail(code: TransferErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status: TRANSFER_ERROR_STATUS[code] })
}

/**
 * Every S3ndError that means something to a client gets its own code. The rest
 * (a failed S3 call, a corrupt envelope) is the server's problem: `null` sends
 * it to the same net as an unexpected exception.
 */
function fromS3ndError(error: S3ndError): Response | null {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return fail('TOO_LARGE', error.message)
    case 'SNAPSHOT_TOO_NEW':
      return fail('SNAPSHOT_TOO_NEW', error.message)
    case 'PRECONDITION_FAILED':
      return fail('CODE_TAKEN', error.message)
    case 'INVALID_KEY':
      return fail('INVALID_SYNC_CODE', error.message)
    default:
      return null
  }
}

/**
 * Whether a request speaks a protocol version this handler can answer. No
 * header is a yes: that is a 0.x client, which spoke version 1 without saying
 * so. Anything that is not a whole number at most `PROTOCOL_VERSION` is a no.
 */
function speaksOurVersion(request: Request): boolean {
  const announced = request.headers.get(PROTOCOL_HEADER)
  if (announced === null) return true

  const trimmed = announced.trim()
  return /^\d+$/.test(trimmed) && Number(trimmed) <= PROTOCOL_VERSION
}

/**
 * Sets headers on a response. Some responses have immutable headers
 * (`Response.redirect`, or whatever `authorize` built), so those are rebuilt
 * around the same body rather than mutated.
 */
function withHeaders(response: Response, entries: Iterable<[string, string]>): Response {
  const list = [...entries]
  if (list.length === 0) return response

  try {
    for (const [name, value] of list) response.headers.set(name, value)
    return response
  } catch {
    const headers = new Headers(response.headers)
    for (const [name, value] of list) headers.set(name, value)

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}

/** A predicate that throws refuses the origin rather than costing the response. */
function originAllowed(allowed: TransferHandlerCors['origin'], origin: string): boolean {
  if (allowed === '*') return true
  if (typeof allowed !== 'function') return allowed.includes(origin)

  try {
    return allowed(origin) === true
  } catch {
    return false
  }
}

/**
 * The CORS headers a request gets, if any. Nothing for a request without an
 * `Origin` (not a browser, or same-origin) or from an origin not allowed: the
 * browser then blocks the response, which is the refusal.
 */
function corsHeaders(cors: TransferHandlerCors, request: Request, preflight: boolean): [string, string][] {
  const origin = request.headers.get('origin')
  const vary: [string, string][] = cors.origin === '*' ? [] : [['vary', 'origin']]
  if (!origin) return vary

  if (!originAllowed(cors.origin, origin)) return vary

  const headers: [string, string][] = [['access-control-allow-origin', cors.origin === '*' ? '*' : origin], ...vary]
  if (cors.credentials) headers.push(['access-control-allow-credentials', 'true'])

  if (preflight) {
    headers.push(['access-control-allow-methods', CORS_ALLOW_METHODS])
    headers.push(['access-control-allow-headers', CORS_ALLOW_HEADERS])
    if (cors.maxAge != null) headers.push(['access-control-max-age', String(cors.maxAge)])
  } else {
    headers.push(['access-control-expose-headers', CORS_EXPOSE_HEADERS])
  }

  return headers
}

/** The content type the client actually committed to, if it committed to one. */
function declaredContentType(request: Request): string | undefined {
  const declared = request.headers.get('content-type')?.split(';')[0]?.trim()

  return declared && declared !== 'application/octet-stream' ? declared : undefined
}

function decodeHeaderValue(value: string | null): string | undefined {
  if (value == null || value.length === 0) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The sender names the file, and every client that reads it back may write it
 * under that name — so it is a name and nothing more: no directory, from either
 * kind of separator, no control characters, no leading dots.
 */
function safeFilename(received: string | undefined): string | undefined {
  const name = received
    ?.split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim()

  return name ? name : undefined
}

/**
 * `Response` wants a web stream. Outside Node the SDK already hands one back;
 * on Node it hands back a `Readable`, which its stream mixin can convert. The
 * check happens at runtime so this module never imports `node:stream`.
 */
function toWebStream(body: unknown): ReadableStream {
  if (typeof (body as ReadableStream)?.getReader === 'function') return body as ReadableStream

  const mixin = body as { transformToWebStream?: () => ReadableStream }
  if (typeof mixin?.transformToWebStream === 'function') return mixin.transformToWebStream()

  // Anything else async-iterable, a bare Node `Readable` included.
  const iterator = (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator]()
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await iterator.next()
      if (done) controller.close()
      else controller.enqueue(value)
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

/**
 * The request body, read no further than `limit` bytes: `null` when it is
 * larger. `content-length` settles it up front when it is honest; the counter
 * catches a body that has none, or lies.
 */
async function readBody(request: Request, limit: number | undefined): Promise<Uint8Array | null> {
  if (limit === undefined) return new Uint8Array(await request.arrayBuffer())

  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) {
    await request.body?.cancel().catch(() => undefined)
    return null
  }

  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    size += value.byteLength
    if (size > limit) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes
}

/**
 * Passes a request body through, and errors it with `FILE_TOO_LARGE` the
 * moment it carries more than `limit` bytes, so a streamed upload stops there
 * and the multipart upload behind it is aborted.
 */
function bounded(body: ReadableStream<Uint8Array>, limit: number): ReadableStream<Uint8Array> {
  let size = 0

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength
        if (size > limit) {
          controller.error(new S3ndError('FILE_TOO_LARGE', `Request body exceeds the limit of ${limit} bytes.`))
          return
        }
        controller.enqueue(chunk)
      },
    }),
  )
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(text: string): Promise<string> {
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * A delete token and the hash that is all the bucket ever sees of it. Web
 * Crypto rather than `node:crypto`, so the handler keeps running outside Node.
 */
async function newDeleteToken(): Promise<{ token: string; hash: string }> {
  const token = base64url(globalThis.crypto.getRandomValues(new Uint8Array(32)))
  return { token, hash: await sha256(token) }
}

/** Compares two hex digests without stopping at the first difference. */
function sameDigest(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

/** The delete token a request carries: its own header first, then a bearer. */
function deleteTokenOf(request: Request): string | undefined {
  const header = request.headers.get(DELETE_TOKEN_HEADER)?.trim()
  if (header) return header

  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim()
  return bearer || undefined
}

/** Runs `onEnd` once the whole body has been read, and not if the reader gives up halfway. */
function afterFullRead(body: ReadableStream, onEnd: () => Promise<void>): ReadableStream {
  return body.pipeThrough(
    new TransformStream({
      async flush() {
        await onEnd()
      },
    }),
  )
}

function discard(body: unknown): void {
  const stream = body as { destroy?: () => void; cancel?: () => void }
  stream?.destroy?.()
  stream?.cancel?.()
}

/**
 * Serves the s3nd transfer protocol over anything with `Request` and
 * `Response` — a Next route handler, Hono, `Bun.serve`, Deno, a worker.
 *
 * ```ts
 * // app/api/transfers/[[...route]]/route.ts
 * export const { GET, POST, DELETE } = createTransferHandler({ bucket: store() })
 * ```
 */
export function createTransferHandler(config: TransferHandlerConfig): TransferHandler {
  const { bucket } = config
  const basePath = `/${(config.basePath ?? DEFAULT_BASE_PATH).replace(/^\/+|\/+$/g, '')}`
  const expiresIn = config.expiresIn === null ? undefined : (config.expiresIn ?? DEFAULT_EXPIRES_IN)
  const rawMode = config.raw ?? 'stream'
  const uploadMode = config.upload ?? 'proxy'
  const presignExpiresIn = config.presignExpiresIn ?? DEFAULT_PRESIGN_EXPIRES_IN
  const { cors } = config

  if (cors?.origin === '*' && cors.credentials) {
    throw new S3ndError(
      'INVALID_CONFIG',
      "`cors.origin: '*'` cannot be combined with `credentials: true`: browsers refuse it. List the origins instead.",
    )
  }

  if (config.burnAfterRead && rawMode === 'redirect') {
    throw new S3ndError(
      'INVALID_CONFIG',
      "`burnAfterRead` cannot be combined with `raw: 'redirect'`: the bytes are fetched from the bucket after the handler answered, so it cannot tell when they were read.",
    )
  }

  if (config.maxRequestSize != null && !(Number.isFinite(config.maxRequestSize) && config.maxRequestSize > 0)) {
    throw new S3ndError('INVALID_CONFIG', '`maxRequestSize` must be a positive number of bytes.')
  }

  const fileLimit = config.maxRequestSize ?? bucket.maxSize
  const snapshotLimit = config.maxRequestSize

  function tooLarge(limit: number): Response {
    return fail('TOO_LARGE', `Request body exceeds the limit of ${limit} bytes.`)
  }

  /** Everything after the mount point: `[]`, `[code]` or `[code, 'raw']`. */
  function segmentsOf(request: Request): string[] | null {
    const { pathname } = new URL(request.url)
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) return null

    return pathname
      .slice(basePath.length)
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => {
        try {
          return decodeURIComponent(segment)
        } catch {
          // A stray `%E0` is a code nobody could have been handed, not a crash.
          throw new TransferError('INVALID_SYNC_CODE', 'The code in the path is not validly encoded.')
        }
      })
  }

  function normalize(raw: string): string {
    return bucket.codes.normalize(raw)
  }

  /** Writes under a fresh code, retrying the rare collision with another one. */
  async function claimCode(write: (code: string) => Promise<CreatedTransfer>): Promise<CreatedTransfer> {
    let last: unknown

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      try {
        return await write(bucket.codes.create())
      } catch (error) {
        if (!isS3ndError(error) || error.code !== 'PRECONDITION_FAILED') throw error
        last = error
      }
    }

    throw last instanceof Error
      ? new S3ndError('PRECONDITION_FAILED', `Could not find a free code in ${CODE_ATTEMPTS} attempts.`)
      : last
  }

  async function createFromJson(request: Request): Promise<Response> {
    // Bounded before parsing: the raw JSON is what costs memory here.
    const raw = await readBody(request, snapshotLimit)
    if (raw === null) return tooLarge(snapshotLimit!)

    let body: unknown

    try {
      body = JSON.parse(new TextDecoder().decode(raw))
    } catch {
      return fail('INVALID_REQUEST', 'Request body is not valid JSON.')
    }

    if (typeof body === 'object' && body !== null && (body as { upload?: unknown }).upload === 'presign') {
      return presign(body as PresignUploadBody)
    }

    return createSnapshot(body as CreateSnapshotBody)
  }

  async function createSnapshot(body: CreateSnapshotBody): Promise<Response> {
    if (typeof body !== 'object' || body === null || !('data' in body)) {
      return fail('INVALID_REQUEST', 'Request body must be an object with a `data` property.')
    }

    const deletion = await newDeleteToken()

    const created = await claimCode(async (code) => {
      const result = await bucket.putSnapshot(code, body.data, {
        app: config.app,
        version: body.version,
        // Only what the client chose to say. The User-Agent is not a device
        // name, and storing it would hand it to anyone who knows the code.
        device: body.device,
        expiresIn,
        metadata: { [DELETE_TOKEN_METADATA_KEY]: deletion.hash },
        ifAbsent: true,
      })

      return {
        code,
        kind: 'snapshot' as const,
        createdAt: result.createdAt.toISOString(),
        expiresAt: result.expiresAt?.toISOString(),
        size: result.size,
        deleteToken: deletion.token,
      }
    })

    return Response.json(created, { status: 201 })
  }

  /** The live transfer a file object describes, as `POST /` answers it. */
  function createdFile(code: string, head: ObjectHead): CreatedTransfer {
    return {
      code,
      kind: 'file',
      createdAt: (head.lastModified ?? new Date()).toISOString(),
      expiresAt: head.metadata[EXPIRES_METADATA_KEY],
      size: head.size,
    }
  }

  /**
   * A code nothing is stored under, live or pending. For a write that cannot
   * be retried under another code, a streamed body or a presigned upload,
   * where `claimCode()`'s retry-on-conflict would have nothing left to send.
   */
  async function freeCode(): Promise<string | undefined> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const candidate = bucket.codes.create()
      const taken = await s3(
        'GET_FAILED',
        `Failed to check code ${candidate}`,
        async () =>
          (await headObject(bucket, pathOf(bucket, candidate))) ??
          (await headObject(bucket, pathOf(bucket, pendingKey(candidate)))),
      )
      if (!taken) return candidate
    }

    return undefined
  }

  async function presign(body: PresignUploadBody): Promise<Response> {
    if (uploadMode === 'proxy') {
      return fail('INVALID_REQUEST', 'This server does not offer presigned uploads. Send the bytes in POST / instead.')
    }

    const { size, contentType } = body

    if (typeof body.filename !== 'string' || body.filename.length === 0) {
      return fail('INVALID_REQUEST', '`filename` must be a non-empty string.')
    }

    // The same rule as a proxied file: a name, never a path.
    const filename = safeFilename(body.filename) ?? 'file'

    if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0) {
      return fail('INVALID_REQUEST', '`size` must be a positive whole number of bytes.')
    }

    if (contentType != null && typeof contentType !== 'string') {
      return fail('INVALID_REQUEST', '`contentType` must be a string when present.')
    }

    // Refused before a code is even picked: nothing to clean up.
    if (bucket.maxSize != null && size > bucket.maxSize) {
      return fail(
        'TOO_LARGE',
        `Upload is ${size} bytes, which exceeds the configured maxSize of ${bucket.maxSize} bytes.`,
      )
    }

    const code = await freeCode()
    if (code === undefined) {
      return fail('CODE_TAKEN', `Could not find a free code in ${CODE_ATTEMPTS} attempts.`)
    }

    const signed = await bucket.presignUpload(pendingKey(code), {
      contentLength: size,
      // A generic octet-stream means the client did not know; guess from the name.
      contentType: contentType && contentType !== 'application/octet-stream' ? contentType : undefined,
      filename,
      cacheControl: 'private, no-store',
      metadata: { [KIND_METADATA_KEY]: 'file', [DECLARED_SIZE_METADATA_KEY]: String(size) },
      expiresIn: presignExpiresIn,
    })

    const answer: PresignedUpload = {
      code,
      uploadUrl: signed.url,
      method: signed.method,
      headers: signed.headers,
      expiresAt: signed.expiresAt.toISOString(),
    }

    return Response.json(answer, { status: 201 })
  }

  async function complete(code: string): Promise<Response> {
    const pendingPath = pathOf(bucket, pendingKey(code))
    const livePath = pathOf(bucket, code)

    const pending = await s3('GET_FAILED', `Failed to read the pending upload ${code}`, () =>
      headObject(bucket, pendingPath),
    )

    if (!pending) {
      // Completed already, and the client lost the answer: say it again.
      const live = await s3('GET_FAILED', `Failed to read transfer ${code}`, () => headObject(bucket, livePath))
      if (live && live.metadata[KIND_METADATA_KEY] === 'file') {
        return Response.json(createdFile(code, live), { status: 201 })
      }

      return fail('NOT_FOUND', 'Nothing is waiting to be completed under this code.')
    }

    const declared = Number(pending.metadata[DECLARED_SIZE_METADATA_KEY])

    if (pending.size !== declared) {
      await bucket.delete(pendingKey(code))
      return fail('INVALID_REQUEST', `The upload is ${pending.size} bytes, not the ${declared} announced.`)
    }

    if (bucket.maxSize != null && (pending.size ?? 0) > bucket.maxSize) {
      await bucket.delete(pendingKey(code))
      return fail('TOO_LARGE', `Upload exceeds the configured maxSize of ${bucket.maxSize} bytes.`)
    }

    const createdAt = new Date()
    const expiresAt = expiresIn != null ? new Date(createdAt.getTime() + expiresIn * 1000) : undefined

    const deletion = await newDeleteToken()
    const metadata: Record<string, string> = {
      [KIND_METADATA_KEY]: 'file',
      [DELETE_TOKEN_METADATA_KEY]: deletion.hash,
    }
    const filename = pending.metadata[FILENAME_METADATA_KEY]
    if (filename) metadata[FILENAME_METADATA_KEY] = filename
    if (expiresAt) metadata[EXPIRES_METADATA_KEY] = expiresAt.toISOString()

    // Expiry runs from completion, the moment the code becomes usable.
    await s3('UPLOAD_FAILED', `Failed to complete transfer ${code}`, () =>
      copyObject(bucket, pendingPath, livePath, {
        contentType: pending.contentType,
        cacheControl: 'private, no-store',
        metadata,
      }),
    )
    await bucket.delete(pendingKey(code))

    const created: CreatedTransfer = {
      code,
      kind: 'file',
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      size: pending.size,
      deleteToken: deletion.token,
    }

    return Response.json(created, { status: 201 })
  }

  async function createFile(request: Request): Promise<Response> {
    if (uploadMode === 'presign') {
      return fail(
        'INVALID_REQUEST',
        'This server takes files through presigned uploads only: POST { "upload": "presign", … } first.',
      )
    }

    const filename = safeFilename(decodeHeaderValue(request.headers.get(FILENAME_HEADER))) ?? 'file'
    const length = request.headers.get('content-length')
    const declared = length != null && /^\d+$/.test(length) ? Number(length) : undefined

    if (!request.body || declared === 0) {
      return fail('INVALID_REQUEST', 'Request body is empty.')
    }

    // An announced length over the limit is refused before a byte is read;
    // a body without one, or whose length lies, is cut off at the limit.
    if (fileLimit != null && declared != null && declared > fileLimit) {
      await request.body.cancel().catch(() => undefined)
      return tooLarge(fileLimit)
    }

    const createdAt = new Date()
    const expiresAt = expiresIn != null ? new Date(createdAt.getTime() + expiresIn * 1000) : undefined

    // The body is streamed into the bucket rather than read into memory: a
    // large one goes through a multipart upload. A stream can be sent only
    // once, so the code is checked free first instead of retried on conflict.
    const code = await freeCode()
    if (code === undefined) {
      return fail('CODE_TAKEN', `Could not find a free code in ${CODE_ATTEMPTS} attempts.`)
    }

    const deletion = await newDeleteToken()

    {
      const result = await bucket.put(code, fileLimit != null ? bounded(request.body, fileLimit) : request.body, {
        contentLength: declared,
        filename,
        // A generic octet-stream means the client did not know; let upload()
        // infer from the filename rather than freezing in the placeholder.
        contentType: declaredContentType(request),
        cacheControl: 'private, no-store',
        metadata: {
          [KIND_METADATA_KEY]: 'file',
          [DELETE_TOKEN_METADATA_KEY]: deletion.hash,
          ...(expiresAt ? { [EXPIRES_METADATA_KEY]: expiresAt.toISOString() } : {}),
        },
        ifAbsent: true,
      })

      if (result.size === 0) {
        await bucket.delete(code)
        return fail('INVALID_REQUEST', 'Request body is empty.')
      }

      const created: CreatedTransfer = {
        code,
        kind: 'file',
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt?.toISOString(),
        size: result.size,
        deleteToken: deletion.token,
      }

      return Response.json(created, { status: 201 })
    }
  }

  async function read(code: string): Promise<Response> {
    const file = await bucket.get(code)
    if (!file) return fail('NOT_FOUND', 'Unknown or expired code.')

    if (file.metadata[KIND_METADATA_KEY] === 'file') {
      // The body is a live socket and this route does not serve bytes.
      discard(file.body)

      const expiresAt = file.metadata[EXPIRES_METADATA_KEY]
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        return fail('NOT_FOUND', 'Unknown or expired code.')
      }

      const metadata: TransferMetadata = {
        code,
        kind: 'file',
        createdAt: (file.lastModified ?? new Date()).toISOString(),
        expiresAt,
        size: file.size,
        filename: file.filename,
        contentType: file.contentType,
      }

      return Response.json(metadata)
    }

    // Not a file, so it is a snapshot: re-read it through the envelope, which
    // is what applies expiry and the version check.
    const snapshot = await bucket.getSnapshot(code, { maxVersion: config.maxVersion })
    if (!snapshot) return fail('NOT_FOUND', 'Unknown or expired code.')

    const metadata: TransferMetadata = {
      code,
      kind: 'snapshot',
      createdAt: snapshot.createdAt.toISOString(),
      expiresAt: snapshot.expiresAt?.toISOString(),
      device: snapshot.device,
      app: snapshot.app,
      version: snapshot.version,
      size: snapshot.size,
      data: snapshot.data,
    }

    // Handed over in full: the transfer has done its job.
    if (config.burnAfterRead) await bucket.deleteSnapshot(code)

    return Response.json(metadata)
  }

  async function readRaw(code: string): Promise<Response> {
    if (rawMode === 'redirect') {
      // Signing reads nothing, so check what stream mode would have checked
      // first: that the object is there, is a file, and has not expired.
      const head = await bucket.head(code)
      if (!head || head.metadata[KIND_METADATA_KEY] !== 'file') return fail('NOT_FOUND', 'Unknown or expired code.')

      const expiresAt = head.metadata[EXPIRES_METADATA_KEY]
      const remaining = expiresAt ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) : Infinity
      if (!(remaining >= 1)) return fail('NOT_FOUND', 'Unknown or expired code.')

      const url = await bucket.getUrl(code, {
        download: true,
        expiresIn: Math.min(remaining, MAX_REDIRECT_EXPIRES_IN),
      })
      return Response.redirect(url, 302)
    }

    const file = await bucket.get(code)
    if (!file) return fail('NOT_FOUND', 'Unknown or expired code.')

    // A snapshot's bytes are its gzipped envelope, and its expiry lives inside
    // that envelope where this route cannot see it. It has no raw form: answer
    // exactly as for an unknown code, so /raw says nothing about what a code holds.
    if (file.metadata[KIND_METADATA_KEY] !== 'file') {
      discard(file.body)
      return fail('NOT_FOUND', 'Unknown or expired code.')
    }

    const expiresAt = file.metadata[EXPIRES_METADATA_KEY]
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      discard(file.body)
      return fail('NOT_FOUND', 'Unknown or expired code.')
    }

    const headers = new Headers({ 'content-type': file.contentType, 'cache-control': 'private, no-store' })
    if (file.size != null) headers.set('content-length', String(file.size))
    if (file.filename) {
      headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
    }

    const body = toWebStream(file.body)

    // Burned once the last byte is out, not when the response starts: a
    // download cut short leaves the transfer for another try.
    return new Response(config.burnAfterRead ? afterFullRead(body, () => bucket.delete(code)) : body, { headers })
  }

  /** `DELETE /:code`, with the delete token checked first when `protectDelete` is on. */
  async function burn(request: Request, code: string): Promise<Response> {
    if (config.protectDelete) {
      const token = deleteTokenOf(request)
      if (!token) return fail('UNAUTHORIZED', 'Burning this transfer needs its delete token.')

      const head = await bucket.head(code)
      // Already gone: deleting it again is the no-op it always was.
      if (!head) return new Response(null, { status: 204 })

      const expected = head.metadata[DELETE_TOKEN_METADATA_KEY]
      if (!expected || !sameDigest(await sha256(token), expected)) {
        return fail('UNAUTHORIZED', 'That is not the delete token of this transfer.')
      }

      await bucket.deleteSnapshot(code)
      return new Response(null, { status: 204 })
    }

    // A pending upload under the code is burned with it.
    await bucket.deleteSnapshot(code)
    if (uploadMode !== 'proxy') await bucket.delete(pendingKey(code))
    return new Response(null, { status: 204 })
  }

  /** `rateLimit`'s answer as a response, or `null` to go on. */
  async function limited(request: Request, context: RateLimitContext): Promise<Response | null> {
    if (!config.rateLimit) return null

    const allowed = await config.rateLimit(request, context)
    if (allowed instanceof Response) return allowed
    return allowed ? null : fail('RATE_LIMITED', 'Too many requests. Try again later.')
  }

  async function route(request: Request): Promise<Response> {
    const segments = segmentsOf(request)
    if (segments === null) return fail('NOT_FOUND', 'No transfer route matches this path.')

    // A preflight carries no credentials and no s3nd headers, so it is
    // answered before either is checked; the browser then sends the request.
    if (cors && request.method === 'OPTIONS') return new Response(null, { status: 204 })

    // Before authorize: a client from the future should learn that much
    // whatever its credentials, and nothing below may read its payload.
    if (!speaksOurVersion(request)) {
      return fail(
        'UNSUPPORTED_PROTOCOL',
        `This server speaks s3nd protocol version ${PROTOCOL_VERSION}; the request announced "${request.headers.get(PROTOCOL_HEADER)?.slice(0, 32)}".`,
      )
    }

    if (config.authorize) {
      const allowed = await config.authorize(request)
      if (allowed instanceof Response) return allowed
      if (!allowed) return fail('UNAUTHORIZED', 'Not authorized.')
    }

    const [rawCode, tail, ...rest] = segments

    if (rest.length > 0) return fail('NOT_FOUND', 'No transfer route matches this path.')

    if (rawCode === undefined) {
      if (request.method !== 'POST') return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)

      const refused = await limited(request, { route: 'create' })
      if (refused) return refused

      // A filename means a file, whatever its type: a `.json` picked from a
      // file input is sent as `application/json`, and is still a file. Only a
      // nameless JSON body is a snapshot.
      if (request.headers.has(FILENAME_HEADER)) return createFile(request)

      return (request.headers.get('content-type') ?? '').includes('application/json')
        ? createFromJson(request)
        : createFile(request)
    }

    const code = normalize(rawCode)

    const match =
      tail === 'complete' && request.method === 'POST'
        ? 'complete'
        : tail === 'raw' && request.method === 'GET'
          ? 'raw'
          : tail === undefined && request.method === 'GET'
            ? 'read'
            : tail === undefined && request.method === 'DELETE'
              ? 'delete'
              : undefined

    if (match === undefined) {
      if (tail !== undefined && tail !== 'complete' && tail !== 'raw') {
        return fail('NOT_FOUND', 'No transfer route matches this path.')
      }
      return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)
    }

    // After the code is read, before it is looked up: a refused guess learns nothing.
    const refused = await limited(request, { route: match, code })
    if (refused) return refused

    switch (match) {
      case 'complete':
        return complete(code)
      case 'raw':
        return readRaw(code)
      case 'read':
        return read(code)
      case 'delete':
        return burn(request, code)
    }
  }

  const handler = async (request: Request): Promise<Response> => {
    const response = await answer(request)
    const preflight = cors != null && request.method === 'OPTIONS'

    return withHeaders(response, [
      [PROTOCOL_HEADER, String(PROTOCOL_VERSION)],
      ...(cors ? corsHeaders(cors, request, preflight) : []),
    ])
  }

  async function answer(request: Request): Promise<Response> {
    try {
      return await route(request)
    } catch (error) {
      // A TransferError raised here is already an answer: a code the sync code
      // rules refused, or a path that cannot hold one.
      // TIMEOUT is a client's verdict; a server never answers with it.
      if (isTransferError(error) && error.code !== 'TIMEOUT') return fail(error.code, error.message)

      const named = isS3ndError(error) ? fromS3ndError(error) : null
      if (named) return named

      // The protocol promises a JSON error body on every failure, so nothing
      // leaves as a bare framework 500. The message stays generic: the raw one,
      // a wrapped S3 failure's included, can carry a bucket name or SDK internals.
      try {
        // An async logger type-checks as `void` too; its rejection is swallowed
        // here rather than surfacing as an unhandled one.
        const logged = config.onError?.(error, request) as unknown
        if (logged instanceof Promise) logged.catch(() => undefined)
      } catch {
        // A logger that throws must not cost the client its answer.
      }

      return fail('INTERNAL', 'Internal error.')
    }
  }

  return Object.assign(handler, { GET: handler, POST: handler, DELETE: handler, OPTIONS: handler })
}
