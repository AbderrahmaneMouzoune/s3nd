import type { Metadata, Viewport } from 'next'
import Link from 'next/link'

import { dropConfig } from '@/lib/config'
import { display, mono } from '@/lib/fonts'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${dropConfig.name} · a file, a code, your bucket`,
    template: `%s · ${dropConfig.name}`,
  },
  description: 'Drop a file, get an eight-character code and a link, pick it up on any device until it expires.',
  applicationName: dropConfig.name,
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="border-line sticky top-0 z-20 border-b bg-[#0a0a0a]/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5">
            <Link className="group flex items-center gap-2.5" href="/">
              <svg
                className="size-6 transition-transform duration-300 group-hover:-rotate-6"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="5" fill="#ffb000" />
                <path
                  d="M10 16h12M16.5 10.5 22 16l-5.5 5.5"
                  stroke="#0a0a0a"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M7.5 6.5v19" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 3" />
              </svg>
              <span className="text-lg font-extrabold tracking-[-0.04em]">{dropConfig.name}</span>
            </Link>
            <a
              className="text-ink-faint hover:text-accent font-mono text-[10px] font-semibold tracking-[0.22em] uppercase transition-colors"
              href="https://s3nd.sh"
              rel="noopener"
            >
              on s3nd.sh ↗
            </a>
          </div>
        </header>
        <main className="relative flex flex-1 flex-col">
          <div className="grid-paper absolute inset-x-0 top-0 -z-10 h-[28rem]" aria-hidden="true" />
          {children}
        </main>
        <footer className="border-line border-t">
          <div className="text-ink-faint mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-5 font-mono text-[10px] tracking-[0.22em] uppercase">
            <span>your bucket · a code · no account</span>
            <span>
              built on{' '}
              <a className="hover:text-accent transition-colors" href="https://s3nd.sh" rel="noopener">
                s3nd
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
