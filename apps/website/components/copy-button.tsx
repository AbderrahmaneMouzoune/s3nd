'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from './locale-provider'
import { cx } from './ui'

/** Writes `text` to the clipboard, with the old-fashioned fallback for insecure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the textarea trick
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

/** The copied state, with the timer that clears it. */
export function useCopied(delay = 1800): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(
    async (text: string) => {
      if (!(await copyText(text))) return
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), delay)
    },
    [delay],
  )

  return [copied, copy]
}

/**
 * A small copy button for a code block: quiet until hovered or focused, loud
 * once it has copied. `kind` says what is on the clipboard, the first command
 * of a transcript or the whole block, so the label and the tooltip can say so.
 */
export function CopyButton({
  text,
  kind = 'code',
  label,
  className,
}: {
  text: string
  kind?: 'command' | 'code'
  label?: string
  className?: string
}) {
  const { ui } = useLocale()
  const [copied, copy] = useCopied()
  const title = label ?? (kind === 'command' ? ui.copyCommand : ui.copyCode)

  return (
    <button
      type="button"
      onClick={() => void copy(text)}
      aria-label={`${title}: ${text.length > 80 ? `${text.slice(0, 80)}…` : text}`}
      title={title}
      data-copied={copied ? 'true' : undefined}
      className={cx(
        'copy-button border-line-strong bg-canvas/80 text-ink-muted hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase backdrop-blur transition-colors',
        copied && 'border-ok text-ok flash',
        className,
      )}
    >
      <span aria-hidden="true" className="text-[11px]">
        {copied ? '✓' : '⧉'}
      </span>
      {copied ? ui.copied : ui.copy}
    </button>
  )
}
