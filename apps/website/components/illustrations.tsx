import type { ComponentProps } from 'react'

/**
 * The product, drawn. Every figure is inline SVG in the site's palette, so it
 * scales, prints and themes with the page; the motion is CSS (`ill-*` classes
 * in `globals.css`) for strokes and tiles, and SMIL for the packets that
 * travel along a path. Everything decorative is `aria-hidden`.
 */

const INK = '#f3efe4'
const MUTED = '#b3ada1'
const FAINT = '#7f7a70'
const LINE = '#3d3b36'
const SURFACE = '#161615'
const AMBER = '#ffb000'
const OK = '#6fe3a1'
const MONO = 'var(--font-jetbrains), ui-monospace, monospace'

type SvgProps = Omit<ComponentProps<'svg'>, 'viewBox' | 'children'>

/** The few words the figures carry, so they can be translated. */
export interface IllustrationLabels {
  yourBucket: string
  putCaption: string
  codeHint: string
  codeResult: string
  getCaption: string
  noMiddle: string
  machineA: string
  machineB: string
  midCaption: string
  oldPhone: string
  newPhone: string
  fromDevice: string
  notes: string
  restore: string
  snapshot: string
  snapCaption: string
}

type FigureProps = SvgProps & { labels: IllustrationLabels }
const UPPER = { textTransform: 'uppercase' } as const

