import { isTransferError, parseTransferErrorBody, TransferError } from './transfer-error.js'
import { readCounted, sizeOf, transmit, type Incoming } from './transport.js'
import { FILENAME_HEADER, PROTOCOL_HEADER, PROTOCOL_VERSION } from './types.js'
import type {
  CreatedTransfer,
  CreateSnapshotBody,
  PresignedUpload,
  PresignUploadBody,
  TransferMetadata,
  TransferProgress,
} from './types.js'

/**
 * How `createFile()` sends bytes. `proxy` posts them to the server; `presign`
 * asks the server for a URL and sends them straight to the bucket; `auto`
 * tries `presign` and falls back to `proxy`, for good, the first time the
 * server says it does not offer it.
 */
export type ClientUploadMode = 'proxy' | 'presign' | 'auto'

export interface TransferClientConfig {
  /**
   * Where the transfer routes live, e.g. `https://drop.example.com/api/transfers`
   * or a same-origin `/api/transfers`.
   */
  baseUrl: string
  /**
   * Sent on every request — an API key, a session cookie header, a bearer
   * token. The `s3nd-protocol` header is the client's own and cannot be
   * overridden here.
   */
  headers?: Record<string, string>
  /**
   * Swap the implementation in tests, or to add retries. Defaults to global
   * `fetch`. It also carries a presigned upload's `PUT` to the bucket, without
   * `headers`: those are for the server.
   */
  fetch?: typeof globalThis.fetch
  /** How files are sent. Defaults to `proxy`, which every server accepts. */
  upload?: ClientUploadMode
}

/** Uploading structured state: it comes back inline from `read()`. */
export interface CreateSnapshotInput extends CreateSnapshotBody {
  signal?: AbortSignal
}

/** Uploading opaque bytes: they come back from `readBytes()`. */
export interface CreateFileInput {
  /**
   * `Uint8Array` is spelled out alongside `BodyInit` on purpose: it is the
   * obvious thing to hand this method, and the DOM lib only admits it under a
   * narrower `ArrayBuffer` parameter than `TextEncoder` or `readFile` produce.
   */
  body: BodyInit | Uint8Array
  filename: string
  contentType?: string
  /**
   * Byte size of the body. Worked out for bytes, strings and blobs; needed for
   * a stream to go through a presigned upload, and to report a total.
   */
  size?: number
  /**
   * Called as the bytes go out. In a browser, with the global `fetch`, the
   * upload then goes through `XMLHttpRequest`, the only API that reports
   * upload progress. With a `fetch` of your own, it is used, and the body is
   * counted as it is read.
   */
  onProgress?: (progress: TransferProgress) => void
  signal?: AbortSignal
}

export interface ReadBytesOptions {
  signal?: AbortSignal
  /** Called as the bytes come in, against the response's `Content-Length`. */
  onProgress?: (progress: TransferProgress) => void
}

export interface TransferClient {
  /** Stores application state and returns the code to carry to the other device. */
  createSnapshot(input: CreateSnapshotInput): Promise<CreatedTransfer>
  /** Stores a file and returns its code. */
  createFile(input: CreateFileInput): Promise<CreatedTransfer>
  /** What a code points at, or `null` when it is unknown or expired. */
  read(code: string, options?: { signal?: AbortSignal }): Promise<TransferMetadata | null>
  /** The bytes behind a code, or `null` when it is unknown or expired. */
  readBytes(code: string, options?: ReadBytesOptions): Promise<Uint8Array | null>
  /** Burns a code. Deleting one that is already gone is not an error. */
  remove(code: string, options?: { signal?: AbortSignal }): Promise<void>
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

/**
 * Turns a non-2xx response into a `TransferError`, preferring the documented
 * error body and falling back to the status when the server is not one of ours.
 */
async function toTransferError(response: Incoming): Promise<TransferError> {
  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = undefined
  }

  const parsed = parseTransferErrorBody(payload)

  if (parsed) {
    return new TransferError(parsed.code, parsed.message, { status: response.status })
  }

  return new TransferError(
    response.status === 401 || response.status === 403 ? 'UNAUTHORIZED' : 'INTERNAL',
    `The server answered ${response.status} ${response.statusText || ''}`.trim() + '.',
    { status: response.status },
  )
}

/**
 * A client for the s3nd transfer protocol. Zero server dependencies: it
 * is `fetch` and nothing else, so it bundles for a browser, a worker, the CLI
 * or React Native alike.
 */
