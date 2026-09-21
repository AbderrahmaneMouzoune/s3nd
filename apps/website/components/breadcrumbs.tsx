import Link from 'next/link'

import { site } from '@/lib/site'

import { JsonLd } from './json-ld'

export interface Crumb {
  label: string
  href: string
}

/** The trail above a page title, and the matching BreadcrumbList for search engines. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const items = [{ label: 'Home', href: '/' }, ...trail]

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-ink-faint flex flex-wrap items-center gap-1.5 font-mono text-xs">
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
                <Link className="hover:text-ink transition-colors" href={item.href}>
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
            item: `${site.url}${item.href}`,
          })),
        }}
      />
    </>
  )
}
