import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Cta } from '@/components/cta'
import { JsonLd } from '@/components/json-ld'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Section, TextLink } from '@/components/ui'
import {
  alternatives,
  alternativesIn,
  categories,
  findAlternative,
  matrixDimensions,
  s3ndMatrix,
} from '@/lib/alternatives'
import { pageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return alternatives.map((alternative) => ({ slug: alternative.slug }))
}

export async function generateMetadata(props: PageProps<'/alternatives/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const alternative = findAlternative(slug)
  if (!alternative) notFound()

  return pageMetadata({
    title: `s3nd vs ${alternative.name}`,
    description: `${alternative.headline}. What ${alternative.name} is, where the two overlap, where they differ, and when to pick each.`,
    path: `/alternatives/${alternative.slug}`,
    keywords: alternative.keywords,
  })
}

export default async function AlternativePage(props: PageProps<'/alternatives/[slug]'>) {
  const { slug } = await props.params
  const alternative = findAlternative(slug)
  if (!alternative) notFound()

  const siblings = alternativesIn(alternative.category).filter((other) => other.slug !== alternative.slug)
  const others = alternatives.filter((other) => other.category !== alternative.category).slice(0, 3)
  const path = `/alternatives/${alternative.slug}`

  return (
    <>
      <PageHero
        trail={[
          { label: 'Alternatives', href: '/alternatives' },
          { label: alternative.name, href: path },
        ]}
        eyebrow={categories[alternative.category].title}
        title={alternative.headline}
        lead={alternative.overlap}
        actions={
          <>
            <ButtonLink href="/how-it-works">How s3nd works</ButtonLink>
            <ButtonLink href={alternative.website} variant="secondary" external>
              {alternative.name}
            </ButtonLink>
          </>
        }
      />

      <Section eyebrow={`What ${alternative.name} is`} title="In its own terms.">
        <p className="max-w-3xl text-base leading-relaxed">{alternative.what}</p>
      </Section>

      <Section eyebrow="Side by side" title="Where they part ways.">
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
                <th scope="col" className="px-5 py-3 font-semibold">
                  s3nd
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {alternative.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {matrixDimensions.map((dimension) => (
                <tr key={dimension.key} className="align-top">
                  <th scope="row" className="text-ink-muted px-5 py-3 font-normal whitespace-nowrap">
                    {dimension.label}
                  </th>
                  <td className="px-5 py-3 leading-relaxed">{s3ndMatrix[dimension.key]}</td>
                  <td className="text-ink-muted px-5 py-3 leading-relaxed">{alternative.matrix[dimension.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="The differences" title="What actually changes.">
        <div className="grid gap-6 md:grid-cols-2">
          {alternative.differences.map((difference) => (
            <Card key={difference.title}>
              <h3 className="font-semibold tracking-tight">{difference.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{difference.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="The decision" title="Pick the one that fits.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold tracking-tight">Pick {alternative.name} when</h3>
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
          <Card className="border-accent/40">
            <h3 className="font-semibold tracking-tight">Pick s3nd when</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {alternative.pickS3nd.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-accent mt-2 inline-block size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 text-sm">
              <TextLink href="/use-cases">See the use cases</TextLink>
            </div>
          </Card>
        </div>
      </Section>

      <Section eyebrow="More comparisons" title="Tool by tool.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...siblings, ...others].map((other) => (
            <CardLink
              key={other.slug}
              href={`/alternatives/${other.slug}`}
              title={`s3nd vs ${other.name}`}
              meta={categories[other.category].title}
            >
              {other.headline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `s3nd vs ${alternative.name}`,
          description: alternative.headline,
          url: `${site.url}${path}`,
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
