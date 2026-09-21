import type { Metadata } from 'next'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'
import { samples } from '@/lib/samples'

const { INIT, DOCTOR, PUT_GET, CONFIG_FILE, PROFILES, REMOTE } = samples.cli

export async function generateMetadata({ params }: PageProps<'/[locale]/cli'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).cli

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/cli',
    keywords: t.keywords,
  })
}

export default async function CliPage({ params }: PageProps<'/[locale]/cli'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).cli
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/cli' }]}
        eyebrow={packages.cli.name}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={docs('/cli')} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={docs('/no-server')} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
            <ButtonLink href={packages.cli.npm} variant="ghost" size="lg" external>
              {t.ghost}
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Command>{packages.cli.install}</Command>
              <Command>npx @s3nd/cli doctor</Command>
            </div>
            <CodeBlock code={PUT_GET} lang="sh" />
          </div>
        }
      />

      <Section eyebrow={t.initDoctor.eyebrow} title={t.initDoctor.title} lead={t.initDoctor.lead}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={INIT} lang="sh" title={t.initDoctor.initTitle} />
          <CodeBlock code={DOCTOR} lang="sh" title={t.initDoctor.doctorTitle} />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.initDoctor.body} />
        </p>
      </Section>

      <Section eyebrow={t.config.eyebrow} title={t.config.title} lead={t.config.lead}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={CONFIG_FILE} lang="json" title="s3nd.config.json" />
          <CodeBlock code={PROFILES} lang="sh" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.config.body} />
        </p>
        <div className="mt-4 text-sm">
          <TextLink href={p('/use-cases/ci-backups')}>{t.config.link}</TextLink>
        </div>
      </Section>

      <Section eyebrow={t.remote.eyebrow} title={t.remote.title} lead={t.remote.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={REMOTE} lang="sh" />
          <div className="space-y-4 text-sm leading-relaxed">
            {t.remote.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={docs('/server')} external>
              {t.remote.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section eyebrow={t.reference.eyebrow} title={t.reference.title}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              {t.reference.commandsTitle}
            </h3>
            <dl className="divide-line divide-y text-sm">
              {t.reference.commands.map((entry) => (
                <div
                  key={entry.term}
                  className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
                >
                  <dt className="font-mono text-xs leading-relaxed">{entry.term}</dt>
                  <dd className="text-ink-muted leading-relaxed">{entry.body}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              {t.reference.optionsTitle}
            </h3>
            <dl className="divide-line divide-y text-sm">
              {t.reference.options.map((entry) => (
                <div
                  key={entry.term}
                  className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
                >
                  <dt className="font-mono text-xs leading-relaxed">{entry.term}</dt>
                  <dd className="text-ink-muted leading-relaxed">{entry.body}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.reference.body} />
        </p>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
