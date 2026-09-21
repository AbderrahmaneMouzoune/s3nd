import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'

import { DocsCard, OG_SIZE, ogFonts } from '@/lib/og'
import { docsRoute, ogSegments, ogSlugsFromSegments } from '@/lib/shared'
import { source } from '@/lib/source'

/**
 * One Open Graph image per page, drawn at build time: `/og/index.png` for the
 * front page, `/og/docs.png` for the documentation's index, and
 * `/og/docs/<slug>.png` for every page under it.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

/** Which section a page belongs to, from its first path segment. */
function sectionOf(slugs: string[]): string {
  if (slugs[0] === 'use-cases') return 'Use cases'
  if (slugs[0] === 'api') return 'API reference'

  return 'Documentation'
}

export function generateStaticParams() {
  return [{ slug: ogSegments(null) }, ...source.getPages().map((page) => ({ slug: ogSegments(page.slugs) }))]
}

export async function GET(_request: Request, { params }: RouteContext<'/og/[...slug]'>) {
  const { slug } = await params
  const slugs = ogSlugsFromSegments(slug)
  if (slugs === undefined) notFound()

  const fonts = await ogFonts()

  if (slugs === null) {
    return new ImageResponse(
      <DocsCard
        section="Documentation"
        title="Send anything with a code, through your own bucket."
        description="Snapshots, sync codes, the transfer protocol, the CLI, the React hooks and the API reference."
        path=""
      />,
      { ...OG_SIZE, fonts },
    )
  }

  const page = source.getPage(slugs)
  if (!page) notFound()

  return new ImageResponse(
    <DocsCard
      section={sectionOf(slugs)}
      title={page.data.title}
      description={page.data.description}
      path={page.url === docsRoute ? docsRoute : page.url}
    />,
    { ...OG_SIZE, fonts },
  )
}
