import { notFound } from 'next/navigation'

import { pageMarkdown } from '@/lib/markdown'
import { source } from '@/lib/source'

export const dynamic = 'force-static'
export const dynamicParams = false

/** `/docs/<slug>.md`, through the rewrite in `next.config.mjs`. */
export function generateStaticParams() {
  return source.generateParams()
}

export async function GET(_request: Request, context: RouteContext<'/llms.md/[[...slug]]'>) {
  const { slug } = await context.params
  const page = source.getPage(slug)
  if (!page) notFound()

  return new Response(await pageMarkdown(page), {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'x-robots-tag': 'noindex' },
  })
}
