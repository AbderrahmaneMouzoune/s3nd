import type { CSSProperties } from 'react'

import type { Dictionary } from '@/lib/i18n'

import { Stamp } from './ui'

/**
 * The whole transfer as one animated scene: machine A puts a file in the
 * bucket and gets a code, the code crosses to machine B by hand, machine B
 * gets the file and burns it. Fourteen seconds, on a loop, with three captions
 * underneath that light up in turn.
 *
 * Everything runs on one CSS timeline: every animated part shares the same
 * duration and is keyed by percentages of it, so nothing drifts. The
 * stylesheet is generated below from timings in seconds, because a keyframe
 * written by hand as `24.286%` is impossible to read or to move. No script,
 * no SMIL (which cannot be kept in step with CSS), and under reduced motion
 * the finished transfer is shown instead.
 *
 * On a phone the stage is wider than the screen: the camera pans from the
 * laptop to the bucket to the phone as the story advances.
 */

/* ─── The palette, as `illustrations.tsx` uses it ────────────────────── */

const INK = '#f3efe4'
const MUTED = '#b3ada1'
const FAINT = '#7f7a70'
const LINE = '#3d3b36'
const SURFACE = '#161615'
const SCREEN = '#0d0d0c'
const PANEL = '#1c1b19'
const AMBER = '#ffb000'
const OK = '#6fe3a1'
const DANGER = '#ff5a4a'
const MONO = 'var(--font-jetbrains), ui-monospace, monospace'
const UPPER = { textTransform: 'uppercase' } as const

/* ─── The timeline, in seconds ────────────────────────────────────────── */

/** The whole loop. Every keyframe below is a fraction of this. */
const LOOP = 14

const AT = {
  typePut: [0.5, 2.0],
  fileLine: 2.2,
  upload: [2.3, 3.4],
  packetIn: [2.4, 3.4],
  inBucket: 3.4,
  code: 3.5,
  tiles: 3.6,
  expiry: [3.7, 12.3],
  bubble: [4.6, 6.7],
  typeGet: [7.0, 7.6],
  typeCode: [7.6, 8.4],
  normalized: 8.6,
  packetOut: [8.8, 9.8],
  wrote: 10.0,
  ok: 10.3,
  typeRm: [11.0, 11.8],
  burned: 12.0,
  gone: 12.2,
} as const

/** Seconds into the loop, as a keyframe selector. */
const pct = (seconds: number) => `${((seconds / LOOP) * 100).toFixed(3)}%`

/** A hair before `seconds`: the keyframe that holds the previous state until then. */
const before = (seconds: number) => pct(Math.max(0, seconds - 0.01))

const keyframes = (name: string, body: string) => `@keyframes ${name}{${body}}`

/** Hidden, then shown from `from` on; hidden again after `to` when given. */
function show(name: string, from: number, to?: number): string {
  const tail = to == null ? `${pct(LOOP)}{opacity:1}` : `${pct(to)}{opacity:1}${pct(to + 0.01)},100%{opacity:0}`

  return keyframes(name, `0%,${before(from)}{opacity:0}${pct(from)},${tail}`)
}

/** Springs in at `at`: nothing, then a little too big, then its size. */
function pop(name: string, at: number, to?: number): string {
  const end =
    to == null ? '100%{transform:scale(1)}' : `${pct(to)}{transform:scale(1)}${pct(to + 0.01)},100%{transform:scale(0)}`

  return keyframes(
    name,
    `0%,${before(at)}{transform:scale(0)}${pct(at + 0.2)}{transform:scale(1.15)}${pct(at + 0.36)},${end}`,
  )
}

/**
 * A curtain in the screen's colour, drawn over a line of terminal, that steps
 * to the right as the line is "typed". One step per character.
 */
function type(name: string, [from, to]: readonly [number, number], characters: number, width: number): string {
  return keyframes(
    name,
    `0%,${before(from)}{translate:0 0;animation-timing-function:steps(${characters},end)}${pct(from)}{translate:0 0;animation-timing-function:steps(${characters},end)}${pct(to)},100%{translate:${width}px 0}`,
  )
}

/** Grows from nothing to full width between `from` and `to`, then is gone. */
function grow(name: string, [from, to]: readonly [number, number]): string {
  return keyframes(
    name,
    `0%,${before(from)}{opacity:0;transform:scaleX(0)}${pct(from)}{opacity:1;transform:scaleX(0)}${pct(to)}{opacity:1;transform:scaleX(1)}${pct(to + 0.15)},100%{opacity:0;transform:scaleX(1)}`,
  )
}

