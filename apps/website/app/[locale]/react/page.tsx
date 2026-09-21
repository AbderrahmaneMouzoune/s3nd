import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { SyncCodeDemo } from '@/components/sync-code-demo'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'
import { samples } from '@/lib/samples'

const { PROVIDER, SEND_FILE, RECEIVE_FILE, SEND_STATE } = samples.react

export async function generateMetadata({ params }: PageProps<'/[locale]/react'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).react

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/react',
    keywords: t.keywords,
  })
}

export default async function ReactPage({ params }: PageProps<'/[locale]/react'>) {
  const locale = await localeFrom(params)
  const d = getDictionary(locale)
  const t = d.react
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/react' }]}
        eyebrow={packages.react.name}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={docs('/react')} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={packages.react.npm} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <Command>{packages.react.install}</Command>
            <CodeBlock code={PROVIDER} lang="tsx" title={t.providerTitle} />
          </div>
        }
      />

      <Section index="01" eyebrow={t.sending.eyebrow} title={t.sending.title} lead={t.sending.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SEND_FILE} lang="tsx" />
          <div className="space-y-4 text-base leading-relaxed">
            {t.sending.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={p('/use-cases/team-drop-box')}>{t.sending.link}</TextLink>
          </div>
        </div>
      </Section>

      <Section index="02" eyebrow={t.receiving.eyebrow} title={t.receiving.title} lead={t.receiving.lead}>
        <CodeBlock code={RECEIVE_FILE} lang="tsx" />
      </Section>

      <Section index="03" eyebrow={t.input.eyebrow} title={t.input.title} lead={t.input.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo labels={{ ...d.demo, normalizedCode: d.ui.normalizedCode }} />
          <div className="space-y-4 text-base leading-relaxed">
            {t.input.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section index="04" eyebrow={t.appState.eyebrow} title={t.appState.title} lead={t.appState.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SEND_STATE} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>{t.appState.body}</p>
            <div className="flex flex-wrap gap-4">
              <TextLink href={p('/use-cases/new-device')}>{t.appState.links.newDevice}</TextLink>
              <TextLink href={p('/examples')}>{t.appState.links.examples}</TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section index="05" eyebrow={t.guarantees.eyebrow} title={t.guarantees.title} lead={t.guarantees.lead}>
        <div className="grid gap-6 md:grid-cols-3">
          {t.guarantees.cards.map((card, index) => (
            <Card key={card.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-bold tracking-tight">{card.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={card.body} />
              </p>
            </Card>
          ))}
        </div>
        <dl className="border-line divide-line mt-8 divide-y rounded-lg border text-sm">
          {t.guarantees.hooks.map((entry) => (
            <div
              key={entry.term}
              className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
            >
              <dt className="text-accent font-mono text-xs leading-relaxed">{entry.term}</dt>
              <dd className="text-ink-muted font-mono text-xs leading-relaxed">{entry.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
