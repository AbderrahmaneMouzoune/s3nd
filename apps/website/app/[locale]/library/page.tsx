import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'
import { samples } from '@/lib/samples'

const { HERO, FILES, HANDLER, HONO, BUN, SNAPSHOT, CONDITIONAL, ERRORS, CONFIG } = samples.library

export async function generateMetadata({ params }: PageProps<'/[locale]/library'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).library

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/library',
    keywords: t.keywords,
  })
}

export default async function LibraryPage({ params }: PageProps<'/[locale]/library'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).library
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/library' }]}
        eyebrow={packages.s3nd.name}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={docs('/server')} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={docs('/api')} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
            <ButtonLink href={packages.s3nd.npm} variant="ghost" size="lg" external>
              {t.ghost}
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <Command>{packages.s3nd.install}</Command>
            <CodeBlock code={HERO} lang="ts" />
          </div>
        }
      />

      <Section index="01" eyebrow={t.files.eyebrow} title={t.files.title} lead={t.files.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={FILES} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            {t.files.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={docs('/api')} external>
              {t.files.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section index="02" eyebrow={t.handler.eyebrow} title={t.handler.title} lead={t.handler.lead}>
        <div className="grid gap-6 lg:grid-cols-3">
          <CodeBlock code={HANDLER} lang="ts" title={t.handler.titles.next} />
          <CodeBlock code={HONO} lang="ts" title={t.handler.titles.hono} />
          <CodeBlock code={BUN} lang="ts" title={t.handler.titles.bun} />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-base leading-relaxed">
          <Rich text={t.handler.body} />
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <TextLink href={docs('/server')} external>
            {t.handler.links.server}
          </TextLink>
          <TextLink href={docs('/protocol')} external>
            {t.handler.links.protocol}
          </TextLink>
          <TextLink href={p('/use-cases/team-drop-box')}>{t.handler.links.teamDropBox}</TextLink>
        </div>
      </Section>

      <Section index="03" eyebrow={t.snapshots.eyebrow} title={t.snapshots.title} lead={t.snapshots.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SNAPSHOT} lang="ts" />
          <div className="grid gap-4">
            {t.snapshots.cards.map((card, index) => (
              <Card key={card.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
                <h3 className="font-bold tracking-tight">{card.title}</h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  <Rich text={card.body} />
                </p>
              </Card>
            ))}
            <div className="text-sm">
              <TextLink href={docs('/snapshots')} external>
                {t.snapshots.link}
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section index="04" eyebrow={t.conditional.eyebrow} title={t.conditional.title} lead={t.conditional.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            {t.conditional.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={docs('/two-devices')} external>
              {t.conditional.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section index="05" eyebrow={t.errors.eyebrow} title={t.errors.title} lead={t.errors.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={ERRORS} lang="ts" />
          <dl className="border-line divide-line divide-y rounded-lg border text-sm">
            {t.errors.codes.map((entry) => (
              <div
                key={entry.term}
                className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4"
              >
                <dt className="text-accent font-mono text-xs leading-relaxed">{entry.term}</dt>
                <dd className="text-ink-muted leading-relaxed">{entry.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-6 text-sm">
          <TextLink href={docs('/errors')} external>
            {t.errors.link}
          </TextLink>
        </div>
      </Section>

      <Section index="06" eyebrow={t.config.eyebrow} title={t.config.title} lead={t.config.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONFIG} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            {t.config.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <div className="flex flex-wrap gap-4">
              <TextLink href={docs('/configuration')} external>
                {t.config.links.configuration}
              </TextLink>
              <TextLink href={docs('/limits')} external>
                {t.config.links.limits}
              </TextLink>
              <TextLink href={p('/providers')}>{t.config.links.providers}</TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
