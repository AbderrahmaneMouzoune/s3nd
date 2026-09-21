import { ImageResponse } from 'next/og'

import { site } from '@/lib/site'

export const alt = `${site.name}: ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Generated at build time, shared by every page as its Open Graph image. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: '#0f0e0c',
        color: '#f1eee8',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#ff6a35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a0b04',
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          →
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>s3nd</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, maxWidth: 980 }}>
          Move data between devices with a code.
        </div>
        <div style={{ fontSize: 30, color: '#a9a297', maxWidth: 940, lineHeight: 1.3 }}>
          Local-first app state or a file, through your own S3 bucket. A library, React hooks and a CLI.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            padding: '14px 26px',
            border: '2px dashed #3d3932',
            borderRadius: 14,
            fontSize: 40,
            letterSpacing: 10,
            fontFamily: 'monospace',
          }}
        >
          K7QP 2M4X
        </div>
        <div style={{ fontSize: 26, color: '#6f695f' }}>s3nd.sh · MIT · AWS S3, R2, MinIO, Scaleway, Wasabi</div>
      </div>
    </div>,
    size,
  )
}
