import { syncCodeAlphabets } from '../sync-code.js'
import { DELETE_TOKEN_HEADER, type UploadMode } from '../types.js'
import {
  burn,
  call,
  expectCreated,
  expectError,
  expectJson,
  expectStatus,
  file,
  isDate,
  json,
  sameBytes,
  sleep,
  Skip,
  Violation,
  type Probe,
} from './http.js'
import type { ConformanceServer } from './index.js'

/** What the discovery requests found out about the server, for the checks after them. */
export interface Traits {
  /** Takes the bytes of a file in `POST /` (modes `proxy` and `both`). */
  proxy: boolean
  /** Hands out presigned upload URLs (modes `presign` and `both`). */
  presign: boolean
  /** Puts a `deleteToken` in the `201`. */
  deleteTokens: boolean
  /** Refuses a `DELETE` without the token. */
  protectDelete: boolean
}

export interface Context {
  probe: Probe
  server: ConformanceServer
  traits: Traits
}

const PROBE_DATA = { s3nd: 'conformance', list: [1, 'two', null], nested: { ok: true } }

/** Bytes that a text decoding or a newline conversion would change. */
function probeBytes(length = 64): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 37 + 13) % 256)
}

function path(code: string, tail = ''): string {
  return `/${encodeURIComponent(code)}${tail}`
}

async function createSnapshot(probe: Probe, body: unknown = { data: PROBE_DATA }) {
  const response = await call(probe, '', json(body))
  return expectCreated(await expectJson(response, 201, 'POST / (snapshot)'), 'snapshot', 'POST / (snapshot)')
}

async function createFile(probe: Probe, bytes: Uint8Array, filename: string, contentType?: string) {
  const response = await call(probe, '', file(bytes, filename, contentType))
  return expectCreated(await expectJson(response, 201, 'POST / (file)'), 'file', 'POST / (file)')
}

/** The bytes behind `/:code/raw`, following the server's `302` to storage when it answers one. */
async function readRaw(probe: Probe, code: string): Promise<{ bytes: Uint8Array; response: Response }> {
  const response = await call(probe, path(code, '/raw'))

  if (response.status === 302) {
    const location = response.headers.get('location')
    if (!location) throw new Violation('GET /:code/raw answered 302 without a location (section 5.3)')

    const stored = await probe.fetch(location, { signal: AbortSignal.timeout(probe.timeout) })
    if (!stored.ok) throw new Violation(`the location GET /:code/raw redirected to answered ${stored.status}`)

    return { bytes: new Uint8Array(await stored.arrayBuffer()), response }
  }

  await expectStatus(response, 200, 'GET /:code/raw')
  return { bytes: new Uint8Array(await response.arrayBuffer()), response }
}

/**
 * A code that normalizes but holds nothing: one the server issued, then
 * burned. Codes are the server's to pick (section 3.1), so this is the only
 * way to get a well-formed one without knowing its alphabet.
 */
async function unknownCode(context: Context): Promise<string> {
  const created = await createSnapshot(context.probe)
  await expectStatus(await burn(context.probe, created.code, created.deleteToken), 204, 'DELETE /:code')
  return created.code
}

/** Burns what a check created, so a run leaves nothing behind. */
async function cleanup(probe: Probe, code: string, deleteToken?: string): Promise<void> {
  await burn(probe, code, deleteToken).catch(() => undefined)
}

/**
 * Runs first: what this server does with files and with deletes decides what
 * the later checks expect. Where the caller said what the server is
 * configured with, the answers have to agree with it.
 */
