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
   * (icons, sitemap, robots, the Open Graph image) and static assets are never
   * touched; only a path that no file claims and no locale prefixes is mapped.
   */
  async redirects() {
    return [
      { source: `/${defaultLocale}`, destination: '/', permanent: true },
      { source: `/${defaultLocale}/:path*`, destination: '/:path*', permanent: true },
    ]
  },
  async rewrites() {
    return {
      afterFiles: [
        { source: '/', destination: `/${defaultLocale}` },
        { source: `/:path((?!(?:${prefixed})(?:/|$)).*)`, destination: `/${defaultLocale}/:path` },
      ],
    }
  },
}

export default config
