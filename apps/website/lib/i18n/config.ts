/**
 * The two languages the site speaks, and the one rule about URLs: English is
 * the default and lives at the root (`/cli`), every other language carries its
 * prefix (`/fr/cli`). `proxy.ts` rewrites the unprefixed URL to `/en/…`
 * internally, so the app only ever renders `app/[locale]/…`.
 */
export const locales = ['en', 'fr'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
}

/** What `<html lang>` and Open Graph want for each locale. */
export const localeTags: Record<Locale, { lang: string; og: string }> = {
  en: { lang: 'en', og: 'en_US' },
  fr: { lang: 'fr', og: 'fr_FR' },
}

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? '')
}

/** `localePath('fr', '/cli')` → `/fr/cli`; the default locale gets no prefix. */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === defaultLocale) return clean

  return clean === '/' ? `/${locale}` : `/${locale}${clean}`
}

/** Strips a leading locale segment: `/fr/cli` → `{ locale: 'fr', path: '/cli' }`. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = '', ...rest] = pathname.split('/')

  if (isLocale(first)) {
    const path = `/${rest.join('/')}`
    return { locale: first, path: path === '/' ? '/' : path.replace(/\/+$/, '') }
  }

  return { locale: defaultLocale, path: pathname || '/' }
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'fr' : 'en'
}