export async function discover(probe: Probe, server: ConformanceServer): Promise<{ traits: Traits; detail: string }> {
  const created = await createSnapshot(probe)
  const deleteTokens = typeof created.deleteToken === 'string'

  // A DELETE without the token tells a protected server from an open one.
  const open = await call(probe, path(created.code), { method: 'DELETE' })
  let protectDelete: boolean
  if (open.status === 204) {
    protectDelete = false
  } else {
    await expectError(open, 'UNAUTHORIZED', 'DELETE /:code without a delete token')
    if (!deleteTokens) {
      throw new Violation('DELETE /:code needs a delete token, but POST / issued none (section 5.4)')
    }
    protectDelete = true
    await expectStatus(await burn(probe, created.code, created.deleteToken), 204, 'DELETE /:code with its token')
  }

  const proxied = await call(probe, '', file(probeBytes(3), 's3nd-conformance.bin'))
  let proxy: boolean
  if (proxied.status === 201) {
    proxy = true
    const body = expectCreated(await expectJson(proxied, 201, 'POST / (file)'), 'file', 'POST / (file)')
    await cleanup(probe, body.code, body.deleteToken)
  } else {
    await expectError(proxied, 'INVALID_REQUEST', 'POST / with the bytes of a file')
    proxy = false
  }

  const ticket = await call(probe, '', json({ upload: 'presign', filename: 's3nd-conformance.bin', size: 3 }))
  let presign: boolean
  if (ticket.status === 201) {
    presign = true
    const body = await expectJson(ticket, 201, 'POST / (presign)')
    // Burning a pending code removes the pending object (section 8.7).
    if (typeof body.code === 'string') await cleanup(probe, body.code)
  } else {
    await expectError(ticket, 'INVALID_REQUEST', 'POST / asking for a presigned upload')
    presign = false
  }

  if (!proxy && !presign) {
    throw new Violation('the server refuses files both in POST / and as presigned uploads (section 8.2)')
  }

  const mode: UploadMode = proxy && presign ? 'both' : proxy ? 'proxy' : 'presign'
  if (server.upload !== undefined && server.upload !== mode) {
    throw new Violation(`the server behaves as upload mode "${mode}", not the "${server.upload}" it is configured with`)
  }
  if (server.protectDelete !== undefined && server.protectDelete !== protectDelete) {
    throw new Violation(
      server.protectDelete
        ? 'the server burns a code without its delete token, though it is configured to require one'
        : 'the server requires a delete token, though it is configured not to',
    )
  }

  const detail = [
    `files: ${mode}`,
    deleteTokens ? `delete tokens issued${protectDelete ? ' and required' : ''}` : 'no delete tokens',
  ].join(', ')

  return { traits: { proxy, presign, deleteTokens, protectDelete }, detail }
}

export async function versionHeader({ probe }: Context): Promise<string> {
  // A 0.x client sends no header, and speaks version 1 (section 2.2).
  const legacy = await call(probe, '', { ...json({ data: PROBE_DATA }), protocol: null })
  const created = expectCreated(await expectJson(legacy, 201, 'POST / without s3nd-protocol'), 'snapshot', 'POST /')
  await cleanup(probe, created.code, created.deleteToken)

  for (const value of ['2', 'one', '1.5']) {
    const response = await call(probe, path(created.code), { protocol: value })
    await expectError(response, 'UNSUPPORTED_PROTOCOL', `GET /:code with s3nd-protocol: ${value}`)
  }

  return 'sent on every answer; a request without it is version 1; 2, "one" and "1.5" are refused'
}

export async function snapshots({ probe }: Context): Promise<string> {
  const created = await createSnapshot(probe, { data: PROBE_DATA, version: 3, device: 's3nd conformance' })

  try {
    const read = await expectJson(await call(probe, path(created.code)), 200, 'GET /:code')
    if (read.code !== created.code) throw new Violation('GET /:code: `code` is not the one POST / returned')
    if (read.kind !== 'snapshot') throw new Violation('GET /:code: `kind` is not "snapshot"')
    if (!isDate(read.createdAt)) throw new Violation('GET /:code: `createdAt` is not an ISO 8601 date')
    if (JSON.stringify(read.data) !== JSON.stringify(PROBE_DATA)) {
      throw new Violation('GET /:code: `data` is not the state that was sent')
    }
    if (read.version !== 3) throw new Violation('GET /:code: `version` is not the one that was sent')
    if (read.device !== 's3nd conformance') throw new Violation('GET /:code: `device` is not the one that was sent')

    // A snapshot's stored form is not part of the protocol (section 5.3).
    await expectError(await call(probe, path(created.code, '/raw')), 'NOT_FOUND', 'GET /:code/raw on a snapshot')
  } finally {
    await expectStatus(await burn(probe, created.code, created.deleteToken), 204, 'DELETE /:code')
  }

  await expectError(await call(probe, path(created.code)), 'NOT_FOUND', 'GET /:code after DELETE')
  await expectStatus(await burn(probe, created.code, created.deleteToken), 204, 'DELETE /:code a second time')

  // `data` is any JSON value, null included (section 5.1).
  const empty = await createSnapshot(probe, { data: null })
  await cleanup(probe, empty.code, empty.deleteToken)

  return 'create, read, /raw refused, delete, delete again; `data: null` accepted'
}

