import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { ReactNode } from 'react'

import type { Locale } from '@/lib/i18n/config'
import type { OgKind, OgPage } from '@/lib/og'
import { site } from '@/lib/site'

/**
 * The Open Graph image of a page, as satori draws it: a 1200 × 630 board in
 * the site's palette, the page's own words on the left and a figure for its
 * kind on the right. `app/[locale]/og/[...path]/route.tsx` turns it into a
 * PNG for every page at build time.
 *
 * Satori, not a browser: every box with more than one child is a flex box,
 * the two static weights below are the only fonts, and the figures are plain
 * shapes, because text inside a nested SVG has no font to be drawn with.
 */

export const OG_SIZE = { width: 1200, height: 630 }

const CANVAS = '#0a0a0a'
const SURFACE = '#161615'
const PANEL = '#1c1b19'
const INK = '#f3efe4'
const MUTED = '#b3ada1'
const FAINT = '#7f7a70'
const LINE = '#3d3b36'
const AMBER = '#ffb000'
const OK = '#6fe3a1'
const DANGER = '#ff5a4a'

const DISPLAY = 'Bricolage'
const MONO = 'JetBrains'

const CODE = ['K', '7', 'Q', 'P', ' ', '2', 'M', '4', 'X']

interface OgFont {
  name: string
  data: Buffer
  weight: 700 | 800
  style: 'normal'
}

let fonts: Promise<OgFont[]> | undefined

/** The two static faces, read once per build and shared by every image. */
export function ogFonts(): Promise<OgFont[]> {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), 'app/fonts/BricolageGrotesque-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'app/fonts/JetBrainsMono-Bold.ttf')),
  ]).then(([display, mono]) => [
    { name: DISPLAY, data: display, weight: 800, style: 'normal' },
    { name: MONO, data: mono, weight: 700, style: 'normal' },
  ])

  return fonts
}

/** Cuts a sentence at a word boundary so it fits two lines of mono at 22px. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')

  return `${cut.slice(0, at > max * 0.6 ? at : cut.length).replace(/[,.;:]$/, '')}…`
}

/** The display size a title fits at: the longer it is, the smaller it sets. */
function titleSize(title: string, wide: boolean): number {
  const length = title.length
  if (wide) return length <= 28 ? 104 : length <= 44 ? 88 : 72
  return length <= 24 ? 84 : length <= 40 ? 70 : length <= 58 ? 58 : 50
}

/* ─── The frame ───────────────────────────────────────────────────────── */

function Hazard() {
  return (
    <div
      style={{
        display: 'flex',
        height: 16,
        width: '100%',
        backgroundImage: `repeating-linear-gradient(-45deg, ${AMBER} 0 12px, ${CANVAS} 12px 24px)`,
      }}
    />
  )
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 8,
          background: AMBER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: CANVAS,
          fontSize: 34,
          fontFamily: MONO,
        }}
      >
        →
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 44, letterSpacing: -2 }}>
        s3nd
        <span style={{ color: FAINT, fontSize: 40 }}>.sh</span>
      </div>
    </div>
  )
}

/** A check mark, drawn: neither face carries the glyph. */
function Check({ color = OK, size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 8.5 L6.5 12.5 L13.5 4"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The bordered uppercase label: the rubber stamp on a parcel. */
function Stamp({ children, tone = 'accent' }: { children: string; tone?: 'accent' | 'muted' | 'ok' | 'danger' }) {
  const color = { accent: AMBER, muted: MUTED, ok: OK, danger: DANGER }[tone]

  return (
    <div
      style={{
        display: 'flex',
        border: `2px solid ${color}`,
        color,
        borderRadius: 4,
        padding: '6px 12px',
        fontFamily: MONO,
        fontSize: 18,
        letterSpacing: 4,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  )
}

function Tiles({ scale = 1 }: { scale?: number }) {
  const w = Math.round(64 * scale)
  const h = Math.round(90 * scale)

  return (
    <div style={{ display: 'flex', gap: Math.round(8 * scale) }}>
      {CODE.map((character, index) =>
        character === ' ' ? (
          <div key={index} style={{ display: 'flex', width: Math.round(14 * scale) }} />
        ) : (
          <div
            key={index}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: w,
              height: h,
              borderRadius: 6,
              background: PANEL,
              color: AMBER,
              fontFamily: MONO,
              fontSize: Math.round(52 * scale),
            }}
          >
            {character}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: h / 2,
                height: 1,
                display: 'flex',
                background: '#050505',
              }}
            />
          </div>
        ),
      )}
    </div>
  )
}

