'use client'

import { useEffect, useRef, useState } from 'react'

import { formatBytes } from '@/lib/format'
import { extensionOf, previewKind } from '@/lib/preview'

/** Characters of a text file put on screen. Enough to recognise it by. */
const TEXT_LIMIT = 20_000

export interface FilePreviewProps {
  /** A `blob:` URL for a file about to be sent, or `/api/preview/<code>` for one that landed. */
  src: string
  filename: string
  contentType?: string
  size?: number
  /** Something to say instead of a preview: over the size ceiling, say. */
  unavailable?: string
  className?: string
}

/**
 * What the file actually is, shown rather than described: the image, the
 * video, the first lines of the text. The sender sees it from the local file,
 * before anything is uploaded; the receiver sees the same component pointed
 * at the preview route, before anything is downloaded.
 *
 * Nothing here is authoritative — a preview is a courtesy, and a format that
 * cannot be shown is named instead, never hidden.
 */
export function FilePreview({ src, filename, contentType, size, unavailable, className = '' }: FilePreviewProps) {
  const kind = previewKind(contentType, filename)
  const [detail, setDetail] = useState('')

  const frame = `border-line bg-[#0d0d0c] overflow-hidden rounded-lg border ${className}`

  if (unavailable || kind === 'none') {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-2 px-5 py-10 text-center`}>
        <span className="text-ink-faint font-mono text-3xl font-bold" aria-hidden="true">
          {extensionOf(filename).toUpperCase() || '···'}
        </span>
        <span className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">
          {unavailable ?? 'no preview for this format'}
        </span>
      </div>
    )
  }

  return (
    <figure className={frame}>
      {kind === 'image' ? (
        <div className="checkerboard flex max-h-[26rem] items-center justify-center">
          {/* A plain <img>: the bytes come from the bucket through a route, and
              there is nothing for the image optimizer to do with them. */}
          <img
            src={src}
            alt={`A preview of ${filename}`}
            className="max-h-[26rem] w-auto max-w-full object-contain"
            onLoad={(event) => {
              const image = event.currentTarget
              setDetail(`${image.naturalWidth} × ${image.naturalHeight}`)
            }}
          />
        </div>
      ) : null}

      {kind === 'video' ? (
        <video
          src={src}
          controls
          preload="metadata"
          playsInline
          className="max-h-[26rem] w-full bg-black"
          onLoadedMetadata={(event) => setDetail(describeMedia(event.currentTarget))}
        />
      ) : null}

      {kind === 'audio' ? (
        <div className="px-5 py-6">
          <audio
            src={src}
            controls
            preload="metadata"
            className="w-full"
            onLoadedMetadata={(event) => setDetail(describeMedia(event.currentTarget))}
          />
        </div>
      ) : null}

      {kind === 'pdf' ? (
        <iframe src={src} title={`A preview of ${filename}`} className="h-[26rem] w-full bg-[#1c1b19]" />
      ) : null}

      {kind === 'text' ? <TextPreview src={src} onDetail={setDetail} /> : null}

      <figcaption className="border-line text-ink-faint flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase">
        <span className="text-ink-muted min-w-0 truncate normal-case">{filename}</span>
        {size != null ? <span>{formatBytes(size)}</span> : null}
        {detail ? <span className="text-accent">{detail}</span> : null}
      </figcaption>
    </figure>
  )
}

function describeMedia(element: HTMLVideoElement | HTMLAudioElement): string {
  const seconds = Number.isFinite(element.duration) ? Math.round(element.duration) : 0
  const length = seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : ''

  if (element instanceof HTMLVideoElement && element.videoWidth > 0) {
    return [`${element.videoWidth} × ${element.videoHeight}`, length].filter(Boolean).join(' · ')
  }

  return length
}

/** The first lines of a text file, read straight off the same URL. */
function TextPreview({ src, onDetail }: { src: string; onDetail: (detail: string) => void }) {
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const detail = useRef(onDetail)
  detail.current = onDetail

  useEffect(() => {
    const controller = new AbortController()
    setText(null)
    setFailed(false)

    fetch(src, { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((body) => {
        const lines = body.split('\n').length
        setText(body.slice(0, TEXT_LIMIT))
        detail.current(`${lines} line${lines === 1 ? '' : 's'}`)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setFailed(true)
      })

    return () => controller.abort()
  }, [src])

  if (failed) {
    return <p className="text-ink-faint px-4 py-6 text-center font-mono text-xs">This one would not open to be read.</p>
  }

  if (text === null) {
    return (
      <p className="text-ink-faint px-4 py-6 text-center font-mono text-[10px] tracking-[0.22em] uppercase">reading…</p>
    )
  }

  return (
    <pre className="text-ink-muted max-h-[26rem] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed">
      {text}
      {text.length >= TEXT_LIMIT ? <span className="text-ink-faint">{'\n… truncated'}</span> : null}
    </pre>
  )
}