export async function files({ probe, traits }: Context): Promise<string> {
  if (!traits.proxy) throw new Skip('the server takes files only as presigned uploads')

  const bytes = probeBytes()
  const filename = 'conformance probe é.bin'
  const created = await createFile(probe, bytes, filename)

  try {
    const read = await expectJson(await call(probe, path(created.code)), 200, 'GET /:code')
    if (read.kind !== 'file') throw new Violation('GET /:code: `kind` is not "file"')
    if (read.filename !== filename) {
      throw new Violation(
        `GET /:code: \`filename\` is ${JSON.stringify(read.filename)}, not ${JSON.stringify(filename)}`,
      )
    }
    if (typeof read.contentType !== 'string') throw new Violation('GET /:code: a file has no `contentType`')
    if ('data' in read) throw new Violation('GET /:code: a file carries `data`; its bytes belong at /raw')

    const raw = await readRaw(probe, created.code)
    if (!sameBytes(raw.bytes, bytes)) throw new Violation('GET /:code/raw: the bytes are not the ones that were sent')

    if (raw.response.status === 200) {
      const disposition = raw.response.headers.get('content-disposition') ?? ''
      if (!disposition.includes(`filename*=UTF-8''${encodeURIComponent(filename)}`)) {
        throw new Violation(`GET /:code/raw: content-disposition "${disposition}" does not carry the filename`)
      }
    }
  } finally {
    await expectStatus(await burn(probe, created.code, created.deleteToken), 204, 'DELETE /:code')
  }

  await expectError(await call(probe, path(created.code, '/raw')), 'NOT_FOUND', 'GET /:code/raw after DELETE')

  return 'create, describe, bytes intact, content-disposition, delete'
}

export async function jsonFile({ probe, traits }: Context): Promise<string> {
  if (!traits.proxy) throw new Skip('the server takes files only as presigned uploads')

  // Section 4.1: x-s3nd-filename wins over content-type, which is what lets a
  // .json file travel as a file.
  const bytes = new TextEncoder().encode('{"data":{"looks":"like a snapshot"}}')
  const created = await createFile(probe, bytes, 'state.json', 'application/json')

  try {
    const raw = await readRaw(probe, created.code)
    if (!sameBytes(raw.bytes, bytes)) throw new Violation('GET /:code/raw: the .json file came back changed')
  } finally {
    await cleanup(probe, created.code, created.deleteToken)
  }

  return 'stored as a file, bytes unchanged'
}

export async function requests(context: Context): Promise<string> {
  const { probe, traits } = context

  await expectError(
    await call(probe, '', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }),
    'INVALID_REQUEST',
    'POST / with a body that is not JSON',
  )
  await expectError(await call(probe, '', json({ state: 1 })), 'INVALID_REQUEST', 'POST / without `data`')
  await expectError(await call(probe, '', json([1, 2])), 'INVALID_REQUEST', 'POST / with an array')

  if (traits.proxy) {
    await expectError(
      await call(probe, '', file(new Uint8Array(0), 'empty.bin')),
      'INVALID_REQUEST',
      'POST / with an empty file',
    )
  }

  const code = await unknownCode(context)
  await expectError(await call(probe, '', { method: 'PUT', body: 'x' }), 'INVALID_REQUEST', 'PUT /')
  await expectError(await call(probe, path(code), { method: 'PATCH', body: 'x' }), 'INVALID_REQUEST', 'PATCH /:code')
  await expectError(await call(probe, path(code, '/nothing-here')), 'NOT_FOUND', 'GET /:code/nothing-here')

  return 'bad JSON, no `data`, an array, an empty file, other methods and unknown routes'
}

/** Inserts separators the way a person copying a code does (section 3.2, step 1). */
function separated(code: string): string {
  const half = Math.ceil(code.length / 2)
  return ` ${code.slice(0, half)}-${code.slice(half)} `
}

