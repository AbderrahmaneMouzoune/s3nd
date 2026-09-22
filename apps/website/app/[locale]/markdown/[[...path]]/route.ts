import { locales } from '@/lib/i18n/config'
import { localeFrom } from '@/lib/i18n'
import { markdownFor, markdownPaths } from '@/lib/markdown'

export const dynamic = 'force-static'
export const dynamicParams = false

/**
 * The Markdown twin of every page, for agents. Reached through the rewrites
 * in `next.config.mjs`: `/cli.md`, `/fr/cli.md`, `/index.md`, or any page
 * URL asked for with `Accept: text/markdown`.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    markdownPaths(locale).map((path) => ({ locale, path: path === '/' ? [] : path.slice(1).split('/') })),
  )
}

export async function GET(_request: Request, context: RouteContext<'/[locale]/markdown/[[...path]]'>) {
  const locale = await localeFrom(context.params)
  const { path = [] } = await context.params
  const markdown = markdownFor(locale, path.length === 0 ? '/' : `/${path.join('/')}`)

  if (!markdown) return new Response('Not found', { status: 404 })

  return new Response(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-language': locale,
      'x-robots-tag': 'noindex',
    },
  })
}
