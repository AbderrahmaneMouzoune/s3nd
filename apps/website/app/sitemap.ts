import type { MetadataRoute } from 'next'

import { alternativeSlugs } from '@/lib/alternatives'
import { localePath, locales } from '@/lib/i18n/config'
import { languageAlternates } from '@/lib/metadata'
import { providerSlugs } from '@/lib/providers'
import { site } from '@/lib/site'
import { useCaseSlugs } from '@/lib/use-cases'

const staticRoutes: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/how-it-works', priority: 0.9 },
  { path: '/library', priority: 0.9 },
  { path: '/react', priority: 0.9 },
  { path: '/cli', priority: 0.9 },
  { path: '/drop', priority: 0.8 },
  { path: '/use-cases', priority: 0.8 },
  { path: '/providers', priority: 0.8 },
  { path: '/examples', priority: 0.7 },
  { path: '/alternatives', priority: 0.8 },
]

/** Every page in every language, each carrying its `hreflang` alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const paths = [
    ...staticRoutes,
    ...useCaseSlugs.map((slug) => ({ path: `/use-cases/${slug}`, priority: 0.8 })),
    ...providerSlugs.map((slug) => ({ path: `/providers/${slug}`, priority: 0.7 })),
    ...alternativeSlugs.map((slug) => ({ path: `/alternatives/${slug}`, priority: 0.7 })),
  ]

  return paths.flatMap((entry) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(entry.path)).map(([lang, path]) => [lang, `${site.url}${path}`]),
    )

    return locales.map((locale) => ({
      url: `${site.url}${localePath(locale, entry.path)}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: locale === 'en' ? entry.priority : Math.max(0.1, entry.priority - 0.1),
      alternates: { languages },
    }))
  })
}
