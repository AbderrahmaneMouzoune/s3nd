/**
 * What a sender may decide about their own transfer, and how it travels.
 *
 * The protocol's `POST /` takes a body and a filename; everything else here is
 * this deployment's own vocabulary, carried in `x-drop-*` headers so the four
 * routes keep the shape every s3nd client already speaks. A client that knows
 * none of these headers — the CLI, `@s3nd/react` — gets the defaults.
 *
 * The browser bundles this module too, so it reads no environment and imports
 * nothing from Node: the limits are passed in, and the server is the only
 * place that knows them.
 */

export const DROP_HEADERS = {
  /** Seconds this one transfer should live. */
  expiresIn: 'x-drop-expires-in',
  /** The password the receiver will have to type. */
  passphrase: 'x-drop-passphrase',
  /** A line shown beside the file on the pickup page. */
  note: 'x-drop-note',
  /** Free label for the machine that sent it: "Chrome on macOS". */
  device: 'x-drop-device',
  /** `1` burns the transfer as soon as it has been downloaded once. */
  once: 'x-drop-once',
} as const

/** An answer carries this when the code exists but is waiting for its password. */
export const PROTECTED_HEADER = 'x-drop-protected'

/** The longest note a sender may attach to a transfer. */
export const NOTE_MAX_LENGTH = 280

export const PASSPHRASE_MIN_LENGTH = 4
export const PASSPHRASE_MAX_LENGTH = 128

/** The lifetimes the form offers, before a deployment's ceiling is applied. */
const EXPIRY_LADDER = [600, 3600, 6 * 3600, 12 * 3600, 86_400, 3 * 86_400, 7 * 86_400]

export interface ExpiryLimits {
  /** What a transfer gets when nobody chooses. */
  expiresIn: number
  /** The longest a sender may ask for. */
  maxExpiresIn: number
}

export interface ExpiryChoice {
  seconds: number
  /** `10 min`, `6 h`, `3 days`. */
  label: string
}

/** `10 min`, `6 h`, `3 days`: a duration as the rest of the template says it. */
export function durationLabel(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  if (seconds < 48 * 3600) return `${Math.round(seconds / 3600)} h`

  return `${Math.round(seconds / 86_400)} days`
}

/**
 * Every lifetime this deployment offers: the rungs of the ladder that fit
 * under its ceiling, plus the configured default wherever it falls.
 */
export function expiryChoices(limits: ExpiryLimits): ExpiryChoice[] {
  const seconds = new Set(EXPIRY_LADDER.filter((value) => value <= limits.maxExpiresIn))
  seconds.add(limits.expiresIn)

  return [...seconds].sort((a, b) => a - b).map((value) => ({ seconds: value, label: durationLabel(value) }))
}

/**
 * The lifetime a request actually gets: the choice it asked for, or the
 * longest one under it. Only the offered values are reachable, so no caller
 * can invent a lifetime of its own — and the server keeps one handler per
 * choice rather than one per request.
 */
export function resolveExpiresIn(requested: number | undefined, limits: ExpiryLimits): number {
  if (requested == null || !Number.isFinite(requested) || requested <= 0) return limits.expiresIn

  const choices = expiryChoices(limits)
  const exact = choices.find((choice) => choice.seconds === Math.round(requested))
  if (exact) return exact.seconds

  const under = choices.filter((choice) => choice.seconds < requested).pop()

  return under?.seconds ?? choices[0]!.seconds
}

/**
 * Header values are ASCII, and a note or a device name is not. Both sides
 * percent-encode, the same way the protocol already carries a filename.
 */
export function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value)
}

export function decodeHeaderValue(value: string | null): string | undefined {
  if (value == null || value.length === 0) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** A note as it will be stored: trimmed, collapsed, and cut to length. */
export function normalizeNote(note: string | undefined): string | undefined {
  const cleaned = note?.replace(/\s+/g, ' ').trim()

  return cleaned ? cleaned.slice(0, NOTE_MAX_LENGTH) : undefined
}

/** A device label as it will be stored. */
export function normalizeDevice(device: string | undefined): string | undefined {
  const cleaned = device?.replace(/\s+/g, ' ').trim()

  return cleaned ? cleaned.slice(0, 60) : undefined
}

export interface SendOptions {
  /** Seconds. Clamped to what this deployment allows before it is used. */
  expiresIn: number
  passphrase?: string
  note?: string
  device?: string
  oneTime: boolean
}

/** What the sender asked for on this upload, read off the request headers. */
export function readSendOptions(request: Request, limits: ExpiryLimits): SendOptions {
  const raw = request.headers.get(DROP_HEADERS.expiresIn)
  const passphrase = decodeHeaderValue(request.headers.get(DROP_HEADERS.passphrase))

  return {
    expiresIn: resolveExpiresIn(raw == null || raw.trim() === '' ? undefined : Number(raw), limits),
    passphrase: passphrase?.slice(0, PASSPHRASE_MAX_LENGTH) || undefined,
    note: normalizeNote(decodeHeaderValue(request.headers.get(DROP_HEADERS.note))),
    device: normalizeDevice(decodeHeaderValue(request.headers.get(DROP_HEADERS.device))),
    oneTime: request.headers.get(DROP_HEADERS.once) === '1',
  }
}

/** The headers an upload carrying these options sends. */
export function sendOptionHeaders(options: SendOptions): Record<string, string> {
  const headers: Record<string, string> = { [DROP_HEADERS.expiresIn]: String(options.expiresIn) }

  if (options.passphrase) headers[DROP_HEADERS.passphrase] = encodeHeaderValue(options.passphrase)
  if (options.note) headers[DROP_HEADERS.note] = encodeHeaderValue(options.note)
  if (options.device) headers[DROP_HEADERS.device] = encodeHeaderValue(options.device)
  if (options.oneTime) headers[DROP_HEADERS.once] = '1'

  return headers
}
