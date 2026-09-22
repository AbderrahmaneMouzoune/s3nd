import { codeToHtml, type BundledLanguage } from 'shiki'

import { CopyButton } from './copy-button'
import { cx } from './ui'

export { Command } from './command'

interface CodeBlockProps {
  code: string
  lang?: BundledLanguage | 'text'
  /** A filename or a caption, shown above the code. */
  title?: string
  /** What the copy button copies. Defaults to the first prompted command of a transcript, or the whole block. */
  copy?: string
  className?: string
}

/**
 * What the copy button should put on the clipboard. A shell transcript with
 * `$` prompts and their output is read, not pasted: the first command, with
 * its continuation lines joined and a trailing comment dropped, is what
 * someone wants. Anything else is copied whole.
 */
export function copyTarget(code: string): { text: string; command: boolean } {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => /^\$\s+\S/.test(line))
  if (start === -1) return { text: code, command: false }

  const parts = [lines[start].replace(/^\$\s+/, '')]
  let index = start
  while (parts[parts.length - 1].endsWith('\\') && index + 1 < lines.length) {
    index += 1
    parts.push(lines[index].trim())
  }

  const text = parts
    .map((part) => part.replace(/\\$/, '').trim())
    .join(' ')
    .replace(/\s{2,}#.*$/, '')
    .trim()

  return { text, command: true }
}

/**
 * Server-rendered syntax highlighting. Shiki runs at build time with a single
 * dark theme whose accents sit close to the site's amber, so no JavaScript
 * reaches the browser for it. The copy button in the corner is the one client
 * component here.
 */
export async function CodeBlock({ code, lang = 'ts', title, copy, className }: CodeBlockProps) {
  const html = await codeToHtml(code, { lang, theme: 'vesper' })
  const target = copy != null ? { text: copy, command: true } : copyTarget(code)

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
      <CopyButton
        text={target.text}
        kind={target.command ? 'command' : 'code'}
        className="absolute top-2 right-2 z-10"
      />
      <div
        className="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed [&_pre]:min-w-max"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  )
}
