'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** A button that copies `text` and says so for a moment. */
export function CopyButton({
  text,
  label,
  className = '',
}: {
  /** The value, or a function that reads it at click time (the page URL, say). */
  text: string | (() => string)
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(async () => {
    if (!(await copyText(typeof text === 'function' ? text() : text))) return
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }, [text])

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`btn inline-flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase ${
        copied ? 'border-ok text-ok flash' : 'border-line-strong text-ink hover:border-accent hover:text-accent'
      } ${className}`}
    >
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      {copied ? 'Copied' : label}
    </button>
  )
}
