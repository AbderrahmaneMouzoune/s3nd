'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Marks `[data-reveal]` elements as `in` once they scroll into view, which
 * the stylesheet turns into a fade-up. Runs again after every navigation.
 * Without JavaScript nothing is hidden: the `js` class on `<html>` is what
 * enables the hidden state, and it is set by an inline script in the layout.
 */
export function RevealObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="in"])'))
    if (elements.length === 0) return

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const element of elements) element.dataset.reveal = 'in'
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          ;(entry.target as HTMLElement).dataset.reveal = 'in'
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    for (const element of elements) observer.observe(element)

    return () => observer.disconnect()
  }, [pathname])

  return null
}
