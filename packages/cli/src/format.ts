import { homedir } from 'node:os'
import { sep } from 'node:path'

import { CliError } from './errors.js'

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']

/** What a person checks a transfer against is "284 kB", never 284_137. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return 'unknown size'

  let value = bytes
  let unit = 0

  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit += 1
  }

  return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${UNITS[unit]}`
}

const MINUTE = 60
const HOUR = 3600
const DAY = 86_400

/** The inverse of `parseDuration`, rounded to the unit a person would say. */
export function formatDuration(seconds: number): string {
  if (seconds % DAY === 0) return plural(seconds / DAY, 'day')
  if (seconds % HOUR === 0) return plural(seconds / HOUR, 'hour')
  if (seconds % MINUTE === 0) return plural(seconds / MINUTE, 'minute')

  return plural(seconds, 'second')
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

const DURATION = /^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/i

const MULTIPLIER: Record<string, number> = { s: 1, m: MINUTE, h: HOUR, d: DAY }

/**
 * Seconds, or a duration a person would write: `30m`, `24h`, `7d`. `0`, `null`
 * and `never` all mean a transfer that does not expire — which is the answer to
 * "what is 0 seconds supposed to be", the one reading of it nobody wants.
 */
export function parseDuration(raw: string | number | null | undefined, label: string): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) throw invalidDuration(label, String(raw))
    return raw === 0 ? null : raw
  }

  const trimmed = raw.trim()
  if (trimmed.toLowerCase() === 'never') return null

  const match = DURATION.exec(trimmed)
  if (!match) throw invalidDuration(label, raw)

  const value = Number(match[1]) * MULTIPLIER[(match[2] ?? 's').toLowerCase()]!

  return value === 0 ? null : value
}

function invalidDuration(label: string, received: string): CliError {
  return new CliError(
    `${label} must be a duration: seconds, or a number followed by s, m, h or d (received "${received}").`,
    'Examples: 90s, 30m, 24h, 7d — or "never" for a transfer that does not expire.',
  )
}

export interface Style {
  green(text: string): string
  yellow(text: string): string
  red(text: string): string
  bold(text: string): string
  dim(text: string): string
}

const PLAIN: Style = {
  green: (text) => text,
  yellow: (text) => text,
  red: (text) => text,
  bold: (text) => text,
  dim: (text) => text,
}

/**
 * Colour when a terminal is reading and not otherwise: piping `s3nd put` into
 * anything, or running it in CI, should not produce escape codes. `NO_COLOR` is
 * honoured because <https://no-color.org> asks, and because it is one `if`.
 */
export function createStyle(stream: { isTTY?: boolean }, env: Record<string, string | undefined>): Style {
  const enabled = Boolean(stream.isTTY) && !env.NO_COLOR && env.TERM !== 'dumb'
  if (!enabled) return PLAIN

  const wrap = (open: number, close: number) => (text: string) => `\u001B[${open}m${text}\u001B[${close}m`

  return {
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    red: wrap(31, 39),
    bold: wrap(1, 22),
    dim: wrap(2, 22),
  }
}

/** `/home/you/.config/s3nd/config.json` reads as `~/.config/s3nd/config.json`. */
export function tildify(path: string, home = homedir()): string {
  if (!home) return path
  if (path === home) return '~'

  return path.startsWith(`${home}${sep}`) ? `~${path.slice(home.length)}` : path
}

export interface ProgressSnapshot {
  loaded: number
  total?: number
}

const BAR_WIDTH = 24

/**
 * One line of progress: a bar and a percentage when the total is known, then
 * bytes and throughput. `284 kB/s` is what tells a slow link from a stuck one.
 */
export function renderProgress({ loaded, total }: ProgressSnapshot, elapsedMs: number): string {
  const rate = elapsedMs > 0 ? (loaded * 1000) / elapsedMs : 0
  const speed = `${formatBytes(Math.round(rate))}/s`

  if (total == null || total <= 0) return `${formatBytes(loaded)} · ${speed}`

  const ratio = Math.min(loaded / total, 1)
  const filled = Math.round(ratio * BAR_WIDTH)
  const bar = `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`

  return `${bar} ${String(Math.floor(ratio * 100)).padStart(3)}% · ${formatBytes(loaded)} / ${formatBytes(total)} · ${speed}`
}

export interface Progress {
  update(progress: ProgressSnapshot): void
  /** Clears the line, so whatever is printed next starts clean. */
  finish(): void
}

const SILENT: Progress = { update: () => {}, finish: () => {} }
/** Redraws at most this often: a terminal does not need a frame per chunk. */
const REDRAW_MS = 100

/**
 * A progress line on `stream`, redrawn in place. Off unless `enabled`, which
 * the caller sets for a terminal and never for `--json`: a pipeline or a log
 * file should not fill with carriage returns.
 */
export function createProgress(
  stream: { write(text: string): unknown },
  enabled: boolean,
  now: () => number = Date.now,
): Progress {
  if (!enabled) return SILENT

  const started = now()
  let drawn = false
  let lastDraw = Number.NEGATIVE_INFINITY

  return {
    update(progress) {
      const at = now()
      const done = progress.total != null && progress.loaded >= progress.total
      if (!done && at - lastDraw < REDRAW_MS) return

      lastDraw = at
      drawn = true
      stream.write(`\r${renderProgress(progress, at - started)}\u001B[K`)
    },
    finish() {
      if (drawn) stream.write('\r\u001B[K')
      drawn = false
    },
  }
}
