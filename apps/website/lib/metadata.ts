import type { Metadata } from 'next'

import { localePath, localeTags, locales, type Locale } from './i18n/config'
import { site } from './site'

interface PageMetadata {
  locale: Locale
  title: string
  description: string
  /** Absolute path without the locale, `/library`. Becomes the canonical URL. */
  path: string
  keywords?: string[]
}

/** `hreflang` alternates for a path: every locale, plus `x-default` on the English one. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of locales) languages[locale] = localePath(locale, path)
  languages['x-default'] = localePath('en', path)

  return languages
}

/**
 * Every page declares its title, description and path once; this turns that into
 * the full set of tags — canonical, hreflang, Open Graph and Twitter — against
 * the site's `metadataBase`. The Open Graph image is the generated one at the root.
 */
export function pageMetadata({ locale, title, description, path, keywords }: PageMetadata): Metadata {
  const canonical = localePath(locale, path)

  return {
    title,
    description,
    keywords,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      title: `${title} · ${site.domain}`,
      description,
      url: canonical,
      siteName: site.name,
      type: 'website',
      locale: localeTags[locale].og,
      alternateLocale: locales.filter((other) => other !== locale).map((other) => localeTags[other].og),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${site.domain}`,
      description,
    },
  }
}
