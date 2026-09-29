'use client'

import { useLocale } from './locale-provider'
import { useCopied } from './copy-button'
import { cx } from './ui'

/**
 * One shell line, for install commands and the like. The whole line is a
 * button: click it and the command is on the clipboard, the border flashes
 * and the prompt turns into a tick for a moment. `primary` makes it the
 * page's main call to action, amber and lifted like a primary button.
 */
export function Command({
  children,
  variant = 'default',
  className,
}: {
  children: string
  variant?: 'default' | 'primary'
  className?: string
}) {
  const { ui } = useLocale()
  const [copied, copy] = useCopied()
  const primary = variant === 'primary'

  return (
    <button
      type="button"
      onClick={() => void copy(children)}
      title={ui.copyCommand}
      aria-label={`${ui.copyCommand}: ${children}`}
      data-copied={copied ? 'true' : undefined}
      className={cx(
        'command group/cmd inline-flex max-w-full cursor-copy items-center gap-2 rounded-md border text-left font-mono transition-[border-color,transform] duration-200 active:scale-[0.99]',
        primary
          ? 'btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright border-transparent px-5 py-3.5 text-[15px] font-bold'
          : 'border-line-strong text-ink hover:border-accent bg-[#0d0d0c] px-3 py-2 text-sm',
        copied && (primary ? 'flash' : 'border-ok flash'),
        className,
      )}
    >
      <span
        className={cx('select-none transition-colors', primary ? 'opacity-70' : copied ? 'text-ok' : 'text-accent')}
        aria-hidden="true"
      >
        {copied ? '✓' : '$'}
      </span>
      <code className="min-w-0 overflow-x-auto whitespace-nowrap">{children}</code>
      <span
        aria-hidden="true"
        className={cx(
          'ml-1 shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase transition-opacity duration-200',
          primary
            ? 'opacity-80'
            : copied
              ? 'text-ok opacity-100'
              : 'text-ink-faint opacity-0 group-hover/cmd:opacity-100 group-focus-visible/cmd:opacity-100',
        )}
      >
        {copied ? ui.copied : ui.copy}
      </span>
    </button>
  )
}
