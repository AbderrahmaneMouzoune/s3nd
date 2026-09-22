'use client'

import { useEffect, useState } from 'react'

import { cx } from './ui'

/** The default alphabet, Crockford base32: what the tiles spin through. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

interface SplitFlapProps {
  /** The code to display. Shorter values are padded with blank tiles. */
  value: string
  length?: number
  /** Insert a gap after this many tiles, the way an app should show a code. */
  groupAt?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

/* Eight tiles plus gaps must fit a 360px phone, board padding included. */
const SIZES = {
  sm: 'h-8 w-6 text-sm',
  md: 'h-10 w-7 text-lg sm:h-12 sm:w-9 sm:text-2xl',
  lg: 'h-12 w-8 text-xl sm:h-20 sm:w-14 sm:text-4xl',
}

/**
 * A departure-board display for a sync code. The server renders the final
 * value, so the code is in the HTML; on the client the tiles spin through the
 * alphabet and settle left to right, and again whenever the value changes.
 */
export function SplitFlap({ value, length = 8, groupAt = 4, size = 'lg', label = 'Code', className }: SplitFlapProps) {
  const target = value.toUpperCase().padEnd(length, ' ').slice(0, length)
  const [shown, setShown] = useState(target)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target)
      return
    }

    const start = performance.now()
    const settleAt = Array.from({ length }, (_, index) => 320 + index * 95)

    const tick = () => {
      const elapsed = performance.now() - start

      setShown(
        target
          .split('')
          .map((character, index) => {
            if (elapsed >= settleAt[index] || character === ' ') return character

            return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
          })
          .join(''),
      )

      if (elapsed >= settleAt[length - 1]) clearInterval(interval)
    }

    const interval = setInterval(tick, 55)
    tick()

    return () => clearInterval(interval)
  }, [target, length])

  const grouped =
    target
      .trim()
      .match(new RegExp(`.{1,${groupAt}}`, 'g'))
      ?.join(' ') ?? target.trim()

  return (
    <div role="img" aria-label={`${label}: ${grouped || 'empty'}`} className={cx('flex gap-1 sm:gap-1.5', className)}>
      {shown.split('').map((character, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-blank={character === ' ' ? 'true' : undefined}
          className={cx(
            'flap',
            SIZES[size],
            groupAt > 0 && index === groupAt - 1 && index < length - 1 && 'mr-1.5 sm:mr-2.5',
          )}
        >
          {character === ' ' ? '·' : character}
        </span>
      ))}
    </div>
  )
}
