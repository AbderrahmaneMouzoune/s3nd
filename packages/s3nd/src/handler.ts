import type { Bucket } from './bucket.js'
import { S3ndError, isS3ndError } from '@s3nd/protocol'
import { FILENAME_HEADER, TRANSFER_ERROR_STATUS } from '@s3nd/protocol'
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
const DEFAULT_BASE_PATH = '/api/transfers'
const DEFAULT_EXPIRES_IN = 3600
/** A redirect is followed at once; its signed URL need not outlive that. */
const MAX_REDIRECT_EXPIRES_IN = 300
/** A fresh code is 40 bits — a collision needs bad luck, not many retries. */
const CODE_ATTEMPTS = 5

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
}

export interface TransferHandler {
  /** Handles any request to the mounted routes. */
  (request: Request): Promise<Response>
  /** Named exports, so a Next route handler is a one-liner. */
  GET: (request: Request) => Promise<Response>
  POST: (request: Request) => Promise<Response>
  DELETE: (request: Request) => Promise<Response>
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

/** Every S3ndError that means something to a client gets its own code. */
function fromS3ndError(error: S3ndError): Response {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return fail('TOO_LARGE', error.message)
    case 'INVALID_SYNC_CODE':
      return fail('INVALID_SYNC_CODE', error.message)
    case 'SNAPSHOT_TOO_NEW':
      return fail('SNAPSHOT_TOO_NEW', error.message)
    case 'PRECONDITION_FAILED':
      return fail('CODE_TAKEN', error.message)
    case 'INVALID_KEY':
      return fail('INVALID_SYNC_CODE', error.message)
    default:
      return fail('INTERNAL', error.message)
  }
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

  /** Everything after the mount point: `[]`, `[code]` or `[code, 'raw']`. */
  function segmentsOf(request: Request): string[] | null {
    const { pathname } = new URL(request.url)
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) return null

    return pathname
      .slice(basePath.length)
      .split('/')
      .filter((segment) => segment.length > 0)
      .map(decodeURIComponent)
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
    let body: unknown

    try {
      body = await request.json()
    } catch {
      return fail('INVALID_REQUEST', 'Request body is not valid JSON.')
    }

    if (typeof body === 'object' && body !== null && (body as { upload?: unknown }).upload === 'presign') {
      return presign(body as PresignUploadBody)
    }

    return createSnapshot(request, body as CreateSnapshotBody)
  }

  async function createSnapshot(request: Request, body: CreateSnapshotBody): Promise<Response> {
    if (typeof body !== 'object' || body === null || !('data' in body)) {
      return fail('INVALID_REQUEST', 'Request body must be an object with a `data` property.')
    }

    const created = await claimCode(async (code) => {
      const result = await bucket.putSnapshot(code, body.data, {
        app: config.app,
        version: body.version,
        device: body.device ?? request.headers.get('user-agent') ?? undefined,
        expiresIn,
        ifAbsent: true,
      })

      return {
        code,
        kind: 'snapshot' as const,
        createdAt: result.createdAt.toISOString(),
        expiresAt: result.expiresAt?.toISOString(),
        size: result.size,
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

    let code: string | undefined
    for (let attempt = 0; attempt < CODE_ATTEMPTS && code === undefined; attempt += 1) {
      const candidate = bucket.codes.create()
      const taken = await s3(
        'GET_FAILED',
        `Failed to check code ${candidate}`,
        async () =>
          (await headObject(bucket, pathOf(bucket, candidate))) ??
          (await headObject(bucket, pathOf(bucket, pendingKey(candidate)))),
      )
      if (!taken) code = candidate
    }

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

    const metadata: Record<string, string> = { [KIND_METADATA_KEY]: 'file' }
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
    const bytes = new Uint8Array(await request.arrayBuffer())

    if (bytes.byteLength === 0) {
      return fail('INVALID_REQUEST', 'Request body is empty.')
    }

    const createdAt = new Date()
    const expiresAt = expiresIn != null ? new Date(createdAt.getTime() + expiresIn * 1000) : undefined

    const created = await claimCode(async (code) => {
      const result = await bucket.put(code, bytes, {
        filename,
        // A generic octet-stream means the client did not know; let upload()
        // infer from the filename rather than freezing in the placeholder.
        contentType: declaredContentType(request),
        cacheControl: 'private, no-store',
        metadata: {
          [KIND_METADATA_KEY]: 'file',
          ...(expiresAt ? { [EXPIRES_METADATA_KEY]: expiresAt.toISOString() } : {}),
        },
        ifAbsent: true,
      })

      return {
        code,
        kind: 'file' as const,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt?.toISOString(),
        size: result.size,
      }
    })

    return Response.json(created, { status: 201 })
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

    return new Response(toWebStream(file.body), { headers })
  }

  async function route(request: Request): Promise<Response> {
    const segments = segmentsOf(request)
    if (segments === null) return fail('NOT_FOUND', 'No transfer route matches this path.')

    if (config.authorize) {
      const allowed = await config.authorize(request)
      if (allowed instanceof Response) return allowed
      if (!allowed) return fail('UNAUTHORIZED', 'Not authorized.')
    }

    const [rawCode, tail, ...rest] = segments

    if (rest.length > 0) return fail('NOT_FOUND', 'No transfer route matches this path.')

    if (rawCode === undefined) {
      if (request.method !== 'POST') return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)

      return (request.headers.get('content-type') ?? '').includes('application/json')
        ? createFromJson(request)
        : createFile(request)
    }

    let code: string
    try {
      code = normalize(rawCode)
    } catch (error) {
      if (isS3ndError(error)) return fromS3ndError(error)
      throw error
    }

    if (tail === 'complete') {
      if (request.method !== 'POST') return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)
      return complete(code)
    }

    if (tail === 'raw') {
      if (request.method !== 'GET') return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)
      return readRaw(code)
    }

    if (tail !== undefined) return fail('NOT_FOUND', 'No transfer route matches this path.')

    if (request.method === 'GET') return read(code)

    if (request.method === 'DELETE') {
      // A pending upload under the code is burned with it.
      await bucket.delete(code)
      if (uploadMode !== 'proxy') await bucket.delete(pendingKey(code))
      return new Response(null, { status: 204 })
    }

    return fail('INVALID_REQUEST', `${request.method} is not allowed here.`)
  }

  const handler = async (request: Request): Promise<Response> => {
    try {
      return await route(request)
    } catch (error) {
      if (isS3ndError(error)) return fromS3ndError(error)

      throw error
    }
  }

  return Object.assign(handler, { GET: handler, POST: handler, DELETE: handler })
}
