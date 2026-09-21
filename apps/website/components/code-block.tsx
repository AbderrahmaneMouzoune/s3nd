import { codeToHtml, type BundledLanguage } from 'shiki'

import { cx } from './ui'

interface CodeBlockProps {
  code: string
  lang?: BundledLanguage | 'text'
  /** A filename or a caption, shown above the code. */
  title?: string
  className?: string
}

/**
 * Server-rendered syntax highlighting. Shiki runs at build time and emits both
 * themes; `globals.css` switches to the dark one with the colour scheme, so no
 * JavaScript reaches the browser for it.
 */
export async function CodeBlock({ code, lang = 'ts', title, className }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: 'light',
  })

  return (
    <figure className={cx('border-line bg-surface shadow-card overflow-hidden rounded-xl border', className)}>
      {title ? (
        <figcaption className="border-line text-ink-faint flex items-center gap-2 border-b px-4 py-2 font-mono text-[11px]">
          <span className="bg-accent inline-block size-1.5 rounded-full" aria-hidden="true" />
          {title}
        </figcaption>
      ) : null}
      <div
        className="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed [&_pre]:min-w-max"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  )
}

/** One shell line, for install commands and the like. */
export function Command({ children, className }: { children: string; className?: string }) {
  return (
    <code
      className={cx(
        'border-line bg-surface-muted text-ink inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border px-3 py-2 font-mono text-sm',
        className,
      )}
    >
      <span className="text-ink-faint select-none" aria-hidden="true">
        $
      </span>
      {children}
    </code>
  )
}
