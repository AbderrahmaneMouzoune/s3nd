import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { site } from '@/lib/site'

export const alt = `${site.name}: ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CODE = ['K', '7', 'Q', 'P', ' ', '2', 'M', '4', 'X']

/** Generated at build time, shared by every page as its Open Graph image. */
export default async function OpenGraphImage() {
  const [display, mono] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/BricolageGrotesque-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'app/fonts/JetBrainsMono-Bold.ttf')),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
        color: '#f3efe4',
        fontFamily: 'Bricolage',
      }}
    >
      <div style={{ display: 'flex', height: 16, width: '100%', background: '#ffb000' }} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 72px 60px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                background: '#ffb000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a0a0a',
                fontSize: 34,
                fontFamily: 'JetBrains',
              }}
            >
              →
            </div>
            <div style={{ fontSize: 44, letterSpacing: -2 }}>s3nd</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains',
              fontSize: 20,
              letterSpacing: 5,
              color: '#7f7a70',
            }}
          >
            YOUR BUCKET · A CODE · NO ACCOUNT
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 104, lineHeight: 0.92, letterSpacing: -5, maxWidth: 1000 }}>
          SEND ANYTHING WITH A CODE.
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {CODE.map((character, index) =>
              character === ' ' ? (
                <div key={index} style={{ display: 'flex', width: 14 }} />
              ) : (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 90,
                    borderRadius: 6,
                    background: '#1c1b19',
                    color: '#ffb000',
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
              ),
            )}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontFamily: 'JetBrains',
              fontSize: 18,
              color: '#b3ada1',
              lineHeight: 1.6,
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex' }}>s3nd.sh · CLI, library, React hooks · MIT</div>
            <div style={{ display: 'flex' }}>S3 · R2 · MinIO · Scaleway · Wasabi</div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: display, weight: 800, style: 'normal' },
        { name: 'JetBrains', data: mono, weight: 700, style: 'normal' },
      ],
    },
  )
}
