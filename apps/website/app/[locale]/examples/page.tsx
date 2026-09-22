import type { Metadata } from 'next'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Pill, Section, TextLink } from '@/components/ui'
import { examples, guides } from '@/lib/examples'
import { getDictionary, localeFrom } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { github, repositoryUrl } from '@/lib/site'
import { samples } from '@/lib/samples'

const { MINIO, OUTPUT } = samples.examples

export async function generateMetadata({ params }: PageProps<'/[locale]/examples'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).examples

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/examples',
    keywords: t.keywords,
  })
}

export default async function ExamplesPage({ params }: PageProps<'/[locale]/examples'>) {
  const locale = await localeFrom(params)
  const d = getDictionary(locale)
  const t = d.examples

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/examples' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={github('examples')} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={repositoryUrl} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
          </>
        }
        aside={<CodeBlock code={MINIO} lang="sh" title={t.minioTitle} />}
      />

      {examples(locale).map((example, index) => (
        <Section
          key={example.slug}
          id={example.slug}
          eyebrow={`examples/${example.slug}`}
          title={example.title}
          lead={example.summary}
          index={String(index + 1).padStart(2, '0')}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{d.ui.worthNoticing}</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
                {example.shows.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="bg-accent mt-2 inline-block size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {example.stack.map((item) => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <TextLink href={example.source} external>
                  {d.ui.sourceOnGithub}
                </TextLink>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <CodeBlock code={example.run} lang="sh" title={d.ui.runIt} />
              {example.slug === 'node-script' ? (
                <CodeBlock code={OUTPUT} lang="text" title={d.ui.expectedOutput} />
              ) : null}
            </div>
          </div>
        </Section>
      ))}

      <Section eyebrow={t.guides.eyebrow} title={t.guides.title} lead={t.guides.lead}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides(locale).map((guide, index) => (
            <CardLink key={guide.href} href={guide.href} title={guide.title} external index={index}>
              {guide.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section eyebrow={t.tryIt.eyebrow} title={t.tryIt.title}>
        <Card>
          <ol className="grid gap-6 md:grid-cols-3">
            <li>
              <div className="text-accent font-mono text-xs">01</div>
              <p className="mt-2 text-sm leading-relaxed">{t.tryIt.steps[0]}</p>
            </li>
            <li>
              <div className="text-accent font-mono text-xs">02</div>
              <p className="mt-2 text-sm leading-relaxed">{t.tryIt.steps[1]}</p>
              <div className="mt-3 flex flex-col gap-2">
                <Command>npx @s3nd/cli init --provider minio --bucket transfers</Command>
                <Command>npx @s3nd/cli doctor</Command>
              </div>
            </li>
            <li>
              <div className="text-accent font-mono text-xs">03</div>
              <p className="mt-2 text-sm leading-relaxed">{t.tryIt.steps[2]}</p>
              <div className="mt-3 flex flex-col gap-2">
                <Command>npx @s3nd/cli put ./anything.pdf</Command>
                <Command>npx @s3nd/cli get k7qp-2m4x</Command>
              </div>
            </li>
          </ol>
        </Card>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
