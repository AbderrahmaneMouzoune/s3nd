import Link from 'next/link'

import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import { site } from '@/lib/site'

import { LanguageSwitcher } from './language-switcher'
import { Logo } from './logo'
import { Container, ExternalMark } from './ui'
import { Wordmark } from './wordmark'

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const p = (path: string) => localePath(locale, path)

  return (
    <footer className="border-line mt-16 border-t">
      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Link className="group flex items-center gap-2.5" href={p('/')}>
              <Logo className="size-6 transition-transform duration-300 group-hover:-rotate-6" />
              <Wordmark className="text-lg" />
            </Link>
            <p className="text-ink-muted mt-4 max-w-xs text-sm leading-relaxed">{t.site.tagline}</p>
            <p className="text-ink-faint mt-5 font-mono text-[11px] leading-relaxed">
              {t.footer.madeBy} {site.author}
              <br />
              {t.footer.legal}
            </p>
            <LanguageSwitcher className="mt-5" />
          </div>

          {t.footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-accent font-mono text-[10px] font-semibold tracking-[0.22em] uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        className="text-link text-ink-muted hover:text-ink text-sm transition-colors"
                        href={link.href}
                        rel="noopener"
                      >
                        {link.label} <ExternalMark />
                      </a>
                    ) : (
                      <Link
                        className="text-link text-ink-muted hover:text-ink text-sm transition-colors"
                        href={p(link.href)}
                      >
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

      <div className="border-line group overflow-hidden border-t">
        <Container>
          <p
            aria-hidden="true"
            className="text-ink -mb-[0.2em] pt-4 leading-[0.8] font-extrabold tracking-[-0.06em] select-none"
            style={{ fontSize: 'min(32vw, 24rem)' }}
          >
            s3nd
            <span className="text-ink-faint/40 group-hover:text-accent font-semibold transition-colors duration-700">
              .sh
            </span>
          </p>
        </Container>
      </div>
    </footer>
  )
}