export function createTransferClient(config: TransferClientConfig): TransferClient {
  const doFetch = config.fetch ?? globalThis.fetch
  const baseHeaders = config.headers ?? {}

  if (typeof doFetch !== 'function') {
    throw new TransferError(
      'INTERNAL',
      'No fetch implementation available. Pass one as `fetch` on createTransferClient().',
    )
  }

  async function send(path: string, init: RequestInit): Promise<Response> {
    const response = await doFetch(joinUrl(config.baseUrl, path), {
      ...init,
      headers: {
        ...baseHeaders,
        ...(init.headers as Record<string, string> | undefined),
        // Lets a server refuse a version it does not speak, rather than
        // misreading a payload whose shape it does not know.
        [PROTOCOL_HEADER]: String(PROTOCOL_VERSION),
      },
    })

    if (!response.ok) throw await toTransferError(response)

    return response
  }

  let presignRefused = false

  /** Asks for an upload URL; `null` when the server does not offer presigned uploads. */
  async function requestUpload(input: CreateFileInput, size: number): Promise<PresignedUpload | null> {
    const body: PresignUploadBody = {
      upload: 'presign',
      filename: input.filename,
      size,
      contentType: input.contentType,
    }

    try {
      const response = await send('', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: input.signal,
      })

      return (await response.json()) as PresignedUpload
    } catch (error) {
      // A server in proxy mode, or one older than presigned uploads, reads
      // this as a malformed request. Only `auto` treats that as an answer.
      if (config.upload === 'auto' && isTransferError(error) && error.code === 'INVALID_REQUEST') {
        presignRefused = true
        return null
      }

      throw error
    }
  }

  async function uploadPresigned(input: CreateFileInput, upload: PresignedUpload, size: number) {
    const put = await transmit(doFetch, {
      url: upload.uploadUrl,
      method: upload.method,
      headers: upload.headers,
      body: input.body,
      size,
      signal: input.signal,
      onProgress: input.onProgress,
      allowXhr: config.fetch == null,
    })

    if (!put.ok) {
      throw new TransferError(
        'INTERNAL',
        `The bucket refused the upload with ${put.status} ${put.statusText || ''}`.trim() +
          '. Check that the URL has not expired, and that the bucket has a CORS rule for browser uploads.',
        { status: put.status },
      )
    }

    const response = await send(`/${encodeURIComponent(upload.code)}/complete`, {
      method: 'POST',
      signal: input.signal,
    })

    return (await response.json()) as CreatedTransfer
  }

  async function uploadProxied(input: CreateFileInput, size: number | undefined): Promise<CreatedTransfer> {
    const response = await transmit(doFetch, {
      url: joinUrl(config.baseUrl, ''),
      method: 'POST',
      headers: {
        ...baseHeaders,
        'content-type': input.contentType ?? 'application/octet-stream',
        [FILENAME_HEADER]: encodeURIComponent(input.filename),
        [PROTOCOL_HEADER]: String(PROTOCOL_VERSION),
      },
      body: input.body,
      size,
      signal: input.signal,
      onProgress: input.onProgress,
      allowXhr: config.fetch == null,
    })

    if (!response.ok) throw await toTransferError(response)

    return (await response.json()) as CreatedTransfer
  }

  /** 404 is a value here, not an error: an unknown code is an ordinary outcome. */
  async function sendAllowingMissing(path: string, init: RequestInit): Promise<Response | null> {
    try {
      return await send(path, init)
    } catch (error) {
      if (isTransferError(error) && error.code === 'NOT_FOUND') return null
      throw error
    }
  }

  return {
    async createSnapshot(input) {
      const body: CreateSnapshotBody = { data: input.data, version: input.version, device: input.device }

      const response = await send('', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: input.signal,
      })

      return (await response.json()) as CreatedTransfer
    },

    async createFile(input) {
      const mode = config.upload ?? 'proxy'
      const size = input.size ?? sizeOf(input.body)

      if (mode === 'presign' && size == null) {
        throw new TransferError(
          'INVALID_REQUEST',
          'A presigned upload needs the body size upfront: pass `size` along with a stream.',
        )
      }

      if (mode !== 'proxy' && !presignRefused && size != null) {
        const upload = await requestUpload(input, size)
        if (upload) return uploadPresigned(input, upload, size)
      }

      return uploadProxied(input, size)
    },

    async read(code, options = {}) {
      const response = await sendAllowingMissing(`/${encodeURIComponent(code)}`, {
        method: 'GET',
        signal: options.signal,
      })

      return response ? ((await response.json()) as TransferMetadata) : null
    },

    async readBytes(code, options = {}) {
      const response = await sendAllowingMissing(`/${encodeURIComponent(code)}/raw`, {
        method: 'GET',
        signal: options.signal,
      })

      if (!response) return null

      return options.onProgress
        ? readCounted(response, options.onProgress)
        : new Uint8Array(await response.arrayBuffer())
    },

    async remove(code, options = {}) {
      await sendAllowingMissing(`/${encodeURIComponent(code)}`, { method: 'DELETE', signal: options.signal })
    },
  }
}
