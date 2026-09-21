import type { Metadata } from 'next'

import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { alternativesIn, categories, categoryOrder } from '@/lib/alternatives'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'

export async function generateMetadata({ params }: PageProps<'/[locale]/alternatives'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).alternatives

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/alternatives',
    keywords: t.keywords,
  })
}

export default async function AlternativesPage({ params }: PageProps<'/[locale]/alternatives'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).alternatives
  const p = (path: string) => localePath(locale, path)
  const cats = categories(locale)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/alternatives' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <ButtonLink href={p('/how-it-works')} variant="secondary" size="lg">
            {t.secondary}
          </ButtonLink>
        }
      />

      {categoryOrder.map((category, index) => (
        <Section
          key={category}
          id={category}
          eyebrow={cats[category].title}
          index={String(index + 1).padStart(2, '0')}
          title={cats[category].blurb}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alternativesIn(locale, category).map((alternative, cardIndex) => (
              <CardLink
                key={alternative.slug}
                href={p(`/alternatives/${alternative.slug}`)}
                title={`${t.vs} ${alternative.name}`}
                meta={alternative.matrix.license}
                index={cardIndex}
              >
                {alternative.headline}
              </CardLink>
            ))}
          </div>
        </Section>
      ))}

      <Cta locale={locale} />
    </>
  )
}
