import type { Metadata, Viewport } from 'next'

import { JsonLd } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { repositoryUrl, site } from '@/lib/site'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author, url: repositoryUrl }],
  creator: site.author,
  keywords: [
    's3nd',
    'local-first',
    'IndexedDB sync',
    'sync code',
    'file transfer cli',
    'S3',
    'Cloudflare R2',
    'MinIO',
    'TypeScript',
    'React hooks',
  ],
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_US',
    url: site.url,
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0e0c' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a
          className="bg-accent text-accent-ink sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
          href="#main"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
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
                sameAs: [repositoryUrl, 'https://www.npmjs.com/package/s3nd'],
              },
              {
                '@type': 'WebSite',
                '@id': `${site.url}/#website`,
                url: site.url,
                name: site.name,
                description: site.description,
                publisher: { '@id': `${site.url}/#organization` },
                inLanguage: 'en',
              },
            ],
          }}
        />
      </body>
    </html>
  )
}
