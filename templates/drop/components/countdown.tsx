'use client'

import { useEffect, useState } from 'react'

import { formatCountdown } from '@/lib/format'

/**
 * The time left, ticking. The server rendered `initial`, and the first client
 * render says exactly the same thing; the clock only starts once the page is
 * hydrated, which is how the markup stays identical on both sides.
 */
export function Countdown({ expiresAt, initial }: { expiresAt?: string; initial: string }) {
  const [left, setLeft] = useState(initial)

  useEffect(() => {
    if (!expiresAt) return

    const tick = () => setLeft(formatCountdown(expiresAt))
    tick()
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <time dateTime={expiresAt} className="tabular-nums">
      {left}
    </time>
  )
}
