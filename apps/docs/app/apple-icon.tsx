import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** The home-screen icon: the amber tile, the arrow leaving it. Same mark as `icon.svg`. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffb000',
      }}
    >
      <svg width="180" height="180" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 16h12M16.5 10.5 22 16l-5.5 5.5"
          stroke="#0a0a0a"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7.5 6.5v19" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 3" />
      </svg>
    </div>,
    size,
  )
}
