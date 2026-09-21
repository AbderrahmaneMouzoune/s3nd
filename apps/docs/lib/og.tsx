import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { docsUrl } from './shared'

/**
 * The card a chat or a social network shows for a documentation page: the
 * wordmark and a "docs" stamp, the section, the page's title and description,
 * and the code on the board. Drawn by satori at 1200 × 630, in the website's
 * palette, with the two static faces under `app/fonts`.
 */

export const OG_SIZE = { width: 1200, height: 630 }

const CANVAS = '#0a0a0a'
const PANEL = '#1c1b19'
const INK = '#f3efe4'
const MUTED = '#b3ada1'
const FAINT = '#7f7a70'
const AMBER = '#ffb000'

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
    { name: 'Bricolage', data: display, weight: 800, style: 'normal' },
    { name: 'JetBrains', data: mono, weight: 700, style: 'normal' },
  ])

  return fonts
}

/** Cuts a description at a word boundary, so it stays on two lines. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')

  return `${cut.slice(0, at > max * 0.6 ? at : cut.length).replace(/[,.;:]$/, '')}…`
}

function Stamp({ children, tone = 'accent' }: { children: string; tone?: 'accent' | 'muted' }) {
  const color = tone === 'accent' ? AMBER : MUTED

  return (
    <div
      style={{
        display: 'flex',
        border: `2px solid ${color}`,
        color,
        borderRadius: 4,
        padding: '6px 12px',
        fontFamily: 'JetBrains',
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

function Tiles() {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {CODE.map((character, index) =>
        character === ' ' ? (
          <div key={index} style={{ display: 'flex', width: 8 }} />
        ) : (
          <div
            key={index}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 50,
              borderRadius: 4,
              background: PANEL,
              color: AMBER,
              fontFamily: 'JetBrains',
              fontSize: 29,
            }}
          >
            {character}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 25,
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

export interface DocsCardProps {
  /** Where the page sits: "Documentation", "Use cases", "API reference". */
  section: string
  title: string
  description?: string
  /** The page path, shown bottom right: `/docs/quick-start`. */
  path: string
}

export function DocsCard({ section, title, description, path }: DocsCardProps) {
  const size = title.length <= 22 ? 92 : title.length <= 36 ? 76 : title.length <= 52 ? 62 : 52

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: CANVAS,
        color: INK,
        fontFamily: 'Bricolage',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 16,
          width: '100%',
          backgroundImage: `repeating-linear-gradient(-45deg, ${AMBER} 0 12px, ${CANVAS} 12px 24px)`,
        }}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 72px 52px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                fontFamily: 'JetBrains',
              }}
            >
              →
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 44, letterSpacing: -2 }}>
              s3nd
              <span style={{ color: FAINT, fontSize: 40 }}>.sh</span>
            </div>
            <div style={{ display: 'flex', marginLeft: 6 }}>
              <Stamp>docs</Stamp>
            </div>
          </div>
          <Stamp tone="muted">{section}</Stamp>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000 }}>
          <div style={{ display: 'flex', fontSize: size, lineHeight: 1.02, letterSpacing: Math.round(size * -0.035) }}>
            {title}
          </div>
          {description ? (
            <div style={{ display: 'flex', fontFamily: 'JetBrains', fontSize: 22, lineHeight: 1.5, color: MUTED }}>
              {clip(description, 170)}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Tiles />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontFamily: 'JetBrains',
              fontSize: 18,
              lineHeight: 1.6,
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex', color: INK }}>{`${docsUrl.replace(/^https?:\/\//, '')}${path}`}</div>
            <div style={{ display: 'flex', color: FAINT }}>S3 · R2 · MinIO · Scaleway · Wasabi · MIT</div>
          </div>
        </div>
      </div>
    </div>
  )
}