export async function codes(context: Context): Promise<string> {
  const { probe, server } = context
  const alphabet = server.alphabet ?? syncCodeAlphabets.crockford
  const created = await createSnapshot(probe)
  const tried: string[] = []

  const resolves = async (input: string, what: string) => {
    const read = await expectJson(await call(probe, path(input)), 200, `GET /:code ${what}`)
    if (read.code !== created.code) throw new Violation(`GET /:code ${what}: answered for another code`)
    tried.push(what)
  }

  try {
    await resolves(separated(created.code), 'with spaces and a dash')
    await resolves(created.code.split('').join('_'), 'with underscores')

    const letters = /[A-Z]/.test(alphabet)
    if (letters && alphabet === alphabet.toUpperCase() && /[A-Z]/.test(created.code)) {
      await resolves(created.code.toLowerCase(), 'in lower case')
    }

    if (alphabet.includes('0') && !alphabet.includes('O') && created.code.includes('0')) {
      await resolves(created.code.replace('0', 'O'), 'with O for 0')
    }
    for (const lookalike of ['I', 'L']) {
      if (alphabet.includes('1') && !alphabet.includes(lookalike) && created.code.includes('1')) {
        await resolves(created.code.replace('1', lookalike), `with ${lookalike} for 1`)
      }
    }

    const outside = ['!', '~', '*'].find((character) => !alphabet.includes(character))!
    await expectError(
      await call(probe, path(`${created.code.slice(0, -1)}${outside}`)),
      'INVALID_SYNC_CODE',
      `GET /:code with "${outside}" in it`,
    )
    // Written into the path as is: "%E0" does not percent-decode.
    await expectError(await call(probe, '/%E0'), 'INVALID_SYNC_CODE', 'GET /%E0')
  } finally {
    await cleanup(probe, created.code, created.deleteToken)
  }

  const code = await unknownCode(context)
  await expectError(await call(probe, path(code)), 'NOT_FOUND', 'GET /:code on an unknown code')
  await expectError(await call(probe, path(code, '/raw')), 'NOT_FOUND', 'GET /:code/raw on an unknown code')

  return `resolves ${tried.join(', ')}; refuses a stray character and bad percent-encoding; unknown is NOT_FOUND`
}

export async function expiry({ probe, server, traits }: Context): Promise<string> {
  const created = await createSnapshot(probe)
  const issued: { code: string; deleteToken?: string; expiresAt?: string; raw: boolean }[] = [
    { ...created, raw: false },
  ]

  try {
    if (server.expiresIn === undefined) {
      if (created.expiresAt !== undefined && Date.parse(created.expiresAt) <= Date.parse(created.createdAt)) {
        throw new Violation('POST /: `expiresAt` is not after `createdAt`')
      }
      throw new Skip('pass `server.expiresIn` to check expiry against the configured lifetime')
    }

    if (server.expiresIn === null) {
      if (created.expiresAt !== undefined) {
        throw new Violation('POST /: `expiresAt` is set, though transfers are configured not to expire (section 4.2)')
      }
      return 'no `expiresAt` on a transfer that does not expire'
    }

    if (created.expiresAt === undefined) throw new Violation('POST /: no `expiresAt` on an expiring transfer')

    const lifetime = (Date.parse(created.expiresAt) - Date.parse(created.createdAt)) / 1000
    if (Math.abs(lifetime - server.expiresIn) > 5) {
      throw new Violation(`POST /: \`expiresAt\` is ${lifetime}s after \`createdAt\`, not ${server.expiresIn}s`)
    }

    const wait = server.expiryWait ?? 15
    if (server.expiresIn > wait) {
      return `\`expiresAt\` is ${server.expiresIn}s out; not waiting for it (over the ${wait}s expiryWait)`
    }

    if (traits.proxy) {
      const stored = await createFile(probe, probeBytes(8), 'expiring.bin')
      issued.push({ ...stored, raw: true })
    }

    const latest = Math.max(...issued.map((transfer) => Date.parse(transfer.expiresAt ?? created.expiresAt!)))
    await sleep(Math.max(0, latest - Date.now()) + 1500)

    // Expired reads exactly as unknown, on every route (section 4.2).
    for (const transfer of issued) {
      await expectError(await call(probe, path(transfer.code)), 'NOT_FOUND', 'GET /:code once expired')
      if (transfer.raw) {
        await expectError(await call(probe, path(transfer.code, '/raw')), 'NOT_FOUND', 'GET /:code/raw once expired')
      }
    }

    return `\`expiresAt\` matches ${server.expiresIn}s; expired transfers read as NOT_FOUND`
  } finally {
    for (const transfer of issued) await cleanup(probe, transfer.code, transfer.deleteToken)
  }
}

export async function size({ probe, server, traits }: Context): Promise<string> {
  if (server.maxSize === undefined) throw new Skip('pass `server.maxSize` to check TOO_LARGE')

  if (traits.proxy) {
    const over = new Uint8Array(server.maxSize + 1)
    await expectError(await call(probe, '', file(over, 'too-large.bin')), 'TOO_LARGE', 'POST / one byte over the limit')
  }

  if (traits.presign) {
    const ticket = await call(
      probe,
      '',
      json({ upload: 'presign', filename: 'too-large.bin', size: server.maxSize + 1 }),
    )
    await expectError(ticket, 'TOO_LARGE', 'POST / asking to presign one byte over the limit')
  }

  return `one byte over ${server.maxSize} is TOO_LARGE`
}

