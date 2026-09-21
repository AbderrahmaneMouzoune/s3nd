import { codeToHtml, type BundledLanguage } from 'shiki'

import { CopyButton } from './copy-button'
import { cx } from './ui'

export { Command } from './command'

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
 * reaches the browser for it. The copy button in the corner is the one client
 * component here.
 */
export async function CodeBlock({ code, lang = 'ts', title, className }: CodeBlockProps) {
  const html = await codeToHtml(code, { lang, theme: 'vesper' })

  return (
    <figure
      className={cx(
        'code-block group/code border-line relative overflow-hidden rounded-lg border bg-[#0d0d0c]',
        className,
      )}
    >
      {title ? (
        <figcaption className="border-line text-ink-faint flex items-center gap-2 border-b px-4 py-2 pr-24 font-mono text-[10px] tracking-[0.18em] uppercase">
          <span className="bg-accent inline-block h-2.5 w-1" aria-hidden="true" />
          {title}
        </figcaption>
      ) : null}
      <CopyButton text={code} className="absolute top-2 right-2 z-10" />
      <div
        className="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed [&_pre]:min-w-max"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  )
}
