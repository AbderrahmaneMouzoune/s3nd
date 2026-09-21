import Link from 'next/link'

import { footerColumns, site } from '@/lib/site'

import { Logo } from './logo'
import { Container, ExternalMark } from './ui'

export function SiteFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link className="flex items-center gap-2.5 font-semibold tracking-tight" href="/">
              <Logo className="size-6" />
              <span>s3nd</span>
            </Link>
            <p className="text-ink-muted mt-4 max-w-xs text-sm leading-relaxed">{site.tagline}</p>
            <p className="text-ink-faint mt-4 font-mono text-xs">
              MIT © {site.author}. No hosted service, no telemetry.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        className="text-ink-muted hover:text-ink text-sm transition-colors"
                        href={link.href}
                        rel="noopener"
                      >
                        {link.label} <ExternalMark />
                      </a>
                    ) : (
                      <Link className="text-ink-muted hover:text-ink text-sm transition-colors" href={link.href}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </footer>
  )
}