function listed(value: string | null, wanted: string[]): string[] {
  if (value?.trim() === '*') return []

  const have = new Set((value ?? '').split(',').map((item) => item.trim().toLowerCase()))
  return wanted.filter((item) => !have.has(item.toLowerCase()))
}

export async function cors(context: Context): Promise<string> {
  const { probe, server } = context
  if (!server.cors) throw new Skip('pass `server.cors.origin` to check cross-origin requests')

  const { origin } = server.cors
  const code = await unknownCode(context)

  // A browser sends a preflight without credentials (section 7).
  for (const route of ['', path(code)]) {
    const preflight = await call(probe, route, {
      method: 'OPTIONS',
      bare: true,
      protocol: null,
      headers: {
        origin,
        'access-control-request-method': 'DELETE',
        'access-control-request-headers': 'content-type, authorization, s3nd-protocol, x-s3nd-filename',
      },
    })
    const what = `OPTIONS ${route ? '/:code' : '/'} from ${origin}`
    await expectStatus(preflight, 204, what)

    const allowed = preflight.headers.get('access-control-allow-origin')
    if (allowed !== origin && allowed !== '*') {
      throw new Violation(`${what}: access-control-allow-origin is ${JSON.stringify(allowed)}`)
    }
    if (allowed === '*' && preflight.headers.get('access-control-allow-credentials') === 'true') {
      throw new Violation(`${what}: allows any origin with credentials (section 7)`)
    }

    const methods = listed(preflight.headers.get('access-control-allow-methods'), ['GET', 'POST', 'DELETE'])
    if (methods.length > 0) throw new Violation(`${what}: access-control-allow-methods lacks ${methods.join(', ')}`)

    const headers = listed(preflight.headers.get('access-control-allow-headers'), [
      'content-type',
      'authorization',
      's3nd-protocol',
      'x-s3nd-filename',
      DELETE_TOKEN_HEADER,
    ])
    if (headers.length > 0) throw new Violation(`${what}: access-control-allow-headers lacks ${headers.join(', ')}`)
  }

  // An error has to reach the page too, or the client cannot read it.
  const error = await call(probe, path(code), { headers: { origin } })
  await expectError(error.clone(), 'NOT_FOUND', `GET /:code from ${origin}`)

  const allowed = error.headers.get('access-control-allow-origin')
  if (allowed !== origin && allowed !== '*') {
    throw new Violation(`a 404 to ${origin} has access-control-allow-origin ${JSON.stringify(allowed)}`)
  }
  const exposed = listed(error.headers.get('access-control-expose-headers'), ['s3nd-protocol', 'content-disposition'])
  if (exposed.length > 0) throw new Violation(`access-control-expose-headers lacks ${exposed.join(', ')}`)

  return `preflights answered for ${origin}, errors readable cross-origin`
}

export async function presigned(context: Context): Promise<string> {
  const { probe, traits } = context
  if (!traits.presign) throw new Skip('the server does not offer presigned uploads')

  const bytes = probeBytes(32)
  const ticket = await expectJson(
    await call(
      probe,
      '',
      json({
        upload: 'presign',
        filename: 'presigned.bin',
        size: bytes.byteLength,
        contentType: 'application/octet-stream',
      }),
    ),
    201,
    'POST / (presign)',
  )

  const { code, uploadUrl, method, headers, expiresAt } = ticket
  if (typeof code !== 'string' || typeof uploadUrl !== 'string')
    throw new Violation('POST / (presign): no `code` or `uploadUrl`')
  if (method !== 'PUT') throw new Violation(`POST / (presign): \`method\` is ${JSON.stringify(method)}, not "PUT"`)
  if (typeof headers !== 'object' || headers === null)
    throw new Violation('POST / (presign): `headers` is not an object')
  if (!isDate(expiresAt)) throw new Violation('POST / (presign): `expiresAt` is not an ISO 8601 date')

  let deleteToken: string | undefined
  try {
    await expectError(await call(probe, path(code)), 'NOT_FOUND', 'GET /:code before completion')

    // Straight to storage, with exactly the headers the server signed, and
    // never the server's own credentials (section 8.5).
    const put = await probe.fetch(uploadUrl, {
      method: 'PUT',
      headers: headers as Record<string, string>,
      body: bytes as BodyInit,
      signal: AbortSignal.timeout(probe.timeout),
    })
    if (!put.ok) throw new Violation(`PUT to the uploadUrl answered ${put.status}`)

    const completed = expectCreated(
      await expectJson(await call(probe, path(code, '/complete'), { method: 'POST' }), 201, 'POST /:code/complete'),
      'file',
      'POST /:code/complete',
    )
    deleteToken = completed.deleteToken
    if (completed.code !== code) throw new Violation('POST /:code/complete answered for another code')

    // A client that lost the first answer retries (section 8.6).
    const again = await expectJson(
      await call(probe, path(code, '/complete'), { method: 'POST' }),
      201,
      'POST /:code/complete again',
    )
    if (again.code !== code) throw new Violation('POST /:code/complete again answered for another code')
    if (again.deleteToken !== undefined) throw new Violation('POST /:code/complete handed the delete token out twice')

    const read = await expectJson(await call(probe, path(code)), 200, 'GET /:code once completed')
    if (read.kind !== 'file') throw new Violation('GET /:code once completed: `kind` is not "file"')

    const raw = await readRaw(probe, code)
    if (!sameBytes(raw.bytes, bytes)) throw new Violation('GET /:code/raw: the uploaded bytes came back changed')
  } finally {
    await cleanup(probe, code, deleteToken)
  }

  const unknown = await unknownCode(context)
  await expectError(
    await call(probe, path(unknown, '/complete'), { method: 'POST' }),
    'NOT_FOUND',
    'POST /:code/complete on a code with nothing pending',
  )

  return 'upload URL, NOT_FOUND until completed, completion and its retry, bytes intact'
}

