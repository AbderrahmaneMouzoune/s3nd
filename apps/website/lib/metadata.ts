import type { Metadata } from 'next'

import { site } from './site'

interface PageMetadata {
  title: string
  description: string
  /** Absolute path, `/library`. Becomes the canonical URL. */
  path: string
  keywords?: string[]
}

/**
 * Every page declares its title, description and path once; this turns that into
 * the full set of tags — canonical, Open Graph and Twitter — against the site's
 * `metadataBase`. The Open Graph image is the generated one at the root.
 */
export function pageMetadata({ title, description, path, keywords }: PageMetadata): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} · ${site.name}`,
      description,
      url: path,
      siteName: site.name,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${site.name}`,
      description,
    },
  }
}