/* ─── The figures ─────────────────────────────────────────────────────── */

const HAZARD_RIM = `repeating-linear-gradient(-45deg, ${AMBER} 0 6px, ${CANVAS} 6px 12px)`

/** A bucket: the trapezoid with a hazard rim, and something amber inside. */
function Bucket({ size = 1, filled = true }: { size?: number; filled?: boolean }) {
  const w = 150 * size
  const h = 132 * size
  const inset = 14 * size

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: w + 12, position: 'relative' }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d={`M0 ${14 * size} h${w} l-${inset} ${h - 14 * size} h-${w - inset * 2} z`}
          fill={SURFACE}
          stroke={LINE}
          strokeWidth={3}
        />
        {filled ? (
          <path
            d={`M${w / 2 - 22 * size} ${h * 0.42} h${28 * size} l${12 * size} ${12 * size} v${34 * size} h-${40 * size} z`}
            fill={PANEL}
            stroke={AMBER}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 18 * size,
          borderRadius: 4,
          border: `2px solid ${CANVAS}`,
          backgroundImage: HAZARD_RIM,
          display: 'flex',
        }}
      />
    </div>
  )
}

/** A dashed route between two things, flowing right, with an arrowhead. */
function Route({ width, label }: { width: number; label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width }}>
      <svg width={width} height="14" viewBox={`0 0 ${width} 14`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d={`M0 7 H${width - 10}`} stroke={LINE} strokeWidth={3} strokeDasharray="6 7" />
        <path
          d={`M${width - 14} 1 l8 6 l-8 6`}
          stroke={AMBER}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label ? (
        <div style={{ display: 'flex', fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: FAINT }}>{label}</div>
      ) : null}
    </div>
  )
}

/** A screen with a few lines of terminal on it: a laptop lying down, or a phone standing up. */
function Screen({
  kind,
  lines,
  width,
  height,
}: {
  kind: 'laptop' | 'phone'
  lines: ReactNode[]
  width: number
  height: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          height,
          borderRadius: kind === 'phone' ? 14 : 8,
          border: `3px solid ${LINE}`,
          background: SURFACE,
          padding: kind === 'phone' ? '18px 10px' : 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            borderRadius: 4,
            background: '#0d0d0c',
            padding: '10px 12px',
            gap: 4,
            fontFamily: MONO,
            fontSize: 14,
            lineHeight: 1.35,
            whiteSpace: 'pre',
          }}
        >
          {lines.map((line, index) => (
            <div key={index} style={{ display: 'flex' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
      {kind === 'laptop' ? (
        <div
          style={{ display: 'flex', width: width + 16, height: 8, borderRadius: '0 0 6px 6px', background: PANEL }}
        />
      ) : null}
    </div>
  )
}

/** Machine A, the bucket, machine B: the whole story, drawn. */
function Handshake() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Screen
        kind="laptop"
        width={150}
        height={104}
        lines={[
          <span key="put">
            <span style={{ color: FAINT }}>$ </span>s3nd put
          </span>,
          <span key="file" style={{ color: MUTED }}>
            report.pdf
          </span>,
          <span key="code" style={{ color: AMBER, letterSpacing: 2 }}>
            K7QP 2M4X
          </span>,
        ]}
      />
      <Route width={32} />
      <Bucket size={0.66} />
      <Route width={32} />
      <Screen
        kind="phone"
        width={86}
        height={140}
        lines={[
          <span key="get">
            <span style={{ color: FAINT }}>$ </span>get
          </span>,
          <span key="code" style={{ color: AMBER }}>
            k7qp-2m4x
          </span>,
          <span key="ok" style={{ display: 'flex', alignItems: 'center', gap: 6, color: OK }}>
            <Check size={13} /> 284 kB
          </span>,
        ]}
      />
    </div>
  )
}

/** A terminal window with one command typed. */
function Terminal({ command, output }: { command: ReactNode; output: string[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 380,
        borderRadius: 10,
        border: `3px solid ${LINE}`,
        background: SURFACE,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `2px solid ${LINE}` }}>
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: LINE }} />
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: LINE }} />
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: LINE }} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '18px 20px 20px',
          fontFamily: MONO,
          fontSize: 20,
          lineHeight: 1.4,
          background: '#0d0d0c',
        }}
      >
        <div style={{ display: 'flex', whiteSpace: 'pre' }}>
          <span style={{ color: AMBER }}>$ </span>
          {command}
        </div>
        {output.map((line) => (
          <div key={line} style={{ display: 'flex', color: MUTED }}>
            {line}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: AMBER }}>$ </span>
          <div style={{ display: 'flex', width: 12, height: 24, background: AMBER, marginLeft: 4 }} />
        </div>
      </div>
    </div>
  )
}

