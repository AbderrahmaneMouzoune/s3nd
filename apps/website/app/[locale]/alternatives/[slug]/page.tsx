import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'

import { Cta } from '@/components/cta'
import { JsonLd } from '@/components/json-ld'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Section, TextLink } from '@/components/ui'
import {
  alternativeSlugs,
  alternatives,
  alternativesIn,
  categories,
  findAlternative,
  matrixDimensions,
  s3ndMatrix,
} from '@/lib/alternatives'
import { getDictionary, localeFrom, localePath, locales } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => alternativeSlugs.map((slug) => ({ locale, slug })))
}

export async function generateMetadata(props: PageProps<'/[locale]/alternatives/[slug]'>): Promise<Metadata> {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const alternative = findAlternative(locale, slug)
  if (!alternative) notFound()
  const t = getDictionary(locale).alternatives

  return pageMetadata({
    locale,
    title: `${t.vs} ${alternative.name}`,
    description: t.detail.metaDescription(alternative.name, alternative.headline),
    path: `/alternatives/${alternative.slug}`,
    keywords: alternative.keywords,
  })
}

export default async function AlternativePage(props: PageProps<'/[locale]/alternatives/[slug]'>) {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const alternative = findAlternative(locale, slug)
  if (!alternative) notFound()

  const t = getDictionary(locale).alternatives
  const p = (path: string) => localePath(locale, path)
  const cats = categories(locale)
  const siblings = alternativesIn(locale, alternative.category).filter((other) => other.slug !== alternative.slug)
  const others = alternatives(locale)
    .filter((other) => other.category !== alternative.category)
    .slice(0, 3)
  const path = `/alternatives/${alternative.slug}`
  const ours = s3ndMatrix(locale)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[
          { label: t.crumb, href: '/alternatives' },
          { label: alternative.name, href: path },
        ]}
        eyebrow={cats[alternative.category].title}
        title={alternative.headline}
        lead={alternative.overlap}
        actions={
          <>
            <ButtonLink href={p('/how-it-works')} size="lg">
              {t.detail.primary}
            </ButtonLink>
            <ButtonLink href={alternative.website} variant="secondary" size="lg" external>
              {alternative.name}
            </ButtonLink>
          </>
        }
      />

      <Section eyebrow={t.detail.what.eyebrow(alternative.name)} title={t.detail.what.title}>
        <p className="max-w-3xl text-base leading-relaxed">{alternative.what}</p>
      </Section>

      <Section eyebrow={t.detail.matrix.eyebrow} title={t.detail.matrix.title}>
        <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-line border-b">
                <th
                  scope="col"
                  className="text-ink-faint px-5 py-3 font-mono text-[11px] font-medium tracking-wider uppercase"
                >
                  &nbsp;
                </th>
                <th scope="col" className="text-accent px-5 py-3 font-semibold">
                  s3nd
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {alternative.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {matrixDimensions(locale).map((dimension) => (
                <tr key={dimension.key} className="hover:bg-surface-muted align-top transition-colors">
                  <th scope="row" className="text-ink-muted px-5 py-3 font-normal whitespace-nowrap">
                    {dimension.label}
                  </th>
                  <td className="px-5 py-3 leading-relaxed">{ours[dimension.key]}</td>
                  <td className="text-ink-muted px-5 py-3 leading-relaxed">{alternative.matrix[dimension.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow={t.detail.differences.eyebrow} title={t.detail.differences.title}>
        <div className="grid gap-6 md:grid-cols-2">
          {alternative.differences.map((difference, index) => (
            <Card key={difference.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-semibold tracking-tight">{difference.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{difference.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow={t.detail.decision.eyebrow} title={t.detail.decision.title}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold tracking-tight">{t.detail.decision.pickThem(alternative.name)}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {alternative.pickThem.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="bg-line-strong mt-2 inline-block size-1.5 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-accent/40 hover:border-accent">
            <h3 className="font-semibold tracking-tight">{t.detail.decision.pickS3nd}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {alternative.pickS3nd.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-accent mt-2 inline-block size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 text-sm">
              <TextLink href={p('/use-cases')}>{t.detail.decision.link}</TextLink>
            </div>
          </Card>
        </div>
      </Section>

      <Section eyebrow={t.detail.more.eyebrow} title={t.detail.more.title}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...siblings, ...others].map((other, index) => (
            <CardLink
              key={other.slug}
              href={p(`/alternatives/${other.slug}`)}
              title={`${t.vs} ${other.name}`}
              meta={cats[other.category].title}
              index={index}
            >
              {other.headline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta locale={locale} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${t.vs} ${alternative.name}`,
          description: alternative.headline,
          url: `${site.url}${p(path)}`,
          inLanguage: locale,
          author: { '@id': `${site.url}/#organization` },
          publisher: { '@id': `${site.url}/#organization` },
          about: [
            { '@type': 'SoftwareApplication', name: site.name, url: site.url },
            { '@type': 'SoftwareApplication', name: alternative.name, url: alternative.website },
          ],
        }}
      />
    </>
  )
}
