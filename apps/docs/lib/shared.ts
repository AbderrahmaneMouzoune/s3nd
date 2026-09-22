export const appName = 's3nd'
export const docsRoute = '/docs'

export const gitConfig = {
  user: 'AbderrahmaneMouzoune',
  repo: 's3nd',
  branch: 'main',
}

export const repositoryUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`

/** The marketing site. This app is the documentation, served from doc.s3nd.sh. */
export const websiteUrl = 'https://s3nd.sh'

/** Where this app is served from. */
export const docsUrl = 'https://doc.s3nd.sh'

/**
 * Where a page's Open Graph image lives, drawn at build time by `app/og`:
 * `/og/index.png` for the front page (`null`), `/og/docs.png` for the
 * documentation's index (`[]`), `/og/docs/quick-start.png` for a page.
 */
export function ogImagePath(slugs: string[] | null): string {
  return `/og/${ogSegments(slugs).join('/')}`
}

/** The same, as the segments under `/og`: `['docs', 'quick-start.png']`. */
export function ogSegments(slugs: string[] | null): string[] {
  if (slugs === null) return ['index.png']
  if (slugs.length === 0) return ['docs.png']

  return ['docs', ...slugs.slice(0, -1), `${slugs[slugs.length - 1]}.png`]
}

/**
 * Back from the segments under `/og`: `null` for the front page, `[]` for the
 * documentation's index, the page's slugs otherwise, and `undefined` when the
 * segments name nothing.
 */
export function ogSlugsFromSegments(segments: string[]): string[] | null | undefined {
  const last = segments[segments.length - 1]
  if (!last?.endsWith('.png')) return undefined

  const parts = [...segments.slice(0, -1), last.slice(0, -'.png'.length)]
  if (parts.length === 1 && parts[0] === 'index') return null
  if (parts.length === 1 && parts[0] === 'docs') return []
  if (parts[0] !== 'docs') return undefined

  return parts.slice(1)
}

/** The full set of card tags for a page, Open Graph and Twitter alike. */
export function cardMetadata(input: { title: string; description?: string; url: string; slugs: string[] | null }) {
  const image = { url: ogImagePath(input.slugs), width: 1200, height: 630, alt: input.title }

  return {
    openGraph: {
      type: 'website' as const,
      siteName: `${appName} docs`,
      locale: 'en_US',
      title: input.title,
      description: input.description,
      url: input.url,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: input.title,
      description: input.description,
      images: [image],
    },
  }
}
