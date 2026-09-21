import { notFound } from 'next/navigation'

import { en, type Dictionary } from './en'
import { fr } from './fr'
import { isLocale, type Locale } from './config'

const dictionaries: Record<Locale, Dictionary> = { en, fr }

/** The copy for one locale. Server-side only: the object carries a few functions. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export type { Dictionary }
export * from './config'

/** The locale a route was rendered for, or a 404 when the segment is not one. */
export async function localeFrom(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return locale
}
