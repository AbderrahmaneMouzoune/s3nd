import Link from 'next/link'

import { footerColumns, site } from '@/lib/site'

import { Logo } from './logo'
import { Container, ExternalMark } from './ui'

export function SiteFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Link className="flex items-center gap-2.5" href="/">
              <Logo className="size-6" />
              <span className="text-lg font-extrabold tracking-[-0.04em]">s3nd</span>
            </Link>
            <p className="text-ink-muted mt-4 max-w-xs text-sm leading-relaxed">{site.tagline}</p>
            <p className="text-ink-faint mt-5 font-mono text-[11px] leading-relaxed">
              MIT © {site.author}
              <br />
              No hosted service. No telemetry. No account.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-accent font-mono text-[10px] font-semibold tracking-[0.22em] uppercase">
                {column.title}
              </h2>
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

      <div className="border-line overflow-hidden border-t">
        <Container>
          <p
            aria-hidden="true"
            className="text-ink -mb-[0.2em] pt-4 leading-[0.8] font-extrabold tracking-[-0.06em] select-none"
            style={{ fontSize: 'min(40vw, 28rem)' }}
          >
            s3nd
          </p>
        </Container>
      </div>
    </footer>
  )
}
