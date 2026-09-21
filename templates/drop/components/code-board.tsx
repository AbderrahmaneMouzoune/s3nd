'use client'

import { useEffect, useState } from 'react'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * A departure-board display for the code: the tiles spin through the alphabet
 * and settle left to right. The final value is in the HTML, so it reads
 * correctly without JavaScript and for assistive technology.
 */
export function CodeBoard({ code, size = 'lg' }: { code: string; size?: 'md' | 'lg' }) {
  const target = code.toUpperCase()
  const [shown, setShown] = useState(target)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target)
      return
    }

    const start = performance.now()
    const settleAt = Array.from({ length: target.length }, (_, index) => 320 + index * 95)

    const tick = () => {
      const elapsed = performance.now() - start
      setShown(
        target
          .split('')
          .map((character, index) =>
            elapsed >= settleAt[index] ? character : ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
          )
          .join(''),
      )
      if (elapsed >= settleAt[target.length - 1]) clearInterval(interval)
    }

    const interval = setInterval(tick, 55)
    tick()

    return () => clearInterval(interval)
  }, [target])

  const grouped = target.match(/.{1,4}/g)?.join(' ') ?? target
  const tile =
    size === 'lg' ? 'h-14 w-10 text-2xl sm:h-20 sm:w-14 sm:text-4xl' : 'h-10 w-7 text-lg sm:h-12 sm:w-9 sm:text-2xl'

  return (
    <div role="img" aria-label={`Code: ${grouped}`} className="flex gap-1 sm:gap-1.5">
      {shown.split('').map((character, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`flap ${tile} ${index === 3 && target.length > 4 ? 'mr-1.5 sm:mr-2.5' : ''}`}
        >
          {character}
        </span>
      ))}
    </div>
  )
}
