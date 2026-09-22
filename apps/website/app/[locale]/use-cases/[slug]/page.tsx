import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import type { BundledLanguage } from 'shiki'

import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Pill, Section } from '@/components/ui'
import { getDictionary, localeFrom, localePath, locales } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { findUseCase, useCaseSlugs, useCases } from '@/lib/use-cases'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => useCaseSlugs.map((slug) => ({ locale, slug })))
}

export async function generateMetadata(props: PageProps<'/[locale]/use-cases/[slug]'>): Promise<Metadata> {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const useCase = findUseCase(locale, slug)
  if (!useCase) notFound()
  const t = getDictionary(locale).useCases.detail

  return pageMetadata({
    locale,
    title: useCase.title,
    description: `${useCase.summary} ${t.metaSuffix}`,
    path: `/use-cases/${useCase.slug}`,
    keywords: useCase.keywords,
  })
}

const PACKAGE_PAGES: Record<string, string> = {
  s3nd: '/library',
  '@s3nd/react': '/react',
  '@s3nd/cli': '/cli',
  '@s3nd/protocol': '/how-it-works',
}

export default async function UseCasePage(props: PageProps<'/[locale]/use-cases/[slug]'>) {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const useCase = findUseCase(locale, slug)
  if (!useCase) notFound()

  const d = getDictionary(locale)
  const t = d.useCases
  const p = (path: string) => localePath(locale, path)
  const related = useCases(locale)
    .filter((other) => other.slug !== useCase.slug)
    .slice(0, 3)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[
          { label: t.crumb, href: '/use-cases' },
          { label: useCase.title, href: `/use-cases/${useCase.slug}` },
        ]}
        eyebrow={t.detail.eyebrow}
        title={useCase.title}
        lead={useCase.summary}
        actions={
          <>
            <ButtonLink href={useCase.guide.href} size="lg" external>
              {useCase.guide.label}
            </ButtonLink>
            {useCase.packages.map((name) => (
              <ButtonLink key={name} href={p(PACKAGE_PAGES[name])} variant="secondary" size="lg">
                {name}
              </ButtonLink>
            ))}
          </>
        }
        aside={
          <CodeBlock
            code={useCase.code.source}
            lang={useCase.code.lang as BundledLanguage}
            title={useCase.code.title}
          />
        }
      />

      <Section eyebrow={t.detail.situation.eyebrow} title={t.detail.situation.title}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">
              {t.detail.situation.problem}
            </h3>
            <p className="mt-3 text-base leading-relaxed">{useCase.problem}</p>
          </div>
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">
              {t.detail.situation.approach}
            </h3>
            <p className="mt-3 text-base leading-relaxed">{useCase.approach}</p>
          </div>
        </div>
      </Section>

      <Section eyebrow={t.detail.watch.eyebrow} title={t.detail.watch.title}>
        <div className="grid gap-6 md:grid-cols-3">
          {useCase.watch.map((item, index) => (
            <Card key={item.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-semibold tracking-tight">{item.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{item.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{d.ui.packages}</span>
          {useCase.packages.map((name) => (
            <Pill key={name}>{name}</Pill>
          ))}
        </div>
      </Section>

      <Section eyebrow={t.detail.related.eyebrow} title={t.detail.related.title}>
        <div className="grid gap-4 sm:grid-cols-3">
          {related.map((other, index) => (
            <CardLink key={other.slug} href={p(`/use-cases/${other.slug}`)} title={other.title} index={index}>
              {other.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
