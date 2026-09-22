'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { localePath } from '@/lib/i18n/config'

import { useLocale } from './locale-provider'
import { ExternalMark } from './ui'

/** `` `code` `` and `[label](href)` in a plain string, as the two markup forms the dictionaries allow. */
const TOKEN = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g

/**
 * Renders a dictionary string: backticks become an inline code span, a
 * Markdown-style link becomes a link (prefixed with the current locale when it
 * is internal), everything else is text. No other markup, on purpose:
 * translations stay plain strings.
 */
export function Rich({ text, codeClassName }: { text: string; codeClassName?: string }) {
  const { locale } = useLocale()
  const parts = text.split(TOKEN).filter((part) => part.length > 0)

  const nodes: ReactNode[] = parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className={codeClassName ?? 'font-mono'}>
          {part.slice(1, -1)}
        </code>
      )
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link) {
      const [, label, href] = link
      const classes = 'text-link text-accent font-medium'

      return href.startsWith('http') ? (
        <a key={index} className={classes} href={href} rel="noopener">
          {label} <ExternalMark />
        </a>
      ) : (
        <Link key={index} className={classes} href={localePath(locale, href)}>
          {label}
        </Link>
      )
    }

    return part
  })

  return <>{nodes}</>
}
