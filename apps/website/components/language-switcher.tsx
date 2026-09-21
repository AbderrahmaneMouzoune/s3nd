'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { localeNames, localePath, locales, splitLocale } from '@/lib/i18n/config'

import { useLocale } from './locale-provider'
import { cx } from './ui'

/** EN | FR. Each link is the same page in the other language. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, ui } = useLocale()
  const pathname = usePathname()
  const { path } = splitLocale(pathname)

  return (
    <nav aria-label={ui.language} className={cx('border-line-strong inline-flex rounded-md border p-0.5', className)}>
      {locales.map((candidate) => {
        const active = candidate === locale

        return (
          <Link
            key={candidate}
            href={localePath(candidate, path)}
            hrefLang={candidate}
            lang={candidate}
            aria-current={active ? 'true' : undefined}
            aria-label={localeNames[candidate]}
            className={cx(
              'rounded-[3px] px-2 py-1 font-mono text-[10px] font-bold tracking-[0.18em] uppercase transition-colors duration-200',
              active ? 'bg-accent text-accent-ink' : 'text-ink-faint hover:text-ink',
            )}
          >
            {candidate}
          </Link>
        )
      })}
    </nav>
  )
}
