import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { dropConfig } from './config'

/**
 * The card a chat or a social network shows when a link to this drop is
 * pasted: the front page's, and the pickup page's with what is waiting under
 * the code. Drawn by satori at 1200 × 630, in the template's palette, with the
 * two static faces under `app/fonts`.
 */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const CANVAS = '#0a0a0a'
const PANEL = '#1c1b19'
const INK = '#f3efe4'
const MUTED = '#b3ada1'
const FAINT = '#7f7a70'
const AMBER = '#ffb000'
const OK = '#6fe3a1'

interface OgFont {
  name: string
  data: Buffer
  weight: 700 | 800
  style: 'normal'
}

let fonts: Promise<OgFont[]> | undefined

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

function Tiles({ code }: { code: string }) {
  const characters = code.toUpperCase().split('')

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {characters.map((character, index) => (
        <div key={index} style={{ display: 'flex', gap: 8 }}>
          {index === 4 ? <div style={{ display: 'flex', width: 14 }} /> : null}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 90,
              borderRadius: 6,
              background: PANEL,
              color: AMBER,
              fontFamily: 'JetBrains',
              fontSize: 52,
            }}
          >
            {character}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 45,
                height: 1,
                display: 'flex',
                background: '#050505',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface DropCardProps {
  /** The small amber line above the headline. */
  eyebrow: string
  /** Green when something is waiting, amber otherwise. */
  tone?: 'accent' | 'ok'
  headline: string
  /** A line of mono under the headline: the file, its size, the expiry. */
  detail?: string
  /** The code on the board; blank tiles when there is none. */
  code?: string
}

export function DropCard({ eyebrow, tone = 'accent', headline, detail, code }: DropCardProps) {
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
          padding: '52px 72px 56px',
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
            <div style={{ display: 'flex', fontSize: 44, letterSpacing: -2 }}>{dropConfig.name}</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains', fontSize: 20, letterSpacing: 5, color: FAINT }}>
            YOUR BUCKET · A CODE · NO ACCOUNT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains',
              fontSize: 22,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: tone === 'ok' ? OK : AMBER,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: headline.length > 26 ? 76 : 96,
              lineHeight: 0.95,
              letterSpacing: -4,
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
          {detail ? (
            <div style={{ display: 'flex', fontFamily: 'JetBrains', fontSize: 24, color: MUTED }}>{detail}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Tiles code={code ?? '········'} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontFamily: 'JetBrains',
              fontSize: 18,
              color: MUTED,
              lineHeight: 1.6,
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex' }}>a code · a link · a QR code</div>
            <div style={{ display: 'flex', color: FAINT }}>built on s3nd.sh · your own bucket</div>
          </div>
        </div>
      </div>
    </div>
  )
}
