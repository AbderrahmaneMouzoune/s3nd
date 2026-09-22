import { alternatives, categories } from './alternatives'
import { getDictionary } from './i18n'
import { localePath, type Locale } from './i18n/config'
import { providers } from './providers'
import { useCases } from './use-cases'

/**
 * Every page gets its own Open Graph image, drawn at build time from the same
 * words as the page. This is the catalogue: what each image says, and the URL
 * it lives at. `app/[locale]/og/[...path]/route.tsx` renders them,
 * `pageMetadata()` points every page at its own.
 */

export type OgKind =
  | 'home'
  | 'how-it-works'
  | 'cli'
  | 'library'
  | 'react'
  | 'drop'
  | 'examples'
  | 'use-cases'
  | 'use-case'
  | 'providers'
  | 'provider'
  | 'alternatives'
  | 'alternative'

export interface OgPage {
  /** The page, without the locale: `/`, `/use-cases/new-device`. */
  path: string
  /** Picks the figure drawn beside the words. */
  kind: OgKind
  /** The small amber label: the section the page belongs to. */
  eyebrow: string
  title: string
  description: string
  /** A second, quieter label: a use case's side, a comparison's category. */
  tag?: string
}

/** Every page that carries an image, in one language. The sitemap and the route both read this. */
export function ogPages(locale: Locale): OgPage[] {
  const t = getDictionary(locale)

  const fixed: OgPage[] = [
    { path: '/', kind: 'home', eyebrow: t.home.eyebrow, title: t.home.title, description: t.site.tagline },
    {
      path: '/how-it-works',
      kind: 'how-it-works',
      eyebrow: t.howItWorks.eyebrow,
      title: t.howItWorks.title,
      description: t.howItWorks.metaDescription,
    },
    { path: '/cli', kind: 'cli', eyebrow: t.cli.crumb, title: t.cli.title, description: t.cli.metaDescription },
    {
      path: '/library',
      kind: 'library',
      eyebrow: t.library.crumb,
      title: t.library.title,
      description: t.library.metaDescription,
    },
    {
      path: '/react',
      kind: 'react',
      eyebrow: t.react.crumb,
      title: t.react.title,
      description: t.react.metaDescription,
    },
    { path: '/drop', kind: 'drop', eyebrow: t.drop.eyebrow, title: t.drop.title, description: t.drop.metaDescription },
    {
      path: '/examples',
      kind: 'examples',
      eyebrow: t.examples.eyebrow,
      title: t.examples.title,
      description: t.examples.metaDescription,
    },
    {
      path: '/use-cases',
      kind: 'use-cases',
      eyebrow: t.useCases.eyebrow,
      title: t.useCases.title,
      description: t.useCases.metaDescription,
    },
    {
      path: '/providers',
      kind: 'providers',
      eyebrow: t.providers.metaTitle,
      title: t.providers.title,
      description: t.providers.metaDescription,
    },
    {
      path: '/alternatives',
      kind: 'alternatives',
      eyebrow: t.alternatives.eyebrow,
      title: t.alternatives.title,
      description: t.alternatives.metaDescription,
    },
  ]

  const useCasePages: OgPage[] = useCases(locale).map((useCase) => ({
    path: `/use-cases/${useCase.slug}`,
    kind: 'use-case',
    eyebrow: t.useCases.detail.eyebrow,
    tag: useCase.kind === 'files' ? t.useCases.files.eyebrow : t.useCases.appState.eyebrow,
    title: useCase.title,
    description: useCase.summary,
  }))

  const providerPages: OgPage[] = providers(locale).map((provider) => ({
    path: `/providers/${provider.slug}`,
    kind: 'provider',
    eyebrow: t.providers.detail.eyebrow,
    tag: provider.short,
    title: `${t.providers.detail.titlePrefix} ${provider.name}`,
    description: provider.tagline,
  }))

  const categoryCopy = categories(locale)
  const alternativePages: OgPage[] = alternatives(locale).map((alternative) => ({
    path: `/alternatives/${alternative.slug}`,
    kind: 'alternative',
    eyebrow: t.alternatives.eyebrow,
    tag: categoryCopy[alternative.category].title,
    title: `${t.alternatives.vs} ${alternative.name}`,
    description: alternative.headline,
  }))

  return [...fixed, ...useCasePages, ...providerPages, ...alternativePages]
}

export function findOgPage(locale: Locale, path: string): OgPage | undefined {
  return ogPages(locale).find((page) => page.path === path)
}

/**
 * Where a page's image lives: `/og/how-it-works.png`, `/fr/og/use-cases/new-device.png`,
 * `/og/index.png` for a home. The same locale rule as the pages, so the
 * rewrites in `next.config.mjs` route it without knowing it exists.
 */
export function ogImagePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '/index' : path.replace(/\/+$/, '')

  return localePath(locale, `/og${clean}.png`)
}

/** The route segments of an image: `/use-cases/new-device` → `['use-cases', 'new-device.png']`. */
export function ogSegments(path: string): string[] {
  const clean = path === '/' ? 'index' : path.replace(/^\/+|\/+$/g, '')

  return clean.split('/').map((segment, index, all) => (index === all.length - 1 ? `${segment}.png` : segment))
}

/** The page behind a set of route segments, or `null` when they do not name an image. */
export function ogPathFromSegments(segments: string[]): string | null {
  if (segments.length === 0) return null
  const last = segments[segments.length - 1]
  if (!last.endsWith('.png')) return null

  const parts = [...segments.slice(0, -1), last.slice(0, -'.png'.length)]
  if (parts.length === 1 && parts[0] === 'index') return '/'

  return `/${parts.join('/')}`
}
