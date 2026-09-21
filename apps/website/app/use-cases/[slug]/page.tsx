import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { BundledLanguage } from 'shiki'

import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Pill, Section } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { findUseCase, useCases } from '@/lib/use-cases'

export const dynamicParams = false

export function generateStaticParams() {
  return useCases.map((useCase) => ({ slug: useCase.slug }))
}

export async function generateMetadata(props: PageProps<'/use-cases/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const useCase = findUseCase(slug)
  if (!useCase) notFound()

  return pageMetadata({
    title: useCase.title,
    description: `${useCase.summary} How to build it with s3nd, what to watch, and the full guide.`,
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

export default async function UseCasePage(props: PageProps<'/use-cases/[slug]'>) {
  const { slug } = await props.params
  const useCase = findUseCase(slug)
  if (!useCase) notFound()

  const related = useCases.filter((other) => other.slug !== useCase.slug).slice(0, 3)

  return (
    <>
      <PageHero
        trail={[
          { label: 'Use cases', href: '/use-cases' },
          { label: useCase.title, href: `/use-cases/${useCase.slug}` },
        ]}
        eyebrow="Use case"
        title={useCase.title}
        lead={useCase.summary}
        actions={
          <>
            <ButtonLink href={useCase.guide.href} external>
              {useCase.guide.label}
            </ButtonLink>
            {useCase.packages.map((name) => (
              <ButtonLink key={name} href={PACKAGE_PAGES[name]} variant="secondary">
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

      <Section eyebrow="The situation" title="What is actually going on.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">The problem</h3>
            <p className="mt-3 text-base leading-relaxed">{useCase.problem}</p>
          </div>
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">What s3nd does about it</h3>
            <p className="mt-3 text-base leading-relaxed">{useCase.approach}</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Worth watching" title="The things that are easy to get wrong.">
        <div className="grid gap-6 md:grid-cols-3">
          {useCase.watch.map((item) => (
            <Card key={item.title}>
              <h3 className="font-semibold tracking-tight">{item.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{item.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">Packages</span>
          {useCase.packages.map((name) => (
            <Pill key={name}>{name}</Pill>
          ))}
        </div>
      </Section>

      <Section eyebrow="Related" title="Other shapes of the same primitive.">
        <div className="grid gap-4 sm:grid-cols-3">
          {related.map((other) => (
            <CardLink key={other.slug} href={`/use-cases/${other.slug}`} title={other.title}>
              {other.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta />
    </>
  )
}
