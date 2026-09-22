import type { Metadata, Viewport } from 'next'

import { JsonLd } from '@/components/json-ld'
import { LocaleProvider } from '@/components/locale-provider'
import { RevealObserver } from '@/components/reveal'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { display, mono } from '@/lib/fonts'
import { getDictionary, localeFrom, localePath, localeTags, locales } from '@/lib/i18n'
import { languageAlternates } from '@/lib/metadata'
import { ogImagePath } from '@/lib/og'
import { repositoryUrl, site } from '@/lib/site'

import '../globals.css'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const title = `${site.name} · ${t.site.tagline}`
  const image = { url: ogImagePath(locale, '/'), width: 1200, height: 630, alt: title }

  return {
    metadataBase: new URL(site.url),
    title: {
      default: title,
      template: `%s · ${site.domain}`,
    },
    description: t.site.description,
    applicationName: site.name,
    authors: [{ name: site.author, url: repositoryUrl }],
    creator: site.author,
    keywords: [
      's3nd',
      'send file with code',
      'file transfer cli',
      'self-hosted file transfer',
      'S3',
      'Cloudflare R2',
      'MinIO',
      'sync code',
      'local-first',
      'TypeScript',
    ],
    alternates: { canonical: localePath(locale, '/'), languages: languageAlternates('/') },
    openGraph: {
      type: 'website',
      siteName: site.name,
      locale: localeTags[locale].og,
      url: localePath(locale, '/'),
      title,
      description: t.site.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: t.site.description,
      images: [image],
    },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)

  return (
    <html lang={localeTags[locale].lang} className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <LocaleProvider
          value={{
            locale,
            ui: {
              copy: t.ui.copy,
              copied: t.ui.copied,
              copyCommand: t.ui.copyCommand,
              copyCode: t.ui.copyCode,
              menu: t.ui.menu,
              closeMenu: t.ui.closeMenu,
              language: t.ui.language,
              primaryNavigation: t.ui.primaryNavigation,
            },
          }}
        >
          <a
            className="bg-accent text-accent-ink sr-only rounded-md px-3 py-2 font-mono text-xs uppercase focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
            href="#main"
          >
            {t.ui.skipToContent}
          </a>
          <SiteHeader locale={locale} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter locale={locale} />
          <RevealObserver />
        </LocaleProvider>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${site.url}/#organization`,
                name: site.name,
                url: site.url,
                logo: `${site.url}/icon.svg`,
                sameAs: [repositoryUrl, 'https://www.npmjs.com/package/@s3nd/core'],
              },
              {
                '@type': 'WebSite',
                '@id': `${site.url}/#website`,
                url: site.url,
                name: site.name,
                description: t.site.description,
                publisher: { '@id': `${site.url}/#organization` },
                inLanguage: locale,
              },
            ],
          }}
        />
      </body>
    </html>
  )
}