function Frame({ viewBox, className, children, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Amber and black diagonals, the rim of a bucket. */
function Hazard({ id }: { id: string }) {
  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="8" height="8" fill="#0a0a0a" />
      <rect width="4" height="8" fill={AMBER} />
    </pattern>
  )
}

/** A bucket: a trapezoid with a hazard rim, the amber object inside optional. */
function Bucket({
  x,
  y,
  w = 72,
  h = 62,
  rim,
  label,
}: {
  x: number
  y: number
  w?: number
  h?: number
  rim: string
  label?: string
}) {
  const inset = 7

  return (
    <g>
      <path
        d={`M${x} ${y + 8} h${w} l-${inset} ${h - 8} h-${w - inset * 2} z`}
        fill={SURFACE}
        stroke={LINE}
        strokeWidth="1.5"
      />
      <rect x={x - 3} y={y} width={w + 6} height="9" rx="1.5" fill={`url(#${rim})`} stroke="#0a0a0a" strokeWidth="1" />
      {label ? (
        <text
          x={x + w / 2}
          y={y + h + 14}
          textAnchor="middle"
          fill={FAINT}
          fontFamily={MONO}
          fontSize="7"
          letterSpacing="1.5"
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}

/** A laptop, seen from the front. */
function Laptop({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width="92" height="58" rx="4" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
      <rect x={x + 6} y={y + 6} width="80" height="46" rx="2" fill="#0d0d0c" />
      <path d={`M${x - 8} ${y + 62} h108 l-4 5 h-100 z`} fill="#1c1b19" stroke={LINE} strokeWidth="1" />
      {children}
    </g>
  )
}

/** A phone, upright. */
function Phone({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width="52" height="96" rx="8" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
      <rect x={x + 5} y={y + 8} width="42" height="78" rx="3" fill="#0d0d0c" />
      <rect x={x + 19} y={y + 90} width="14" height="2" rx="1" fill={LINE} />
      {children}
    </g>
  )
}

/** A file: a page with a folded corner and an amber tab. */
function File({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 h11 l5 5 v13 h-16 z" fill="#1c1b19" stroke={AMBER} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M11 0 v5 h5" stroke={AMBER} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3.5 9 h9 M3.5 12.5 h9" stroke={FAINT} strokeWidth="1" />
    </g>
  )
}

/** The packet that travels: a file, fading in at one end and out at the other. */
function Packet({ path, dur, begin = '0s', scale = 1 }: { path: string; dur: string; begin?: string; scale?: number }) {
  return (
    <g className="ill-motion" opacity="0">
      <File x={-8 * scale} y={-9 * scale} scale={scale} />
      <animateMotion
        dur={dur}
        begin={begin}
        repeatCount="indefinite"
        path={path}
        calcMode="spline"
        keySplines="0.4 0 0.2 1"
        keyTimes="0;1"
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.12;0.85;1"
        dur={dur}
        begin={begin}
        repeatCount="indefinite"
      />
    </g>
  )
}

/** A dashed route the packets follow. */
function Route({ d, className = '' }: { d: string; className?: string }) {
  return <path d={d} stroke={LINE} strokeWidth="1.5" strokeDasharray="3 4" className={`ill-dash ${className}`} />
}

/** A split-flap tile with one character. */
function Tile({
  x,
  y,
  character,
  index,
  w = 24,
  h = 34,
}: {
  x: number
  y: number
  character: string
  index: number
  w?: number
  h?: number
}) {
  return (
    <g className="ill-tile" style={{ '--i': index } as React.CSSProperties}>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#1c1b19" stroke="#2a2926" />
      <rect x={x} y={y + h / 2} width={w} height="1" fill="#050505" />
      <text
        x={x + w / 2}
        y={y + h / 2 + 6}
        textAnchor="middle"
        fill={AMBER}
        fontFamily={MONO}
        fontWeight="700"
        fontSize="17"
      >
        {character}
      </text>
    </g>
  )
}

/* ─── put ─────────────────────────────────────────────────────────────── */

const PUT_PATH = 'M118 64 C 160 26, 196 26, 232 60'

export function PutIllustration({ labels, ...props }: FigureProps) {
  return (
    <Frame viewBox="0 0 320 160" {...props}>
      <defs>
        <Hazard id="put-rim" />
      </defs>
      <Laptop x={18} y={38}>
        <text x="30" y="58" fill={FAINT} fontFamily={MONO} fontSize="8">
          $
        </text>
        <text x="38" y="58" fill={INK} fontFamily={MONO} fontSize="8">
          s3nd put <tspan fill={AMBER}>./report.pdf</tspan>
        </text>
        <text x="30" y="72" fill={MUTED} fontFamily={MONO} fontSize="7">
          284 kB · expires 1h
        </text>
        <text
          x="30"
          y="86"
          fill={AMBER}
          fontFamily={MONO}
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.5"
          className="ill-blink-slow"
        >
          K7QP2M4X
        </text>
      </Laptop>
      <Route d={PUT_PATH} />
      <path d="M226 54 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Bucket x={226} y={66} rim="put-rim" label={labels.yourBucket} />
      <Packet path={PUT_PATH} dur="2.8s" />
      <text
        x="160"
        y="150"
        textAnchor="middle"
        fill={FAINT}
        fontFamily={MONO}
        fontSize="6.5"
        letterSpacing="1"
        style={UPPER}
      >
        {labels.putCaption}
      </text>
    </Frame>
  )
}

/* ─── code ────────────────────────────────────────────────────────────── */

const CODE = ['K', '7', 'Q', 'P', '2', 'M', '4', 'X']

export function CodeIllustration({ labels, ...props }: FigureProps) {
  return (
    <Frame viewBox="0 0 320 160" {...props}>
      {CODE.map((character, index) => (
        <Tile key={index} x={44 + index * 29 + (index >= 4 ? 10 : 0)} y={22} character={character} index={index} />
      ))}
      <path d="M160 64 v14" stroke={LINE} strokeWidth="1.5" strokeDasharray="2 3" className="ill-dash" />
      <path d="M155 74 l5 6 l5 -6" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="96" y="86" width="128" height="30" rx="4" fill="#0d0d0c" stroke={LINE} strokeWidth="1.5" />
      <text x="106" y="105" fill={INK} fontFamily={MONO} fontSize="11" letterSpacing="1.5">
        k7qp-2m4x
      </text>
      <rect x="180" y="95" width="6" height="13" fill={AMBER} className="ill-blink" />
      <text x="160" y="134" textAnchor="middle" fill={MUTED} fontFamily={MONO} fontSize="7.5" letterSpacing="1">
        {labels.codeHint}
      </text>
      <text
        x="160"
        y="150"
        textAnchor="middle"
        fill={OK}
        fontFamily={MONO}
        fontSize="7"
        letterSpacing="1.5"
        className="ill-pulse"
        style={UPPER}
      >
        {labels.codeResult}
      </text>
    </Frame>
  )
}

/* ─── get ─────────────────────────────────────────────────────────────── */

const GET_PATH = 'M96 60 C 140 26, 180 26, 224 58'

export function GetIllustration({ labels, ...props }: FigureProps) {
  return (
    <Frame viewBox="0 0 320 160" {...props}>
      <defs>
        <Hazard id="get-rim" />
      </defs>
      <Bucket x={22} y={66} rim="get-rim" />
      <Route d={GET_PATH} />
      <path d="M218 52 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Phone x={228} y={38}>
        <text x="236" y="58" fill={FAINT} fontFamily={MONO} fontSize="7">
          $ s3nd get
        </text>
        <text x="236" y="69" fill={AMBER} fontFamily={MONO} fontSize="7">
          k7qp-2m4x
        </text>
        <text x="236" y="86" fill={MUTED} fontFamily={MONO} fontSize="6.5">
          Wrote
        </text>
        <text x="236" y="96" fill={INK} fontFamily={MONO} fontSize="6.5">
          report.pdf
        </text>
        <text x="236" y="112" fill={OK} fontFamily={MONO} fontSize="8" className="ill-pulse">
          ✓ 284 kB
        </text>
      </Phone>
      <Packet path={GET_PATH} dur="2.8s" begin="0.6s" />
      <g transform="translate(150 118)">
        <circle r="13" stroke={LINE} strokeWidth="2" />
        <circle
          r="13"
          stroke={AMBER}
          strokeWidth="2"
          strokeLinecap="round"
          transform="rotate(-90)"
          className="ill-countdown"
        />
        <text x="0" y="3" textAnchor="middle" fill={AMBER} fontFamily={MONO} fontSize="7" fontWeight="700">
          1h
        </text>
      </g>
      <text
        x="150"
        y="150"
        textAnchor="middle"
        fill={FAINT}
        fontFamily={MONO}
        fontSize="6.5"
        letterSpacing="1"
        style={UPPER}
      >
        {labels.getCaption}
      </text>
    </Frame>
  )
}

/* ─── nobody in the middle ────────────────────────────────────────────── */

const MID_LEFT = 'M108 92 C 150 60, 180 60, 212 86'
const MID_RIGHT = 'M300 86 C 330 60, 362 60, 404 92'

export function NoMiddleIllustration({ labels, ...props }: FigureProps) {
  return (
    <Frame viewBox="0 0 512 220" {...props}>
      <defs>
        <Hazard id="mid-rim" />
      </defs>
      <g className="ill-ghost">
        <path
          d="M214 40 c-14 0 -22 -10 -22 -20 c0 -12 10 -20 22 -20 c4 -12 16 -18 28 -16 c10 -10 28 -8 34 4 c14 -4 28 6 28 20 c0 12 -10 22 -24 22 z"
          transform="translate(20 22)"
          stroke={LINE}
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <path d="M244 26 l24 24 M268 26 l-24 24" stroke="#ff5a4a" strokeWidth="2" strokeLinecap="round" />
        <text
          x="256"
          y="72"
          textAnchor="middle"
          fill={FAINT}
          fontFamily={MONO}
          fontSize="7"
          letterSpacing="1.5"
          style={UPPER}
        >
          {labels.noMiddle}
        </text>
      </g>
      <Laptop x={14} y={70}>
        <text x="26" y="92" fill={FAINT} fontFamily={MONO} fontSize="7.5">
          {labels.machineA}
        </text>
        <text x="26" y="106" fill={INK} fontFamily={MONO} fontSize="7.5">
          $ s3nd put
        </text>
        <text x="26" y="118" fill={AMBER} fontFamily={MONO} fontSize="7.5">
          → K7QP2M4X
        </text>
      </Laptop>
      <Route d={MID_LEFT} />
      <Route d={MID_RIGHT} />
      <path d="M206 80 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M398 86 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Bucket x={216} y={94} w={80} h={70} rim="mid-rim" label="S3 · R2 · MinIO · Scaleway · Wasabi" />
      <File x={248} y={122} />
      <Laptop x={404} y={70}>
        <text x="416" y="92" fill={FAINT} fontFamily={MONO} fontSize="7.5">
          {labels.machineB}
        </text>
        <text x="416" y="106" fill={INK} fontFamily={MONO} fontSize="7.5">
          $ s3nd get
        </text>
        <text x="416" y="118" fill={OK} fontFamily={MONO} fontSize="7.5">
          ✓ report.pdf
        </text>
      </Laptop>
      <Packet path={MID_LEFT} dur="3s" />
      <Packet path={MID_RIGHT} dur="3s" begin="1.5s" />
      <text
        x="256"
        y="210"
        textAnchor="middle"
        fill={FAINT}
        fontFamily={MONO}
        fontSize="6.5"
        letterSpacing="1"
        style={UPPER}
      >
        {labels.midCaption}
      </text>
    </Frame>
  )
}

/* ─── a snapshot between two phones ───────────────────────────────────── */

const SNAP_LEFT = 'M76 86 C 100 60, 118 60, 134 76'
const SNAP_RIGHT = 'M226 76 C 242 60, 260 60, 284 86'

export function SnapshotIllustration({ labels, ...props }: FigureProps) {
  return (
    <Frame viewBox="0 0 360 170" {...props}>
      <defs>
        <Hazard id="snap-rim" />
      </defs>
      <Phone x={20} y={36}>
        <text x="28" y="56" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          {labels.oldPhone}
        </text>
        <text x="28" y="70" fill={INK} fontFamily={MONO} fontSize="6.5">
          IndexedDB
        </text>
        <rect x="28" y="76" width="36" height="3" rx="1" fill={AMBER} />
        <rect x="28" y="82" width="28" height="3" rx="1" fill={LINE} />
        <rect x="28" y="88" width="32" height="3" rx="1" fill={LINE} />
        <text x="28" y="108" fill={AMBER} fontFamily={MONO} fontSize="7" fontWeight="700">
          K7QP2M4X
        </text>
      </Phone>
      <Route d={SNAP_LEFT} />
      <Route d={SNAP_RIGHT} />
      <path d="M128 70 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M278 80 l8 6 l-9 4" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <g className="ill-float">
        <rect x="136" y="60" width="88" height="80" rx="4" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
        <rect x="136" y="60" width="88" height="7" rx="2" fill="url(#snap-rim)" />
        <text x="144" y="82" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          app: <tspan fill={INK}>notes</tspan>
        </text>
        <text x="144" y="94" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          version: <tspan fill={INK}>3</tspan>
        </text>
        <text x="144" y="106" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          expires: <tspan fill={AMBER}>1h</tspan>
        </text>
        <text x="144" y="118" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          data: <tspan fill={INK}>gzip</tspan> 12.6×
        </text>
        <text
          x="180"
          y="133"
          textAnchor="middle"
          fill={FAINT}
          fontFamily={MONO}
          fontSize="6"
          letterSpacing="1.5"
          style={UPPER}
        >
          {labels.snapshot}
        </text>
      </g>
      <Phone x={288} y={36}>
        <text x="296" y="56" fill={FAINT} fontFamily={MONO} fontSize="6.5">
          {labels.newPhone}
        </text>
        <text x="296" y="70" fill={INK} fontFamily={MONO} fontSize="6.5">
          k7qp-2m4x
        </text>
        <text x="296" y="86" fill={MUTED} fontFamily={MONO} fontSize="5.5">
          {labels.fromDevice}
        </text>
        <text x="296" y="95" fill={MUTED} fontFamily={MONO} fontSize="5.5">
          {labels.notes}
        </text>
        <rect x="296" y="102" width="36" height="12" rx="2" fill={AMBER} />
        <text
          x="314"
          y="110.5"
          textAnchor="middle"
          fill="#0a0a0a"
          fontFamily={MONO}
          fontSize="6"
          fontWeight="700"
          style={UPPER}
        >
          {labels.restore}
        </text>
      </Phone>
      <Packet path={SNAP_LEFT} dur="2.6s" scale={0.8} />
      <Packet path={SNAP_RIGHT} dur="2.6s" begin="1.3s" scale={0.8} />
      <text
        x="180"
        y="160"
        textAnchor="middle"
        fill={FAINT}
        fontFamily={MONO}
        fontSize="6"
        letterSpacing="0.6"
        style={UPPER}
      >
        {labels.snapCaption}
      </text>
    </Frame>
  )
}

/* ─── the three ways in, as glyphs ───────────────────────────────────── */

export function TerminalGlyph(props: SvgProps) {
  return (
    <Frame viewBox="0 0 56 40" {...props}>
      <rect x="1" y="1" width="54" height="38" rx="4" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
      <path d="M1 10 h54" stroke={LINE} strokeWidth="1" />
      <circle cx="7" cy="5.5" r="1.5" fill={LINE} />
      <circle cx="12" cy="5.5" r="1.5" fill={LINE} />
      <text x="8" y="26" fill={AMBER} fontFamily={MONO} fontSize="9">
        $
      </text>
      <text x="16" y="26" fill={INK} fontFamily={MONO} fontSize="8">
        s3nd put
      </text>
      <rect x="44" y="18" width="5" height="10" fill={AMBER} className="ill-blink" />
    </Frame>
  )
}

export function AppGlyph(props: SvgProps) {
  return (
    <Frame viewBox="0 0 56 40" {...props}>
      <rect x="1" y="1" width="54" height="38" rx="4" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
      <path d="M1 10 h54" stroke={LINE} strokeWidth="1" />
      <rect x="6" y="4" width="26" height="3" rx="1" fill={LINE} />
      <rect x="8" y="17" width="22" height="5" rx="1" fill={LINE} />
      <rect x="8" y="26" width="16" height="5" rx="1" fill={LINE} />
      <g className="ill-float-small">
        <rect x="34" y="16" width="16" height="16" rx="2" fill="#1c1b19" stroke={AMBER} strokeWidth="1" />
        <text x="42" y="27" textAnchor="middle" fill={AMBER} fontFamily={MONO} fontSize="7" fontWeight="700">
          K7
        </text>
      </g>
    </Frame>
  )
}

export function HttpGlyph(props: SvgProps) {
  return (
    <Frame viewBox="0 0 56 40" {...props}>
      <rect x="1" y="1" width="54" height="38" rx="4" fill={SURFACE} stroke={LINE} strokeWidth="1.5" />
      <text x="8" y="26" fill={AMBER} fontFamily={MONO} fontSize="14" fontWeight="700">
        {'{'}
      </text>
      <text x="40" y="26" fill={AMBER} fontFamily={MONO} fontSize="14" fontWeight="700">
        {'}'}
      </text>
      <path
        d="M18 16 h18"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="round"
        className="ill-dash"
        strokeDasharray="3 3"
      />
      <path
        d="M36 24 h-18"
        stroke={MUTED}
        strokeWidth="1.5"
        strokeLinecap="round"
        className="ill-dash-back"
        strokeDasharray="3 3"
      />
      <path d="M33 13 l3 3 l-3 3" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21 l-3 3 l3 3" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}