/** The sync code input from the React hooks: typed on one line, repaired on the next. */
function CodeInput() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: 380 }}>
      <Tiles scale={0.62} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: 340,
          height: 64,
          borderRadius: 6,
          border: `3px solid ${LINE}`,
          background: '#0d0d0c',
          padding: '0 18px',
          fontFamily: MONO,
          fontSize: 26,
          letterSpacing: 3,
        }}
      >
        k7qp-2m4x
        <div style={{ display: 'flex', width: 12, height: 30, background: AMBER, marginLeft: 6 }} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO,
          fontSize: 16,
          letterSpacing: 2,
          color: OK,
        }}
      >
        <Check /> NORMALIZED → K7QP2M4X
      </div>
    </div>
  )
}

/** The pair of braces the library is: a request in, a response out. */
function Braces() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 200, color: AMBER, lineHeight: 1 }}>{'{'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: MONO, fontSize: 20 }}>
        <div style={{ display: 'flex', color: INK }}>putFile()</div>
        <div style={{ display: 'flex', color: INK }}>getFile()</div>
        <div style={{ display: 'flex', color: MUTED }}>putSnapshot()</div>
        <div style={{ display: 'flex', color: AMBER }}>createTransferHandler()</div>
      </div>
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 200, color: AMBER, lineHeight: 1 }}>{'}'}</div>
    </div>
  )
}

/** The drop zone of the template, a file hovering over it. */
function DropZone() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: 380,
        height: 230,
        borderRadius: 10,
        border: `4px dashed ${AMBER}`,
        background: '#2b1e05',
      }}
    >
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 56, color: AMBER, lineHeight: 1 }}>↓</div>
      <div style={{ display: 'flex', fontSize: 30, letterSpacing: -1 }}>Drop a file here</div>
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 14, letterSpacing: 3, color: FAINT }}>
        UP TO 4 MB · EXPIRES AFTER 24 H
      </div>
    </div>
  )
}

/** Two names on two tiles, and the word between them. */
function Versus({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 34px',
          borderRadius: 8,
          background: AMBER,
          color: CANVAS,
          fontSize: 44,
          letterSpacing: -2,
        }}
      >
        s3nd
      </div>
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: FAINT }}>VS</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 34px',
          borderRadius: 8,
          border: `3px solid ${LINE}`,
          background: SURFACE,
          color: INK,
          fontSize: name.length > 12 ? 30 : 40,
          letterSpacing: -1,
          maxWidth: 380,
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </div>
    </div>
  )
}

