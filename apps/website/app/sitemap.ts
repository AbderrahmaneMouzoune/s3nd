import type { MetadataRoute } from 'next'

import { alternatives } from '@/lib/alternatives'
import { providers } from '@/lib/providers'
import { site } from '@/lib/site'
import { useCases } from '@/lib/use-cases'

const staticRoutes: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/how-it-works', priority: 0.9 },
  { path: '/library', priority: 0.9 },
  { path: '/react', priority: 0.9 },
  { path: '/cli', priority: 0.9 },
  { path: '/use-cases', priority: 0.8 },
  { path: '/providers', priority: 0.8 },
  { path: '/examples', priority: 0.7 },
  { path: '/alternatives', priority: 0.8 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const entries = [
    ...staticRoutes,
    ...useCases.map((useCase) => ({ path: `/use-cases/${useCase.slug}`, priority: 0.8 })),
    ...providers.map((provider) => ({ path: `/providers/${provider.slug}`, priority: 0.7 })),
    ...alternatives.map((alternative) => ({ path: `/alternatives/${alternative.slug}`, priority: 0.7 })),
  ]

  return entries.map((entry) => ({
    url: `${site.url}${entry.path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: entry.priority,
  }))
}
