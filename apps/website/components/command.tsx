'use client'

import { useLocale } from './locale-provider'
import { useCopied } from './copy-button'
import { cx } from './ui'

/**
 * One shell line, for install commands and the like. The whole line is a
 * button: click it and the command is on the clipboard, the border flashes
 * amber and the prompt turns into a tick for a moment.
 */
export function Command({ children, className }: { children: string; className?: string }) {
  const { ui } = useLocale()
  const [copied, copy] = useCopied()

  return (
    <button
      type="button"
      onClick={() => void copy(children)}
      title={ui.copyCommand}
      aria-label={`${ui.copyCommand}: ${children}`}
      data-copied={copied ? 'true' : undefined}
      className={cx(
        'command group/cmd border-line-strong text-ink hover:border-accent inline-flex max-w-full cursor-copy items-center gap-2 rounded-md border bg-[#0d0d0c] px-3 py-2 text-left font-mono text-sm transition-[border-color,transform] duration-200 active:scale-[0.99]',
        copied && 'border-ok flash',
        className,
      )}
    >
      <span className={cx('select-none transition-colors', copied ? 'text-ok' : 'text-accent')} aria-hidden="true">
        {copied ? '✓' : '$'}
      </span>
      <code className="min-w-0 overflow-x-auto whitespace-nowrap">{children}</code>
      <span
        aria-hidden="true"
        className={cx(
          'ml-1 shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase transition-opacity duration-200',
          copied
            ? 'text-ok opacity-100'
            : 'text-ink-faint opacity-0 group-hover/cmd:opacity-100 group-focus-visible/cmd:opacity-100',
        )}
      >
        {copied ? ui.copied : ui.copy}
      </span>
    </button>
  )
}
