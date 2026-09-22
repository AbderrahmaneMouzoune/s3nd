import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import { DROP_HEADERS, decodeHeaderValue } from './options'
import { store } from './store'

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

/**
 * Where a guard lives: beside its transfer, under a segment no code can ever
 * be, so the protocol routes cannot reach it. The same prefix, so the same
 * lifecycle rule sweeps both.
 */
function guardKey(code: string): string {
  return `meta/${code}`
}

export interface GuardPassword {
  /** Base64url, 16 bytes. */
  salt: string
  /** Base64url scrypt of the passphrase under that salt. */
  hash: string
}

/**
 * What this deployment knows about a transfer that the protocol does not: who
 * sent it, what they wrote on it, whether it burns after one download, and the
 * password, as a hash nobody can read back.
 *
 * It is a snapshot written under the transfer's own expiry, so a guard cannot
 * outlive what it guards — and cannot be handed over once its transfer is gone.
 */
export interface DropGuard {
  device?: string
  note?: string
  oneTime: boolean
  password?: GuardPassword
}

/** Compares two strings without leaking, through timing, where they differ. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)

  return a.length === b.length && timingSafeEqual(a, b)
}

export async function hashPassphrase(passphrase: string): Promise<GuardPassword> {
  const salt = randomBytes(16)
  const hash = await scrypt(passphrase.normalize('NFKC'), salt, 32)

  return { salt: salt.toString('base64url'), hash: hash.toString('base64url') }
}

export async function passphraseMatches(password: GuardPassword, candidate: string): Promise<boolean> {
  const hash = await scrypt(candidate.normalize('NFKC'), Buffer.from(password.salt, 'base64url'), 32)

  return sameSecret(hash.toString('base64url'), password.hash)
}

/**
 * The value of the cookie a browser carries once it has typed the password.
 *
 * It is derived from the stored hash, which never leaves the server, so it
 * cannot be guessed from the code and needs no secret of its own to sign; it
 * stops being valid the moment the transfer — and with it the guard — is gone.
 */
export function unlockToken(password: GuardPassword): string {
  return createHash('sha256').update(`${password.salt}:${password.hash}`).digest('base64url')
}

/** Whether a cookie this browser sent is the token that guard expects. */
export function matchesUnlockToken(password: GuardPassword, value: string | undefined): boolean {
  return value != null && sameSecret(value, unlockToken(password))
}

/** Cookies are per-code, so unlocking one transfer unlocks nothing else. */
export function unlockCookieName(code: string): string {
  return `drop_unlock_${code}`
}

/** One cookie out of a `Cookie` header, without pulling in a parser. */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== name) continue

    return decodeURIComponent(part.slice(separator + 1).trim())
  }

  return undefined
}

/**
 * The passphrases a request offers: our own header, which is percent-encoded
 * and therefore exact, or a bearer token so `s3nd get --token …` works.
 *
 * A raw header is bytes, and Node hands them over read as latin-1. A client
 * that sent UTF-8 — anything with an accent in it — meant the other reading,
 * so both are tried when they differ.
 */
export function offeredPassphrases(request: Request): string[] {
  const header = decodeHeaderValue(request.headers.get(DROP_HEADERS.passphrase))
  if (header) return [header]

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || undefined
  if (!bearer) return []

  const asUtf8 = Buffer.from(bearer, 'latin1').toString('utf8')

  return asUtf8 === bearer ? [bearer] : [bearer, asUtf8]
}

/**
 * Whether this request may see what is behind the code. A transfer without a
 * password is open to whoever holds the code — that is the whole design; one
 * with a password wants the cookie from an earlier unlock, or the passphrase
 * itself on this request.
 */
export async function isUnlocked(code: string, guard: DropGuard | null, request: Request): Promise<boolean> {
  const password = guard?.password
  if (!password) return true

  if (matchesUnlockToken(password, readCookie(request.headers.get('cookie'), unlockCookieName(code)))) return true

  for (const offered of offeredPassphrases(request)) {
    if (await passphraseMatches(password, offered)) return true
  }

  return false
}

/**
 * Writes the guard for a fresh code. `ifAbsent` because the code was just
 * claimed by the handler: anything already there is not ours to replace.
 */
export async function writeGuard(code: string, guard: DropGuard, expiresIn: number): Promise<void> {
  await store().putSnapshot(guardKey(code), guard, { app: 'drop', expiresIn, ifAbsent: true })
}

/** The guard for a code, or `null` when it has none — most transfers do not. */
export async function readGuard(code: string): Promise<DropGuard | null> {
  const snapshot = await store().getSnapshot<DropGuard>(guardKey(code))

  return snapshot?.data ?? null
}

/** Burns the guard. Deleting one that was never written is not an error. */
export async function removeGuard(code: string): Promise<void> {
  await store().delete(guardKey(code))
}
