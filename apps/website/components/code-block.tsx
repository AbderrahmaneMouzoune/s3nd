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
 * Server-rendered syntax highlighting. Shiki runs at build time with a single
 * dark theme whose accents sit close to the site's amber, so no JavaScript
 * reaches the browser for it.
 */
export async function CodeBlock({ code, lang = 'ts', title, className }: CodeBlockProps) {
  const html = await codeToHtml(code, { lang, theme: 'vesper' })

  return (
    <figure className={cx('border-line overflow-hidden rounded-lg border bg-[#0d0d0c]', className)}>
      {title ? (
        <figcaption className="border-line text-ink-faint flex items-center gap-2 border-b px-4 py-2 font-mono text-[10px] tracking-[0.18em] uppercase">
          <span className="bg-accent inline-block h-2.5 w-1" aria-hidden="true" />
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
        'border-line-strong text-ink inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-md border bg-[#0d0d0c] px-3 py-2 font-mono text-sm',
        className,
      )}
    >
      <span className="text-accent select-none" aria-hidden="true">
        $
      </span>
      {children}
    </code>
  )
}
