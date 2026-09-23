/*
 * The launch film's score sheet. Everything that moves on screen and everything
 * that makes a sound is placed here, once: the renderer draws from it and the
 * soundtrack is synthesised from `audioEvents()`, so a tile never flips a frame
 * away from its click.
 */

export const FPS = 60
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 56
export const BPM = 120
export const BEAT = 60 / BPM

/** Crockford base32, the alphabet a code tile spins through. */
export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const BOARD_ALPHABET = ALPHABET + ' ·-.'

export const CODE = 'K7QP2M4X'

/** Deterministic noise: the same input always gives the same number in [0, 1). */
export function hash(...values) {
  let h = 2166136261
  for (const value of values) {
    const s = String(value)
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 0x9e3779b9
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/* ─── Split-flap rows ────────────────────────────────────────────────────── */

/**
 * One row of tiles. Each tile starts spinning at `start + i * stagger` and
 * settles on its character at `settle + i * cascade`, flipping every `period`.
 */
function flapRow(id, text, { start, settle, stagger = 0, cascade = 0.09, period = 0.065, alphabet = ALPHABET }) {
  return text.split('').map((target, i) => {
    const from = start + i * stagger
    const to = Math.max(from + period, settle + i * cascade)
    const count = Math.max(1, Math.round((to - from) / period))
    const chars = [' ']
    for (let k = 1; k < count; k++) chars.push(alphabet[Math.floor(hash(id, i, k) * alphabet.length)])
    chars.push(target)
    return { id: `${id}:${i}`, from, period: (to - from) / count, chars }
  })
}

/** What a tile shows at time t: the character it leaves, the one it lands on, and how far the leaf has fallen. */
export function flapState(tile, t) {
  const { from, period, chars } = tile
  if (t < from) return { prev: ' ', next: ' ', p: 1, idle: true }
  const k = Math.floor((t - from) / period)
  if (k >= chars.length - 1) return { prev: chars.at(-1), next: chars.at(-1), p: 1 }
  const p = (t - from - k * period) / period
  return { prev: chars[k], next: chars[k + 1], p }
}

export const SCENE = {
  intro: [0, 10],
  reveal: [10, 18],
  journey: [18, 32],
  board: [32, 37],
  manifesto: [37, 44],
  finale: [44, DURATION],
}

export const DROP = 12
export const FINALE_HIT = 45.4

export const heroCode = flapRow('hero', CODE, { start: DROP + 0.02, settle: DROP + 0.72, stagger: 0.035, cascade: 0.1 })

export const BOARD_ROWS = [
  ['K7QP2M4X', 'REPORT.PDF', 'CLOUDFLARE R2', 'DELIVERED'],
  ['9FZT3WQ1', 'NOTES · 200', 'AWS S3', 'BOARDING'],
  ['M4XR8HV2', 'PROJECT.TAR.GZ', 'MINIO', 'ON TIME'],
  ['2B7NQE5K', 'APP STATE V3', 'SCALEWAY', 'BOARDING'],
  ['HX3P6TA9', 'DESIGN.FIG', 'WASABI', 'ON TIME'],
  ['V8CW1R7D', 'PHOTOS.ZIP', 'ANY S3', 'ON TIME'],
]
export const BOARD_COLUMNS = [8, 15, 13, 9]
export const BOARD_START = 32.35

export const boardRows = BOARD_ROWS.map((cells, r) => {
  const text = cells.map((cell, c) => cell.padEnd(BOARD_COLUMNS[c], ' ')).join('')
  const start = BOARD_START + r * 0.42
  return flapRow(`board${r}`, text, {
    start,
    settle: start + 0.45,
    stagger: 0.012,
    cascade: 0.016,
    period: 0.07,
    alphabet: BOARD_ALPHABET,
  })
})

export const terminalCode = flapRow('terminal', CODE, {
  start: 20.3,
  settle: 20.62,
  stagger: 0.02,
  cascade: 0.045,
  period: 0.05,
})

export const boardingRow = flapRow('boarding', 'NOW BOARDING', {
  start: 50.4,
  settle: 51.0,
  stagger: 0.03,
  cascade: 0.07,
})

/* ─── Typing ─────────────────────────────────────────────────────────────── */

/** Keystroke times for a line typed from `start`, with a human's unevenness. */
function typed(id, text, start, cps = 22) {
  const times = []
  let t = start
  for (let i = 0; i < text.length; i++) {
    times.push(t)
    const pause = text[i] === ' ' ? 1.6 : 1
    t += (pause * (0.7 + hash(id, i) * 0.6)) / cps
  }
  return { id, text, start, times, end: t }
}

/** How much of a typed line is visible at t. */
export function typedText(line, t) {
  let n = 0
  while (n < line.times.length && line.times[n] <= t) n++
  return line.text.slice(0, n)
}

export const TYPE = {
  every: typed('every', 'Every day, we send things.', 1.1, 20),
  kinds: typed('kinds', 'Files. Notes. Whole projects.', 2.55, 22),
  whatif: typed('whatif', 'What if all it took was', 10.35, 17),
  put: typed('put', 's3nd put ./report.pdf', 18.9, 24),
  get: typed('get', 's3nd get k7qp-2m4x', 23.6, 24),
  install: typed('install', 'npm i -g @s3nd/cli', 51.9, 26),
}

/* ─── The rest of the cue sheet ──────────────────────────────────────────── */

export const TOASTS = [
  { at: 3.55, x: 250, y: 250, text: 'Create an account to continue', kind: 'lock' },
  { at: 3.95, x: 1180, y: 190, text: 'File exceeds the 2 GB limit', kind: 'error' },
  { at: 4.35, x: 1270, y: 720, text: 'This link has expired', kind: 'error' },
  { at: 4.7, x: 170, y: 790, text: 'Uploading to our servers…', kind: 'wait' },
  { at: 5.05, x: 690, y: 110, text: 'Upgrade to Pro to send more', kind: 'lock' },
  { at: 5.35, x: 1350, y: 460, text: 'Waiting for approval…', kind: 'wait' },
  { at: 5.62, x: 110, y: 520, text: 'Your session has timed out', kind: 'error' },
  { at: 5.86, x: 700, y: 900, text: 'We may process your content', kind: 'lock' },
  { at: 6.08, x: 1180, y: 930, text: 'Please verify your email', kind: 'wait' },
  { at: 6.28, x: 820, y: 330, text: 'Transfer failed. Try again.', kind: 'error' },
]
export const TOAST_COLLAPSE = 6.95

export const HARD_WORDS = [
  { at: 7.35, text: 'Why' },
  { at: 7.6, text: 'is' },
  { at: 7.8, text: 'it' },
  { at: 8.0, text: 'still' },
  { at: 8.3, text: 'this' },
  { at: 8.6, text: 'hard?' },
]

export const CALLOUTS = [
  { at: 14.7, text: '40 bits' },
  { at: 15.25, text: 'no I · L · O · U' },
  { at: 15.8, text: 'any case, any dash' },
  { at: 16.35, text: 'read it over the phone' },
]

export const PACKETS = [
  { from: 20.35, to: 21.75, dir: 'up' },
  { from: 25.05, to: 26.45, dir: 'down' },
]

export const SLAMS = [
  { at: 27.0, text: 'No sign-up.' },
  { at: 28.0, text: 'No middleman.' },
  { at: 29.0, text: 'Nothing to deploy.' },
  { at: 30.0, text: 'Just your bucket.', accent: 'bucket.' },
]

export const MANIFESTO = [
  { at: 37.0, text: 'Your bucket.' },
  { at: 38.0, text: 'Your keys.' },
  { at: 39.0, text: 'Your rules.' },
]

export const WAYS = [
  { at: 40.1, title: 'From a terminal', pkg: '@s3nd/cli', code: ['$ s3nd put ./report.pdf', 'K7QP2M4X'] },
  { at: 40.6, title: 'Inside your app', pkg: '@s3nd/react', code: ['const { sendFile } =', '  useSendTransfer()'] },
  {
    at: 41.1,
    title: 'Over plain HTTP',
    pkg: '@s3nd/protocol',
    code: ['$ curl $API/K7QP2M4X/raw \\', '    -o report.pdf'],
  },
]

/**
 * Every sound the score needs, as { t, type, ...params }, sorted by time. The
 * synthesiser adds the music bed around these.
 */
export function audioEvents() {
  const events = []
  const flaps = (rows, gain) => {
    for (const tile of rows.flat()) {
      for (let k = 1; k < tile.chars.length; k++) {
        events.push({ t: tile.from + k * tile.period, type: 'flap', gain, seed: hash(tile.id, k) })
      }
    }
  }
  flaps([heroCode], 0.9)
  flaps([terminalCode], 0.4)
  flaps(boardRows, 0.2)
  flaps([boardingRow], 0.7)

  for (const line of Object.values(TYPE)) {
    for (const [i, t] of line.times.entries()) events.push({ t, type: 'key', seed: hash(line.id, 'k', i) })
  }
  for (const toast of TOASTS) events.push({ t: toast.at, type: 'glitch', seed: hash(toast.text) })
  events.push({ t: TOAST_COLLAPSE, type: 'collapse' })
  for (const word of HARD_WORDS) events.push({ t: word.at, type: 'thud' })
  events.push({ t: DROP, type: 'impact', size: 1 })
  for (const callout of CALLOUTS) events.push({ t: callout.at, type: 'tick' })
  events.push({ t: 17.55, type: 'whoosh', length: 0.5 })
  for (const packet of PACKETS) events.push({ t: packet.from, type: 'whoosh', length: packet.to - packet.from })
  events.push({ t: 21.75, type: 'chime', note: 76 })
  events.push({ t: 26.45, type: 'chime', note: 81 })
  for (const slam of SLAMS) events.push({ t: slam.at, type: 'hit', size: 0.6 })
  for (const line of MANIFESTO) events.push({ t: line.at, type: 'hit', size: 0.85 })
  for (const way of WAYS) events.push({ t: way.at, type: 'tick' })
  events.push({ t: 43.35, type: 'whoosh', length: 0.6 })
  events.push({ t: FINALE_HIT, type: 'impact', size: 1.25 })

  return events.sort((a, b) => a.t - b.t)
}
