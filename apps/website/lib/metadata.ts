import type { Metadata } from 'next'

import { localePath, localeTags, locales, type Locale } from './i18n/config'
import { ogImagePath } from './og'
import { site } from './site'

interface PageMetadata {
  locale: Locale
  title: string
  description: string
  /** Absolute path without the locale, `/library`. Becomes the canonical URL. */
  path: string
  keywords?: string[]
  /**
   * The home: the title is used as is rather than through the layout's
   * `%s · s3nd.sh` template, on the page and on the cards alike.
   */
  home?: boolean
}

/** `hreflang` alternates for a path: every locale, plus `x-default` on the English one. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of locales) languages[locale] = localePath(locale, path)
  languages['x-default'] = localePath('en', path)

  return languages
}

/** The Markdown twin of a page, for agents: `/cli.md`, `/fr/cli.md`, `/index.md` for a home. */
export function markdownPath(locale: Locale, path: string): string {
  const localized = localePath(locale, path)

  return localized === '/' ? '/index.md' : localized === `/${locale}` ? `/${locale}/index.md` : `${localized}.md`
}

/**
 * Every page declares its title, description and path once; this turns that into
 * the full set of tags — canonical, hreflang, the Markdown alternate, Open Graph
 * and Twitter — against the site's `metadataBase`. The Open Graph image is the
 * page's own, drawn at build time by `app/[locale]/og` from the same words.
 */
export function pageMetadata({ locale, title, description, path, keywords, home }: PageMetadata): Metadata {
  const canonical = localePath(locale, path)
  const cardTitle = home ? title : `${title} · ${site.domain}`
  const image = { url: ogImagePath(locale, path), width: 1200, height: 630, alt: cardTitle }

  return {
    title: home ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: languageAlternates(path),
      types: { 'text/markdown': markdownPath(locale, path) },
    },
    openGraph: {
      title: cardTitle,
      description,
      url: canonical,
      siteName: site.name,
      type: 'website',
      locale: localeTags[locale].og,
      alternateLocale: locales.filter((other) => other !== locale).map((other) => localeTags[other].og),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: cardTitle,
      description,
      images: [image],
    },
  }
}
