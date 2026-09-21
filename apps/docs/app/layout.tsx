import type { Metadata, Viewport } from 'next'
import { RootProvider } from 'fumadocs-ui/provider/next'

import { display, mono } from '@/lib/fonts'
import { appName, docsUrl } from '@/lib/shared'

import './global.css'

export const metadata: Metadata = {
  metadataBase: new URL(docsUrl),
  title: {
    default: `${appName} · Documentation`,
    template: '%s · doc.s3nd.sh',
  },
  description:
    'The s3nd documentation: send anything with a code through your own bucket. Snapshots, sync codes, the transfer protocol, the CLI, the React hooks and the API reference.',
  openGraph: {
    type: 'website',
    siteName: `${appName} docs`,
    locale: 'en_US',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

/** The identity is the dark board, so the theme is forced: no switch, no system preference. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
