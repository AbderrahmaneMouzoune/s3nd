import type { Metadata } from 'next'

import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { useCases } from '@/lib/use-cases'

export async function generateMetadata({ params }: PageProps<'/[locale]/use-cases'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).useCases

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/use-cases',
    keywords: t.keywords,
  })
}

export default async function UseCasesPage({ params }: PageProps<'/[locale]/use-cases'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).useCases
  const p = (path: string) => localePath(locale, path)
  const cases = useCases(locale)
  const files = cases.filter((useCase) => useCase.kind === 'files')
  const appState = cases.filter((useCase) => useCase.kind === 'app-state')

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/use-cases' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <ButtonLink href={p('/cli')} size="lg">
            {t.primary}
          </ButtonLink>
        }
      />

      <Section index="01" eyebrow={t.files.eyebrow} title={t.files.title} lead={t.files.lead}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((useCase, index) => (
            <CardLink
              key={useCase.slug}
              href={p(`/use-cases/${useCase.slug}`)}
              title={useCase.title}
              meta={useCase.packages.join(' · ')}
              index={index}
            >
              {useCase.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section index="02" eyebrow={t.appState.eyebrow} title={t.appState.title} lead={t.appState.lead}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {appState.map((useCase, index) => (
            <CardLink
              key={useCase.slug}
              href={p(`/use-cases/${useCase.slug}`)}
              title={useCase.title}
              meta={useCase.packages.join(' · ')}
              index={index}
            >
              {useCase.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
