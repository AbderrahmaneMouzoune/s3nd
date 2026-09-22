'use client'

import { useState } from 'react'

import { previewKind } from '@/lib/preview'

import { FilePreview } from './file-preview'

export interface PickupPreviewProps {
  code: string
  filename: string
  contentType?: string
  size?: number
  /** A one-time code: the preview is free, the download is the spend. */
  oneTime: boolean
  /** Bytes. Above it, nothing is rendered — a preview costs what a download costs. */
  maxSize: number
}

/**
 * What is behind the code, on the receiving side, before anything is saved:
 * the same component the sender saw, pointed at `/api/preview/<code>`.
 *
 * On a one-time code it waits to be asked. Rendering it spends no pickup —
 * only the download does — but a file that burns on the way out deserves a
 * deliberate click rather than an automatic one.
 */
export function PickupPreview({ code, filename, contentType, size, oneTime, maxSize }: PickupPreviewProps) {
  const [asked, setAsked] = useState(!oneTime)
  const kind = previewKind(contentType, filename)

  if (kind === 'none') return null

  const tooBig = size != null && size > maxSize

  if (tooBig) {
    return (
      <FilePreview
        src=""
        filename={filename}
        contentType={contentType}
        size={size}
        unavailable="too large to show · download it instead"
      />
    )
  }

  if (!asked) {
    return (
      <button
        type="button"
        onClick={() => setAsked(true)}
        className="btn border-line-strong hover:border-accent hover:text-accent text-ink-muted w-full rounded-lg border px-5 py-6 font-mono text-[11px] font-bold tracking-[0.18em] uppercase"
      >
        Show me what it is · costs nothing
      </button>
    )
  }

  return (
    <FilePreview
      src={`/api/preview/${encodeURIComponent(code)}`}
      filename={filename}
      contentType={contentType}
      size={size}
    />
  )
}
