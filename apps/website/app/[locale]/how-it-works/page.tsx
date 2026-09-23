import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { LaunchFilm } from '@/components/launch-film'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { TwoMachines } from '@/components/two-machines'
import { ButtonLink, Card, Facts, Section, Stamp, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { docs } from '@/lib/site'
import { samples } from '@/lib/samples'

const { FILE_OBJECT, SNAPSHOT_ENVELOPE, ROUTES, CLIENT, CONDITIONAL } = samples.howItWorks

export async function generateMetadata({ params }: PageProps<'/[locale]/how-it-works'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).howItWorks

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/how-it-works',
    keywords: t.keywords,
  })
}

export default async function HowItWorksPage({ params }: PageProps<'/[locale]/how-it-works'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).howItWorks
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/how-it-works' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={p('/cli')} size="lg">
              {t.primary}
            </ButtonLink>
            <ButtonLink href={docs('/protocol')} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
          </>
        }
        aside={<LaunchFilm t={t.film} />}
        below={<TwoMachines t={t.scene} />}
      />

      <Section index="01" eyebrow={t.transfer.eyebrow} title={t.transfer.title} lead={t.transfer.lead}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={FILE_OBJECT} lang="text" title={t.transfer.fileTitle} />
          <CodeBlock code={SNAPSHOT_ENVELOPE} lang="jsonc" title={t.transfer.snapshotTitle} />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {t.transfer.cards.map((card, index) => (
            <Card key={card.stamp} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <Stamp tone="accent">{card.stamp}</Stamp>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                <Rich text={card.body} />
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {t.transfer.links.map((link) => (
            <TextLink key={link.href} href={link.href} external>
              {link.label}
            </TextLink>
          ))}
        </div>
      </Section>

      <Section index="02" eyebrow={t.codes.eyebrow} title={t.codes.title} lead={t.codes.lead}>
        <div className="grid gap-6 md:grid-cols-3">
          {t.codes.cards.map((card, index) => (
            <Card key={card.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-bold tracking-tight">{card.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={card.body} />
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {t.codes.links.map((link) => (
            <TextLink key={link.href} href={link.href} external>
              {link.label}
            </TextLink>
          ))}
        </div>
      </Section>

      <Section index="03" eyebrow={t.protocol.eyebrow} title={t.protocol.title} lead={t.protocol.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-6">
            <CodeBlock code={ROUTES} lang="text" title={t.protocol.routesTitle} />
            <CodeBlock code={CLIENT} lang="ts" title={t.protocol.clientTitle} />
          </div>
          <div className="space-y-4 text-base leading-relaxed">
            {t.protocol.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={docs('/protocol')} external>
              {t.protocol.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section index="04" eyebrow={t.writers.eyebrow} title={t.writers.title} lead={t.writers.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              <Rich text={t.writers.body} />
            </p>
            <TextLink href={docs('/two-devices')} external>
              {t.writers.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section index="05" eyebrow={t.packages.eyebrow} title={t.packages.title} lead={t.packages.lead}>
        <div className="grid gap-4 md:grid-cols-2">
          {t.packages.items.map((entry, index) => (
            <Card key={entry.name} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-mono text-base font-bold">{entry.name}</h3>
                <span className="text-ink-faint font-mono text-[11px]">{entry.deps}</span>
              </div>
              <div className="text-accent mt-1 font-mono text-[10px] tracking-[0.2em] uppercase">{entry.role}</div>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">{entry.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10">
          <Facts items={t.packages.facts} />
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
