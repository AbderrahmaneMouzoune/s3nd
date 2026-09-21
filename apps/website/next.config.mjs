/**
 * The locales, as `lib/i18n/config.ts` declares them. This file cannot import
 * TypeScript, so the two lists are written twice; keep them in step.
 */
const locales = ['en', 'fr']
const defaultLocale = 'en'

/** Every locale but the default one, as an alternation for the rewrite below: `fr`. */
const prefixed = locales.filter((locale) => locale !== defaultLocale).join('|')

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  trailingSlash: false,
  poweredByHeader: false,

  /**
   * Locale routing, without a proxy. Every page lives under `app/[locale]`;
   * this is what keeps the default language at the root of the domain:
   *
   * - `/cli`     → served as `/en/cli`, the URL stays `/cli`
   * - `/fr/cli`  → served as is
   * - `/en/cli`  → 308 to `/cli`, so the default locale has one URL, not two
   *
   * The rewrites run after the filesystem is checked, so the metadata routes
   * (icons, sitemap, robots, the Open Graph image, llms.txt) and static assets
   * are never touched; only a path that no file claims and no locale prefixes
   * is mapped.
   *
   * Before that, the Markdown twins for agents: `/cli.md` and `/fr/cli.md`,
   * or any page URL asked for with `Accept: text/markdown`, are served by
   * `app/[locale]/markdown`.
   */
  async redirects() {
    return [
      { source: `/${defaultLocale}`, destination: '/', permanent: true },
      { source: `/${defaultLocale}/:path*`, destination: '/:path*', permanent: true },
    ]
  },
  async rewrites() {
    /** A client that asks for Markdown gets the page as Markdown, from the same URL. */
    const wantsMarkdown = [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }]
    const markdown = []

    for (const locale of locales) {
      // English has no prefix, so its rules come last and exclude the prefixed ones.
      const root = locale === defaultLocale ? '' : `/${locale}`
      // One parameter that swallows the whole rest of the path, so `:path` in
      // the destination carries nested pages (`use-cases/new-device`) too.
      const guard = locale === defaultLocale ? `((?!(?:${prefixed})(?:/|$)|llms).*)` : '(.*)'

      markdown.push(
        { source: `${root}/index.md`, destination: `/${locale}/markdown` },
        { source: `${root}/:path${guard}.md`, destination: `/${locale}/markdown/:path` },
        { source: `${root || '/'}`, has: wantsMarkdown, destination: `/${locale}/markdown` },
        { source: `${root}/:path${guard}`, has: wantsMarkdown, destination: `/${locale}/markdown/:path` },
      )
    }

    return {
      afterFiles: [
        ...markdown,
        { source: '/', destination: `/${defaultLocale}` },
        { source: `/:path((?!(?:${prefixed})(?:/|$)|llms).*)`, destination: `/${defaultLocale}/:path` },
      ],
    }
  },
}

export default config
