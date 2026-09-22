import { ImageResponse } from 'next/og'

import { formatBytes, formatExpiry } from '@/lib/format'
import { readGuard } from '@/lib/guard'
import { DropCard, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from '@/lib/og'
import { lookupTransfer, normalizeCode } from '@/lib/transfers'

export const alt = 'A file is waiting under this code.'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Never cached: what the card says depends on what is in the bucket right now. */
export const dynamic = 'force-dynamic'

/**
 * The card for a pickup link pasted in a chat: the filename, the size and the
 * time left, with the code on the board. Whoever holds the link holds the
 * code already, so the card gives nothing away that the URL did not — and for
 * a transfer with a password on it, that means saying only that it is locked.
 * An unknown or expired code gets the front page's card.
 */
export default async function PickupImage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code)
  const guard = code ? await readGuard(code).catch(() => null) : null
  const fonts = await ogFonts()

  if (guard?.password) {
    return new ImageResponse(
      <DropCard
        eyebrow="Locked"
        headline="A password opens this one."
        detail="The sender sent it by another route."
        code={code ?? 'K7QP2M4X'}
      />,
      { ...size, fonts },
    )
  }

  const meta = code ? await lookupTransfer(code).catch(() => null) : null

  if (!meta) {
    return new ImageResponse(
      <DropCard eyebrow="Unknown or expired code" headline="Nothing is waiting here." code="K7QP2M4X" />,
      { ...size, fonts },
    )
  }

  const isFile = meta.kind === 'file'
  const name = isFile ? (meta.filename ?? 'a file') : (meta.app ?? 'a snapshot')
  const detail = [
    formatBytes(meta.size),
    `expires ${formatExpiry(meta.expiresAt)}`,
    guard?.oneTime ? 'one download' : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return new ImageResponse(
    <DropCard
      tone="ok"
      eyebrow={isFile ? 'A file is waiting for you' : 'Application state is waiting for you'}
      headline={name}
      detail={detail}
      code={meta.code}
    />,
    { ...size, fonts },
  )
}