export async function deleteTokens({ probe, traits }: Context): Promise<string> {
  if (!traits.deleteTokens) throw new Skip('the server issues no delete tokens')

  const first = await createSnapshot(probe)
  const second = await createSnapshot(probe)
  const tokens = [first.deleteToken!, second.deleteToken!] as const

  try {
    // 128 bits at least (section 5.4): 22 characters of base64url, 32 of hex.
    if (tokens.some((token) => token.length < 22)) throw new Violation('a delete token is shorter than 128 bits allows')
    if (tokens[0] === tokens[1]) throw new Violation('two transfers were issued the same delete token')

    if (!traits.protectDelete) return 'issued, distinct, long enough; deletion is open without them'

    const wrong = await call(probe, path(first.code), {
      method: 'DELETE',
      headers: { [DELETE_TOKEN_HEADER]: tokens[1] },
    })
    await expectError(wrong, 'UNAUTHORIZED', "DELETE /:code with another transfer's token")
    await expectStatus(await call(probe, path(first.code)), 200, 'GET /:code after a refused DELETE')

    await expectStatus(await burn(probe, first.code, tokens[0]), 204, 'DELETE /:code with its token')
    // Nothing stored any more, and a token sent: 204 (section 5.4).
    await expectStatus(await burn(probe, first.code, tokens[0]), 204, 'DELETE /:code with its token, again')

    // `authorization: Bearer` works too, unless it already carries the
    // server's own credentials.
    if (!Object.keys(probe.headers).some((name) => name.toLowerCase() === 'authorization')) {
      const bearer = await call(probe, path(second.code), {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokens[1]}` },
      })
      await expectStatus(bearer, 204, 'DELETE /:code with authorization: Bearer')
    }

    return 'issued, distinct, long enough; required, a wrong one refused, the right one accepted'
  } finally {
    await cleanup(probe, first.code, tokens[0])
    await cleanup(probe, second.code, tokens[1])
  }
}

export async function rateLimit(context: Context): Promise<string> {
  const { probe, server } = context
  if (!server.rateLimit) throw new Skip('pass `server.rateLimit.requests` to check RATE_LIMITED')

  const code = await unknownCode(context)

  for (let attempt = 1; attempt <= server.rateLimit.requests + 1; attempt++) {
    const response = await call(probe, path(code))
    if (response.status === 404) continue

    await expectError(response.clone(), 'RATE_LIMITED', `GET /:code, request ${attempt}`)
    const retryAfter = response.headers.get('retry-after')
    if (retryAfter !== null && !/^\d+$/.test(retryAfter.trim())) {
      throw new Violation(`retry-after is "${retryAfter}", not a number of seconds (section 9)`)
    }

    return `request ${attempt} on one code refused with RATE_LIMITED${retryAfter === null ? '' : `, retry-after ${retryAfter}s`}`
  }

  throw new Violation(`${server.rateLimit.requests + 1} requests on one code, and none was refused with RATE_LIMITED`)
}
