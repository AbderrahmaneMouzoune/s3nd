import Link from 'next/link'

import { navigation, repositoryUrl } from '@/lib/site'

import { Logo } from './logo'
import { Container, ExternalMark } from './ui'

/**
 * Sticky header. The mobile menu is a `<details>` element, so navigation works
 * before, and without, any JavaScript.
 */
export function SiteHeader() {
  return (
    <div className="border-line bg-canvas/90 sticky top-0 z-40 border-b backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-6">
        <Link className="flex items-center gap-2.5" href="/" aria-label="s3nd home">
          <Logo className="size-6" />
          <span className="text-lg font-extrabold tracking-[-0.04em]">s3nd</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
          {navigation.map((link) =>
            link.external ? (
              <a
                key={link.href}
                className="text-ink-muted hover:text-accent rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors"
                href={link.href}
                rel="noopener"
              >
                {link.label} <ExternalMark />
              </a>
            ) : (
              <Link
                key={link.href}
                className="text-ink-muted hover:text-accent rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors"
                href={link.href}
              >
                {link.label}
              </Link>
            ),
          )}
          <a
            className="border-line-strong hover:border-accent hover:text-accent ml-3 rounded-md border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors"
            href={repositoryUrl}
            rel="noopener"
          >
            GitHub
          </a>
        </nav>

        <details className="group relative md:hidden">
          <summary className="border-line-strong flex cursor-pointer list-none items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase select-none [&::-webkit-details-marker]:hidden">
            Menu
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <nav
            aria-label="Primary"
            className="border-line-strong bg-surface shadow-card absolute right-0 mt-2 flex w-60 flex-col rounded-lg border p-2"
          >
            {navigation.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  className="hover:bg-surface-muted hover:text-accent rounded-md px-3 py-2.5 font-mono text-xs font-semibold tracking-[0.16em] uppercase"
                  href={link.href}
                  rel="noopener"
                >
                  {link.label} <ExternalMark />
                </a>
              ) : (
                <Link
                  key={link.href}
                  className="hover:bg-surface-muted hover:text-accent rounded-md px-3 py-2.5 font-mono text-xs font-semibold tracking-[0.16em] uppercase"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ),
            )}
            <a
              className="hover:bg-surface-muted hover:text-accent rounded-md px-3 py-2.5 font-mono text-xs font-semibold tracking-[0.16em] uppercase"
              href={repositoryUrl}
              rel="noopener"
            >
              GitHub <ExternalMark />
            </a>
          </nav>
        </details>
      </Container>
    </div>
  )
}
