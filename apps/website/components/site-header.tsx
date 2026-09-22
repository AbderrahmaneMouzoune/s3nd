import { alternativesIn, categoryOrder, categories } from '@/lib/alternatives'
import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import { docs, repositoryUrl } from '@/lib/site'
import { useCases } from '@/lib/use-cases'

import { MegaMenu, type MenuData } from './mega-menu'

/**
 * Builds the menu from the dictionary and the page data, so a use case or a
 * comparison added in `lib/` shows up under its section without touching this.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const p = (path: string) => localePath(locale, path)
  const cases = useCases(locale)
  const cats = categories(locale)

  const data: MenuData = {
    home: p('/'),
    homeLabel: `${t.site.tagline}`,
    sections: [
      {
        id: 'product',
        label: t.nav.product.label,
        columns: 2,
        groups: [
          { links: t.nav.product.items.slice(0, 4).map((item) => ({ ...item, href: p(item.href) })) },
          { links: t.nav.product.items.slice(4).map((item) => ({ ...item, href: p(item.href) })) },
        ],
        aside: {
          title: t.nav.product.aside.title,
          body: t.nav.product.aside.body,
          command: t.nav.product.aside.command,
          link: { label: t.nav.product.aside.link, href: p('/cli') },
        },
      },
      {
        id: 'use-cases',
        label: t.nav.useCases.label,
        columns: 2,
        groups: [
          {
            title: t.nav.useCases.files,
            links: cases
              .filter((useCase) => useCase.kind === 'files')
              .map((useCase) => ({
                label: useCase.title,
                description: useCase.summary,
                href: p(`/use-cases/${useCase.slug}`),
              })),
          },
          {
            title: t.nav.useCases.appState,
            links: cases
              .filter((useCase) => useCase.kind === 'app-state')
              .map((useCase) => ({
                label: useCase.title,
                description: useCase.summary,
                href: p(`/use-cases/${useCase.slug}`),
              })),
          },
        ],
        footer: { label: t.nav.useCases.all, href: p('/use-cases') },
      },
      {
        id: 'compare',
        label: t.nav.compare.label,
        lead: t.nav.compare.lead,
        columns: 4,
        groups: categoryOrder.map((category) => ({
          title: cats[category].title,
          links: alternativesIn(locale, category).map((alternative) => ({
            label: `${t.home.compare.vs} ${alternative.name}`,
            href: p(`/alternatives/${alternative.slug}`),
          })),
        })),
        footer: { label: t.nav.compare.all, href: p('/alternatives') },
      },
    ],
    links: [{ label: t.nav.docs, href: docs(), external: true }],
    github: { label: t.nav.github, href: repositoryUrl, external: true },
    cta: { label: t.nav.cta, href: p('/cli') },
  }

  return <MegaMenu data={data} />
}
