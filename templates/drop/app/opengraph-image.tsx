import { ImageResponse } from 'next/og'

import { DropCard, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from '@/lib/og'

export const alt = 'Drop a file, get a code, pick it up anywhere.'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** The card for the front page, drawn once at build time. */
export default async function OpenGraphImage() {
  return new ImageResponse(
    <DropCard eyebrow="Drop a file · hand over the code" headline="A file, a code, your bucket." code="K7QP2M4X" />,
    { ...size, fonts: await ogFonts() },
  )
}
