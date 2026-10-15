'use client'

import { useRef, useState } from 'react'

import type { Dictionary } from '@/lib/i18n'

const POSTER = '/film/s3nd-launch-poster.jpg'

/**
 * The launch film, rendered from `.github/launch`. It is quiet until asked:
 * the poster and one amber play tile, then the film with its sound and the
 * browser's own controls. Nothing downloads before the click but the poster.
 */
export function LaunchFilm({ t }: { t: Dictionary['howItWorks']['film'] }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const play = () => {
    setPlaying(true)
    void video.current?.play()
  }

  return (
    <figure className="group relative">
      <div className="border-line bg-surface shadow-card relative aspect-video overflow-hidden rounded-lg border">
        <video
          ref={video}
          className="block h-full w-full"
          poster={POSTER}
          preload="none"
          playsInline
          controls={playing}
          aria-label={t.label}
        >
          <source src="/film/s3nd-launch.webm" type="video/webm" />
          <source src="/film/s3nd-launch.mp4" type="video/mp4" />
        </video>
        {playing ? null : (
          <button
            type="button"
            onClick={play}
            className="focus-visible:outline-accent absolute inset-0 flex cursor-pointer items-end justify-start bg-gradient-to-t from-black/70 via-black/0 to-black/0 p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:p-6"
          >
            <span className="flex items-center gap-3">
              <span className="bg-accent text-accent-ink flex size-12 items-center justify-center rounded-md shadow-[0_0_32px_rgb(255_176_0/0.45)] transition-transform duration-300 group-hover:scale-105 sm:size-14">
                <svg viewBox="0 0 24 24" className="ml-0.5 size-5 sm:size-6" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
                </svg>
              </span>
              <span className="text-left">
                <span className="text-ink block text-sm font-semibold sm:text-base">{t.play}</span>
                <span className="text-ink-muted block font-mono text-[11px] tracking-[0.18em] uppercase">{t.meta}</span>
              </span>
            </span>
          </button>
        )}
      </div>
    </figure>
  )
}