/** The expiry ring, running down between `from` and `to`. */
function ring(name: string, [from, to]: readonly [number, number], circumference: number): string {
  return keyframes(
    name,
    `0%,${before(from)}{opacity:0;stroke-dashoffset:0}${pct(from)}{opacity:1;stroke-dashoffset:0}${pct(to)}{opacity:1;stroke-dashoffset:${circumference}}${pct(to + 0.01)},100%{opacity:0;stroke-dashoffset:${circumference}}`,
  )
}

type Point = readonly [number, number]
/** A cubic Bézier: start, two controls, end. */
type Curve = readonly [Point, Point, Point, Point]

const d = ([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: Curve) => `M${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`

function at([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: Curve, t: number): Point {
  const u = 1 - t
  const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
  const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3

  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

/**
 * A packet flying along a curve between `from` and `to`: the curve is sampled
 * into keyframes, eased at both ends, and the packet fades in and out. Plain
 * `translate`, so it works wherever CSS animations do.
 */
function travel(name: string, [from, to]: readonly [number, number], curve: Curve, steps = 14): string {
  const stops: string[] = [`0%,${before(from)}{opacity:0;translate:${at(curve, 0).join('px ')}px}`]

  for (let index = 0; index <= steps; index++) {
    const u = index / steps
    const eased = (1 - Math.cos(Math.PI * u)) / 2
    const [x, y] = at(curve, eased)
    const opacity = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1
    stops.push(`${pct(from + (to - from) * u)}{opacity:${opacity.toFixed(2)};translate:${x}px ${y}px}`)
  }

  stops.push(`${pct(to + 0.01)},100%{opacity:0;translate:${at(curve, 1).join('px ')}px}`)

  return keyframes(name, stops.join(''))
}

/** A caption lit between `from` and `to`, and its bar underneath. */
function step(index: number, [from, to]: readonly [number, number]): string {
  const on = `${pct(from)},${pct(to)}`

  return [
    keyframes(
      `sc-step-${index}`,
      `0%,${before(from)}{color:${FAINT}}${on}{color:${INK}}${pct(to + 0.01)},100%{color:${FAINT}}`,
    ),
    keyframes(
      `sc-bar-${index}`,
      `0%,${before(from)}{transform:scaleX(0)}${on}{transform:scaleX(1)}${pct(to + 0.01)},100%{transform:scaleX(0)}`,
    ),
  ].join('')
}

/* ─── The geometry, in the 960 × 480 view box ─────────────────────────── */

const ROUTE_IN: Curve = [
  [274, 238],
  [330, 196],
  [380, 196],
  [428, 232],
]
const ROUTE_OUT: Curve = [
  [534, 232],
  [590, 196],
  [700, 196],
  [758, 238],
]
const CHANNEL: Curve = [
  [160, 418],
  [380, 418],
  [580, 418],
  [800, 418],
]

/** When each caption under the stage is lit: put, the code, get. */
const STEPS: readonly (readonly [number, number])[] = [
  [0, AT.bubble[0]],
  [AT.bubble[0], AT.typeGet[0]],
  [AT.typeGet[0], LOOP * 0.955],
]

const RING_R = 14
const RING_C = Math.round(2 * Math.PI * RING_R * 100) / 100

const CODE = ['K', '7', 'Q', 'P', '2', 'M', '4', 'X']
const TILE = { w: 30, h: 40, gap: 4, group: 12, x: 340, y: 150 }
const tileX = (index: number) => TILE.x + index * (TILE.w + TILE.gap) + (index >= 4 ? TILE.group : 0)

/* ─── The stylesheet ──────────────────────────────────────────────────── */

const css = [
  `.scene{--sc-loop:${LOOP}s}`,
  `.sc-loop{animation:sc-loop var(--sc-loop) linear infinite}`,
  keyframes('sc-loop', '0%{opacity:0}2%{opacity:1}95.5%{opacity:1}98%,100%{opacity:0}'),
  // Every timed part: the same clock, forever.
  `.scene [class*="sc-a-"]{animation-duration:var(--sc-loop);animation-iteration-count:infinite;animation-fill-mode:both}`,
  `.sc-curtain{animation-name:var(--sc-name);animation-timing-function:linear}`,
  ...[
    type('sc-type-put', AT.typePut, 21, 200),
    type('sc-type-get', AT.typeGet, 8, 100),
    type('sc-type-code', AT.typeCode, 9, 100),
    type('sc-type-rm', AT.typeRm, 17, 100),
  ],
  `.sc-a-file-line{animation-name:sc-file-line}`,
  show('sc-file-line', AT.fileLine),
  `.sc-a-upload{opacity:0;transform-box:fill-box;transform-origin:left center;animation-name:sc-upload;animation-timing-function:linear}`,
  grow('sc-upload', AT.upload),
  `.sc-a-uploaded{animation-name:sc-uploaded}`,
  show('sc-uploaded', AT.upload[1] + 0.15),
  `.sc-a-code{animation-name:sc-code}`,
  show('sc-code', AT.code),
  `.sc-a-packet-in{opacity:0;animation-name:sc-packet-in;animation-timing-function:linear}`,
  travel('sc-packet-in', AT.packetIn, ROUTE_IN),
  `.sc-a-packet-out{opacity:0;animation-name:sc-packet-out;animation-timing-function:linear}`,
  travel('sc-packet-out', AT.packetOut, ROUTE_OUT),
  `.sc-a-in-bucket{transform-box:fill-box;transform-origin:center;animation-name:sc-in-bucket;animation-timing-function:cubic-bezier(0.2,0.7,0.2,1)}`,
  pop('sc-in-bucket', AT.inBucket, AT.gone),
  `.sc-a-tile{transform-box:fill-box;transform-origin:center;animation-name:sc-tile;animation-timing-function:cubic-bezier(0.2,0.7,0.2,1);animation-delay:calc(var(--i,0)*90ms)}`,
  pop('sc-tile', AT.tiles),
  `.sc-a-tile-char{animation-name:sc-tile-char}`,
  keyframes('sc-tile-char', `0%,${pct(AT.gone)}{opacity:1}${pct(AT.gone + 0.3)},100%{opacity:0.12}`),
  `.sc-a-object{animation-name:sc-object}`,
  show('sc-object', AT.tiles + 0.2, AT.gone),
  `.sc-a-gone{animation-name:sc-gone}`,
  show('sc-gone', AT.gone + 0.05),
  `.sc-a-expiry{opacity:0;stroke-dasharray:${RING_C};animation-name:sc-expiry;animation-timing-function:linear}`,
  ring('sc-expiry', AT.expiry, RING_C),
  `.sc-a-expiry-label{animation-name:sc-expiry-label}`,
  show('sc-expiry-label', AT.expiry[0], AT.expiry[1]),
  `.sc-a-bubble{opacity:0;animation-name:sc-bubble;animation-timing-function:linear}`,
  travel('sc-bubble', AT.bubble, CHANNEL, 10),
  `.sc-a-normalized{animation-name:sc-normalized}`,
  show('sc-normalized', AT.normalized),
  `.sc-a-wrote{animation-name:sc-wrote}`,
  show('sc-wrote', AT.wrote),
  `.sc-a-ok{animation-name:sc-ok}`,
  show('sc-ok', AT.ok),
  `.sc-a-burned{animation-name:sc-burned}`,
  show('sc-burned', AT.burned),
  // The captions and their bars.
  `.sc-step{animation-timing-function:steps(1,end)}`,
  `.sc-bar{transform-origin:left;animation-timing-function:steps(1,end)}`,
  ...STEPS.map((window, index) => step(index + 1, window)),
  ...[1, 2, 3].map(
    (index) => `.sc-a-step-${index}{animation-name:sc-step-${index}}.sc-a-bar-${index}{animation-name:sc-bar-${index}}`,
  ),
  // The progress line along the top of the stage.
  `.sc-progress{transform-origin:left;animation:sc-progress var(--sc-loop) linear infinite}`,
  keyframes('sc-progress', '0%{transform:scaleX(0)}100%{transform:scaleX(1)}'),
  // The camera: on a narrow screen, the stage is wider than the viewport and pans with the story.
  `.sc-pan{min-width:880px}`,
  `@media (max-width: 959px){.sc-pan{--sc-shift:min(0px,calc(100vw - 4.25rem - 880px));animation:sc-pan var(--sc-loop) cubic-bezier(0.4,0,0.2,1) infinite}}`,
  keyframes(
    'sc-pan',
    `0%,${pct(2.1)}{translate:0 0}${pct(3.1)},${pct(5.2)}{translate:calc(var(--sc-shift)/2) 0}${pct(6.8)},${pct(13.2)}{translate:var(--sc-shift) 0}100%{translate:0 0}`,
  ),
  // Reduced motion: the finished transfer, still. Nothing in flight, no curtains, no camera.
  `@media (prefers-reduced-motion: reduce){.scene *{animation:none!important}.sc-curtain,.sc-a-packet-in,.sc-a-packet-out,.sc-a-bubble,.sc-a-upload,.sc-a-gone,.sc-a-burned,.sc-rm{display:none}.sc-a-expiry{opacity:1;stroke-dashoffset:${Math.round(RING_C * 0.7)}}.sc-bar{transform:scaleX(1)}.sc-progress{transform:scaleX(1)}.sc-stage{overflow-x:auto}.sc-pan{translate:none}}`,
].join('\n')

/* ─── Parts ───────────────────────────────────────────────────────────── */

function Label({
  x,
  y,
  children,
  anchor = 'middle',
  fill = FAINT,
  size = 7.5,
  className,
}: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
  fill?: string
  size?: number
  className?: string
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontFamily={MONO}
      fontSize={size}
      letterSpacing="1.5"
      style={UPPER}
      className={className}
    >
      {children}
    </text>
  )
}

/** One line of terminal, and the curtain that types it. */
function Typed({
  x,
  y,
  width,
  name,
  fill = INK,
  size = 10.5,
  children,
}: {
  x: number
  y: number
  /** How far the curtain has to travel to clear the line. */
  width: number
  name: string
  fill?: string
  size?: number
  children: React.ReactNode
}) {
  return (
    <g>
      <text x={x} y={y} fill={fill} fontFamily={MONO} fontSize={size}>
        {children}
      </text>
      <rect
        x={x - 1}
        y={y - size}
        width={width + 2}
        height={size + 4}
        fill={SCREEN}
        className="sc-curtain sc-a-curtain"
        style={{ '--sc-name': name } as CSSProperties}
      />
    </g>
  )
}

/** A file: a page with a folded corner and an amber tab, centred on the origin. */
function File({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale}) translate(-8 -9)`}>
      <path d="M0 0 h11 l5 5 v13 h-16 z" fill={PANEL} stroke={AMBER} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M11 0 v5 h5" stroke={AMBER} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3.5 9 h9 M3.5 12.5 h9" stroke={FAINT} strokeWidth="1" />
    </g>
  )
}

function Arrow({ x, y }: { x: number; y: number }) {
  return (
    <path d={`M${x} ${y} l8 6 l-9 4`} stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  )
}

/* ─── The scene ───────────────────────────────────────────────────────── */

export function TwoMachines({ t }: { t: Dictionary['howItWorks']['scene'] }) {
  return (
    <figure className="scene border-line-strong bg-surface shadow-card relative overflow-hidden rounded-xl border">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="sc-progress bg-accent absolute inset-x-0 top-0 h-0.5" aria-hidden="true" />

      <div className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-6">
        <p className="text-sm font-bold tracking-tight">{t.title}</p>
        <p className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">
          <span className="text-accent">●</span> {t.eyebrow}
        </p>
      </div>

      <div className="sc-stage bento-figure overflow-hidden">
        <div className="sc-pan">
          <svg
            viewBox="0 0 960 480"
            className="block h-auto w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <pattern id="sc-rim" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                <rect width="8" height="8" fill="#0a0a0a" />
                <rect width="4" height="8" fill={AMBER} />
              </pattern>
            </defs>

            {/* ── What never moves: the two machines, the bucket, the routes ── */}

            <g className="ill-ghost">
              <path
                d="M436 84 c-16 0 -26 -11 -26 -23 c0 -13 11 -23 25 -22 c5 -14 19 -21 33 -18 c12 -11 32 -9 39 5 c16 -5 33 7 33 23 c0 14 -11 25 -27 25 z"
                stroke={LINE}
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
              <path d="M470 45 l20 20 M490 45 l-20 20" stroke={DANGER} strokeWidth="2" strokeLinecap="round" />
              <Label x={480} y={104}>
                {t.noMiddle}
              </Label>
            </g>

            <Label x={160} y={150} size={8}>
              {t.machineA}
            </Label>
            <rect x="50" y="162" width="220" height="140" rx="6" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
            <rect x="58" y="170" width="204" height="124" rx="3" fill={SCREEN} />
            <path d="M36 306 h248 l-5 7 h-238 z" fill={PANEL} stroke={LINE} strokeWidth="1" />

            <Label x={822} y={128} size={8}>
              {t.machineB}
            </Label>
            <rect x="762" y="140" width="120" height="220" rx="14" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
            <rect x="770" y="152" width="104" height="190" rx="5" fill={SCREEN} />
            <rect x="808" y="348" width="28" height="3" rx="1.5" fill={LINE} />

            <path d={d(ROUTE_IN)} stroke={LINE} strokeWidth="1.5" strokeDasharray="3 4" className="ill-dash" />
            <Arrow x={418} y={224} />
            <path d={d(ROUTE_OUT)} stroke={LINE} strokeWidth="1.5" strokeDasharray="3 4" className="ill-dash" />
            <Arrow x={748} y={230} />

            <path d="M425 236 h110 l-11 82 h-88 z" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
            <rect x="421" y="228" width="118" height="11" rx="2" fill="url(#sc-rim)" stroke="#0a0a0a" strokeWidth="1" />
            <Label x={480} y={340} size={8} fill={AMBER}>
              {t.bucket}
            </Label>
            <Label x={480} y={354} size={7}>
              S3 · R2 · MinIO · Scaleway · Wasabi
            </Label>

            <path d={d(CHANNEL)} stroke={LINE} strokeWidth="1.5" strokeDasharray="2 5" />
            <circle cx="160" cy="418" r="3" fill={LINE} />
            <circle cx="800" cy="418" r="3" fill={LINE} />
            <Label x={480} y={452} size={7}>
              {t.byHand}
            </Label>

            {/* ── What happens, on the loop ── */}

            <g className="sc-loop">
              {/* Machine A's terminal */}
              <text x="68" y="192" fill={FAINT} fontFamily={MONO} fontSize="10.5">
                $
              </text>
              <Typed x={80} y={192} width={200} name="sc-type-put">
                s3nd put <tspan fill={AMBER}>./report.pdf</tspan>
              </Typed>
              <text x="68" y="208" fill={MUTED} fontFamily={MONO} fontSize="9" className="sc-a-file-line">
                report.pdf · 284 kB
              </text>
              <rect x="68" y="216" width="150" height="6" rx="1" fill="url(#sc-rim)" className="sc-a-upload" />
              <text x="68" y="224" fill={MUTED} fontFamily={MONO} fontSize="9" className="sc-a-uploaded">
                → {t.bucket} · {t.expires} 1 h
              </text>
              <text
                x="68"
                y="252"
                fill={AMBER}
                fontFamily={MONO}
                fontSize="16"
                fontWeight="700"
                letterSpacing="2"
                className="sc-a-code"
              >
                K7QP 2M4X
              </text>
              <text x="68" y="284" fill={FAINT} fontFamily={MONO} fontSize="10.5">
                $
              </text>
              <rect x="78" y="275" width="6" height="11" fill={AMBER} className="ill-blink" />

              {/* The file, on its way in */}
              <g className="sc-a-packet-in">
                <File scale={1.2} />
              </g>

              {/* In the bucket: the object, and its code on the board */}
              <g className="sc-a-in-bucket">
                <g transform="translate(480 278)">
                  <File scale={1.5} />
                </g>
              </g>
              {CODE.map((character, index) => (
                <g key={index} className="sc-a-tile" style={{ '--i': index } as CSSProperties}>
                  <rect
                    x={tileX(index)}
                    y={TILE.y}
                    width={TILE.w}
                    height={TILE.h}
                    rx="3"
                    fill={PANEL}
                    stroke="#2a2926"
                  />
                  <rect x={tileX(index)} y={TILE.y + TILE.h / 2} width={TILE.w} height="1" fill="#050505" />
                  <text
                    x={tileX(index) + TILE.w / 2}
                    y={TILE.y + TILE.h / 2 + 7}
                    textAnchor="middle"
                    fill={AMBER}
                    fontFamily={MONO}
                    fontWeight="700"
                    fontSize="20"
                    className="sc-a-tile-char"
                  >
                    {character}
                  </text>
                </g>
              ))}
              <text
                x="480"
                y="210"
                textAnchor="middle"
                fill={MUTED}
                fontFamily={MONO}
                fontSize="8"
                letterSpacing="1"
                className="sc-a-object"
              >
                drop/K7QP2M4X · 284 kB
              </text>
              <Label x={480} y={210} size={8} fill={DANGER} className="sc-a-gone">
                {`✕ ${t.gone}`}
              </Label>

              {/* The expiry, running down beside the bucket */}
              <g transform="translate(596 300)">
                <circle r={RING_R} stroke={LINE} strokeWidth="2" className="sc-a-expiry-label" />
                <circle
                  r={RING_R}
                  stroke={AMBER}
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform="rotate(-90)"
                  className="sc-a-expiry"
                />
                <text
                  y="3"
                  textAnchor="middle"
                  fill={AMBER}
                  fontFamily={MONO}
                  fontSize="7.5"
                  fontWeight="700"
                  className="sc-a-expiry-label"
                >
                  1h
                </text>
              </g>

              {/* The code, crossing by hand */}
              <g className="sc-a-bubble">
                <rect x="-46" y="-13" width="92" height="26" rx="4" fill={PANEL} stroke={LINE} strokeWidth="1.2" />
                <path d="M-30 13 l0 7 l8 -7 z" fill={PANEL} stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
                <text
                  y="4.5"
                  textAnchor="middle"
                  fill={AMBER}
                  fontFamily={MONO}
                  fontSize="12"
                  fontWeight="700"
                  letterSpacing="1.5"
                >
                  K7QP 2M4X
                </text>
              </g>

              {/* Machine B's terminal */}
              <text x="778" y="176" fill={FAINT} fontFamily={MONO} fontSize="9.5">
                $
              </text>
              <Typed x={788} y={176} width={100} name="sc-type-get" size={9.5}>
                s3nd get
              </Typed>
              <Typed x={778} y={190} width={100} name="sc-type-code" size={9.5} fill={AMBER}>
                k7qp-2m4x
              </Typed>
              <text x="778" y="206" fill={FAINT} fontFamily={MONO} fontSize="8" className="sc-a-normalized">
                → K7QP2M4X
              </text>
              <text x="778" y="232" fill={MUTED} fontFamily={MONO} fontSize="8.5" className="sc-a-wrote">
                Wrote
              </text>
              <text x="778" y="244" fill={INK} fontFamily={MONO} fontSize="8.5" className="sc-a-wrote">
                report.pdf
              </text>
              <text x="778" y="262" fill={OK} fontFamily={MONO} fontSize="10" fontWeight="700" className="sc-a-ok">
                ✓ 284 kB
              </text>
              <text x="778" y="288" fill={FAINT} fontFamily={MONO} fontSize="9.5" className="sc-rm">
                $
              </text>
              <g className="sc-rm">
                <Typed x={788} y={288} width={100} name="sc-type-rm" size={9.5}>
                  s3nd rm k7qp-2m4x
                </Typed>
              </g>
              <g className="sc-a-burned">
                <text x="778" y="306" fill={MUTED} fontFamily={MONO} fontSize="8.5">
                  Burned K7QP2M4X
                </text>
                <rect x="778" y="313" width="34" height="13" rx="2" stroke={DANGER} strokeWidth="1" />
                <Label x={795} y={322.5} size={6.5} fill={DANGER}>
                  {t.gone}
                </Label>
              </g>

              {/* The file, on its way out */}
              <g className="sc-a-packet-out">
                <File scale={1.2} />
              </g>
            </g>
          </svg>
        </div>
      </div>

      <ol className="border-line grid gap-px border-t bg-[var(--line)] sm:grid-cols-3">
        {t.steps.map((entry, index) => (
          <li key={entry.stamp} className="bg-surface relative p-5 sm:p-6">
            <span
              aria-hidden="true"
              className={`sc-bar sc-a-bar-${index + 1} bg-accent absolute inset-x-0 top-0 h-0.5`}
            />
            <Stamp tone="accent">{entry.stamp}</Stamp>
            <h3 className={`sc-step sc-a-step-${index + 1} mt-3 font-bold tracking-tight`}>{entry.title}</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">{entry.body}</p>
          </li>
        ))}
      </ol>
      <figcaption className="sr-only">{t.caption}</figcaption>
    </figure>
  )
}