/** A bucket, and the providers that speak S3, for the provider pages. */
function Providers({ current }: { current?: string }) {
  const names = ['S3', 'R2', 'MinIO', 'Scaleway', 'Wasabi']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <Bucket size={1.05} />
      <div style={{ display: 'flex', gap: 8 }}>
        {names.map((name) => {
          const active = current != null && name === current

          return (
            <div
              key={name}
              style={{
                display: 'flex',
                padding: '6px 10px',
                borderRadius: 4,
                border: `2px solid ${active ? AMBER : LINE}`,
                background: active ? AMBER : 'transparent',
                color: active ? CANVAS : MUTED,
                fontFamily: MONO,
                fontSize: 14,
                letterSpacing: 1,
              }}
            >
              {name}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Figure({ page }: { page: OgPage }) {
  switch (page.kind) {
    case 'how-it-works':
    case 'use-cases':
    case 'use-case':
      return <Handshake />
    case 'cli':
      return (
        <Terminal
          command={
            <span>
              s3nd put <span style={{ color: AMBER }}>./report.pdf</span>
            </span>
          }
          output={['report.pdf · 284 kB · expires in 1 h', 'K7QP2M4X']}
        />
      )
    case 'examples':
      return (
        <Terminal
          command={
            <span>
              git clone <span style={{ color: AMBER }}>AbderrahmaneMouzoune/s3nd</span>
            </span>
          }
          output={['bun install', 'examples/indexeddb-sync', 'examples/node-script']}
        />
      )
    case 'library':
      return <Braces />
    case 'react':
      return <CodeInput />
    case 'drop':
      return <DropZone />
    case 'providers':
      return <Providers />
    case 'provider':
      return <Providers current={page.tag} />
    case 'alternatives':
      return <Versus name="the rest" />
    case 'alternative':
      return <Versus name={page.title.replace(/^.*?\bvs\b\s*/i, '')} />
    case 'home':
      return null
  }
}

/* ─── The image ───────────────────────────────────────────────────────── */

const FOOTER_RIGHT = 'S3 · R2 · MinIO · Scaleway · Wasabi · MIT'

/** The home: the tagline as the headline, the code on the board, nothing else. */
function Home({ page }: { page: OgPage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark />
        <div style={{ display: 'flex', fontFamily: MONO, fontSize: 20, letterSpacing: 5, color: FAINT }}>
          {page.eyebrow.toUpperCase()}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: titleSize(page.title, true),
          lineHeight: 0.92,
          letterSpacing: -5,
          maxWidth: 1000,
          textTransform: 'uppercase',
        }}
      >
        {page.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Tiles />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontFamily: MONO,
            fontSize: 18,
            color: MUTED,
            lineHeight: 1.6,
            textAlign: 'right',
          }}
        >
          <div style={{ display: 'flex' }}>s3nd.sh · CLI, library, React hooks · MIT</div>
          <div style={{ display: 'flex' }}>S3 · R2 · MinIO · Scaleway · Wasabi</div>
        </div>
      </div>
    </div>
  )
}

/** Every other page: the section as a stamp, the title, one line of description, the figure. */
function Page({ page, locale }: { page: OgPage; locale: Locale }) {
  const size = titleSize(page.title, false)
  const url = `${site.domain}${locale === 'en' ? '' : `/${locale}`}${page.path === '/' ? '' : page.path}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {page.tag ? <Stamp tone="muted">{page.tag}</Stamp> : null}
          <Stamp>{page.eyebrow}</Stamp>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 36, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: 600, flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: Math.round(size * -0.035),
              textWrap: 'balance',
            }}
          >
            {page.title}
          </div>
          <div style={{ display: 'flex', fontFamily: MONO, fontSize: 21, lineHeight: 1.5, color: MUTED }}>
            {clip(page.description, 150)}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 420,
            height: 300,
            flexShrink: 0,
          }}
        >
          <Figure page={page} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Tiles scale={0.56} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontFamily: MONO,
            fontSize: 18,
            lineHeight: 1.6,
            textAlign: 'right',
          }}
        >
          <div style={{ display: 'flex', color: INK }}>{url}</div>
          <div style={{ display: 'flex', color: FAINT }}>{FOOTER_RIGHT}</div>
        </div>
      </div>
    </div>
  )
}

export function OgImage({ page, locale }: { page: OgPage; locale: Locale }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: CANVAS,
        color: INK,
        fontFamily: DISPLAY,
      }}
    >
      <Hazard />
      <div
        style={{
          flex: 1,
          display: 'flex',
          padding: page.kind === 'home' ? '56px 72px 60px' : '44px 72px 48px',
        }}
      >
        {page.kind === 'home' ? <Home page={page} /> : <Page page={page} locale={locale} />}
      </div>
    </div>
  )
}

export type { OgKind }
