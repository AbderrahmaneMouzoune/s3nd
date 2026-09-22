import Link from 'next/link'

import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import { site } from '@/lib/site'

import { JsonLd } from './json-ld'

export interface Crumb {
  label: string
  /** Without the locale: `/use-cases`. */
  href: string
}

/** The trail above a page title, and the matching BreadcrumbList for search engines. */
export function Breadcrumbs({ locale, trail }: { locale: Locale; trail: Crumb[] }) {
  const t = getDictionary(locale).ui
  const items = [{ label: t.home, href: '/' }, ...trail]

  return (
    <>
      <nav aria-label={t.breadcrumb} className="text-ink-faint flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {items.map((item, index) => {
          const last = index === items.length - 1

          return (
            <span key={item.href} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {last ? (
                <span aria-current="page" className="text-ink-muted">
                  {item.label}
                </span>
              ) : (
                <Link className="text-link hover:text-ink transition-colors" href={localePath(locale, item.href)}>
                  {item.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: `${site.url}${localePath(locale, item.href)}`,
          })),
        }}
      />
    </>
  )
}
