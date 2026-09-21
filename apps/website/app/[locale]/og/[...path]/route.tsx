import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'

import { OG_SIZE, OgImage, ogFonts } from '@/components/og-image'
import { isLocale, locales } from '@/lib/i18n/config'
import { findOgPage, ogPages, ogPathFromSegments, ogSegments } from '@/lib/og'

/**
 * One Open Graph image per page, per language, drawn at build time:
 * `/og/how-it-works.png`, `/fr/og/use-cases/new-device.png`, `/og/index.png`
 * for the home. The URL follows the same locale rule as the pages, so the
 * rewrites in `next.config.mjs` route the unprefixed English one here without
 * knowing it exists. `pageMetadata()` points every page at its own.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => ogPages(locale).map((page) => ({ locale, path: ogSegments(page.path) })))
}

export async function GET(_request: Request, { params }: RouteContext<'/[locale]/og/[...path]'>) {
  const { locale, path } = await params
  if (!isLocale(locale)) notFound()

  const pagePath = ogPathFromSegments(path)
  const page = pagePath ? findOgPage(locale, pagePath) : undefined
  if (!page) notFound()

  return new ImageResponse(<OgImage page={page} locale={locale} />, { ...OG_SIZE, fonts: await ogFonts() })
}
