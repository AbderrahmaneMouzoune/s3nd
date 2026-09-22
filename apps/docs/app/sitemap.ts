import type { MetadataRoute } from 'next'

import { docsUrl } from '@/lib/shared'
import { source } from '@/lib/source'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: `${docsUrl}/`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    ...source.getPages().map((page) => ({
      url: `${docsUrl}${page.url}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: page.url === '/docs' ? 1 : 0.7,
    })),
  ]
}
