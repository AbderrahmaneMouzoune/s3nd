import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { Faq } from '@/components/faq'
import { HeroBoard } from '@/components/hero-board'
import {
  AppGlyph,
  CodeIllustration,
  GetIllustration,
  HttpGlyph,
  NoMiddleIllustration,
  PutIllustration,
  SnapshotIllustration,
  TerminalGlyph,
} from '@/components/illustrations'
import { JsonLd } from '@/components/json-ld'
import { Rich } from '@/components/rich-text'
import { SyncCodeDemo } from '@/components/sync-code-demo'
import { Ticker } from '@/components/ticker'
import { ButtonLink, Card, CardLink, Container, Eyebrow, Pill, Section, Stamp, TextLink } from '@/components/ui'
import { alternatives } from '@/lib/alternatives'
import { faq } from '@/lib/faq'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { providers } from '@/lib/providers'
import { docs, packages, repositoryUrl, site } from '@/lib/site'
import { useCases } from '@/lib/use-cases'
import { samples } from '@/lib/samples'

const { CLI_SAMPLE, APP_SAMPLE, CURL_SAMPLE, SNAPSHOT_SAMPLE } = samples.home

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)

  return pageMetadata({
    locale,
    title: `${site.name} · ${t.site.tagline}`,
    description: t.site.description,
    path: '/',
    home: true,
  })
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const p = (path: string) => localePath(locale, path)
  const cases = useCases(locale)
  const files = cases.filter((useCase) => useCase.kind === 'files')
  const appState = cases.filter((useCase) => useCase.kind === 'app-state')

  return (
    <>
      <header className="relative overflow-hidden">
        <div className="grid-paper absolute inset-0 -z-10" aria-hidden="true" />
        <Container className="pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <div className="rise">
                <Eyebrow>{t.home.eyebrow}</Eyebrow>
              </div>
              <h1 className="rise rise-1 mt-5 text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance uppercase sm:text-7xl lg:text-[5.4rem]">
                {t.home.title}
              </h1>
              <p className="rise rise-2 text-ink-muted mt-7 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl">
                {t.home.lead}
              </p>
              <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
                <ButtonLink href={p('/cli')} size="lg">
                  {t.home.primary}
                </ButtonLink>
                <ButtonLink href={p('/how-it-works')} variant="secondary" size="lg">
                  {t.home.secondary}
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="ghost" size="lg" external>
                  {t.home.ghost}
                </ButtonLink>
              </div>
              <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
                {t.home.commands.map((command) => (
                  <Command key={command}>{command}</Command>
                ))}
              </div>
            </div>
            <div className="rise rise-3">
              <HeroBoard t={t.board} codeLabel={t.ui.codePrinted} />
            </div>
          </div>
        </Container>
      </header>

      <Ticker items={t.home.ticker} label={t.ui.inShort} />

      <Section id="how" index="01" eyebrow={t.home.how.eyebrow} title={t.home.how.title} lead={t.home.how.lead}>
        <ol className="grid gap-4 lg:grid-cols-3">
          {t.home.how.steps.map((step, index) => {
            const Figure = [PutIllustration, CodeIllustration, GetIllustration][index]

            return (
              <li
                key={step.stamp}
                className="bento border-line bg-surface hover:border-line-strong flex flex-col overflow-hidden rounded-lg border transition-colors duration-300"
                data-reveal=""
                style={{ '--stagger': index } as CSSProperties}
              >
                <div className="bento-figure border-line border-b">
                  <Figure labels={t.illustrations} className="h-auto w-full" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <Stamp tone="accent">{step.stamp}</Stamp>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight">{step.title}</h3>
                  <p className="text-ink-muted mt-3 flex-1 text-sm leading-relaxed">{step.body}</p>
                  <div className="mt-5 text-sm">
                    <TextLink href={step.href} external>
                      {step.label}
                    </TextLink>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section
        id="ways-in"
        index="02"
        eyebrow={t.home.waysIn.eyebrow}
        title={t.home.waysIn.title}
        lead={t.home.waysIn.lead}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <TerminalGlyph className="h-8 w-auto" />
                <h3 className="text-xl font-bold tracking-tight">{t.home.waysIn.terminal.title}</h3>
                <Pill>{packages.cli.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={t.home.waysIn.terminal.body} />
              </p>
            </div>
            <CodeBlock code={CLI_SAMPLE} lang="sh" className="flex-1" />
            <TextLink href={p('/cli')}>{t.home.waysIn.terminal.link}</TextLink>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <AppGlyph className="h-8 w-auto" />
                <h3 className="text-xl font-bold tracking-tight">{t.home.waysIn.app.title}</h3>
                <Pill>{packages.s3nd.name}</Pill>
                <Pill>{packages.react.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={t.home.waysIn.app.body} />
              </p>
            </div>
            <CodeBlock code={APP_SAMPLE} lang="ts" className="flex-1" />
            <div className="flex flex-wrap gap-4">
              <TextLink href={p('/library')}>{t.home.waysIn.app.libraryLink}</TextLink>
              <TextLink href={p('/react')}>{t.home.waysIn.app.hooksLink}</TextLink>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <HttpGlyph className="h-8 w-auto" />
                <h3 className="text-xl font-bold tracking-tight">{t.home.waysIn.http.title}</h3>
                <Pill>{packages.protocol.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={t.home.waysIn.http.body} />
              </p>
            </div>
            <CodeBlock code={CURL_SAMPLE} lang="sh" className="flex-1" />
            <TextLink href={docs('/protocol')} external>
              {t.home.waysIn.http.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        id="bucket"
        index="03"
        eyebrow={t.home.bucket.eyebrow}
        title={t.home.bucket.title}
        lead={t.home.bucket.lead}
      >
        <div className="grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
          <div
            className="bento border-line bg-surface hover:border-line-strong flex flex-col overflow-hidden rounded-lg border transition-colors duration-300 lg:col-span-2 lg:row-span-2"
            data-reveal=""
          >
            <div className="bento-figure border-line flex flex-1 items-center border-b">
              <NoMiddleIllustration labels={t.illustrations} className="h-auto w-full" />
            </div>
            <div className="p-6">
              <Stamp tone="accent">{t.home.bucket.eyebrow}</Stamp>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">{t.home.bucket.figure}</p>
            </div>
          </div>
          {t.home.bucket.facts.map((fact, index) => (
            <div
              key={fact.label}
              className="bento border-line bg-surface hover:bg-surface-muted hover:border-line-strong rounded-lg border p-5 transition-colors duration-300"
              data-reveal=""
              style={{ '--stagger': index + 1 } as CSSProperties}
            >
              <h3 className="text-accent font-mono text-[10px] tracking-[0.2em] uppercase">{fact.label}</h3>
              <p className="mt-2 text-sm leading-relaxed">{fact.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {providers(locale).map((provider, index) => (
            <CardLink key={provider.slug} href={p(`/providers/${provider.slug}`)} title={provider.name} index={index}>
              {provider.tagline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section id="codes" index="04" eyebrow={t.home.codes.eyebrow} title={t.home.codes.title} lead={t.home.codes.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo labels={{ ...t.demo, normalizedCode: t.ui.normalizedCode }} />
          <div className="space-y-5 text-base leading-relaxed lg:pt-2">
            {t.home.codes.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <div className="flex flex-wrap gap-4">
              {t.home.codes.links.map((link) => (
                <TextLink key={link.href} href={link.href} external>
                  {link.label}
                </TextLink>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="app-state"
        index="05"
        eyebrow={t.home.appState.eyebrow}
        title={t.home.appState.title}
        lead={t.home.appState.lead}
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-4">
            <div className="bento border-line bg-surface overflow-hidden rounded-lg border" data-reveal="">
              <div className="bento-figure">
                <SnapshotIllustration labels={t.illustrations} className="h-auto w-full" />
              </div>
              <p className="text-ink-muted border-line border-t px-5 py-4 text-sm leading-relaxed">
                {t.home.appState.figure}
              </p>
            </div>
            <CodeBlock code={SNAPSHOT_SAMPLE} lang="ts" />
          </div>
          <div className="grid gap-4">
            {t.home.appState.cards.map((card) => (
              <Card key={card.title}>
                <h3 className="font-bold tracking-tight">{card.title}</h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  <Rich text={card.body} />
                </p>
              </Card>
            ))}
            <div className="flex flex-wrap gap-4 text-sm">
              <TextLink href={p('/use-cases/new-device')}>{t.home.appState.links.newDevice}</TextLink>
              <TextLink href={p('/react')}>{t.home.appState.links.hooks}</TextLink>
              <TextLink href={docs('/snapshots')} external>
                {t.home.appState.links.snapshots}
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section id="use-cases" index="06" eyebrow={t.home.useCases.eyebrow} title={t.home.useCases.title}>
        <div className="grid gap-10">
          <div>
            <h3 className="text-ink-faint mb-4 font-mono text-[10px] tracking-[0.22em] uppercase">
              {t.home.useCases.files}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
          <div>
            <h3 className="text-ink-faint mb-4 font-mono text-[10px] tracking-[0.22em] uppercase">
              {t.home.useCases.appState}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </div>
      </Section>

      <Section
        id="compare"
        index="07"
        eyebrow={t.home.compare.eyebrow}
        title={t.home.compare.title}
        lead={t.home.compare.lead}
      >
        <div className="flex flex-wrap gap-2">
          {alternatives(locale)
            .filter(
              (alternative) =>
                alternative.slug !== 'electricsql' &&
                alternative.slug !== 'replicache' &&
                alternative.slug !== 'pouchdb',
            )
            .map((alternative) => (
              <ButtonLink
                key={alternative.slug}
                href={p(`/alternatives/${alternative.slug}`)}
                variant="secondary"
                plain
              >
                {t.home.compare.vs} {alternative.name}
              </ButtonLink>
            ))}
          <ButtonLink href={p('/alternatives')} variant="ghost">
            {t.home.compare.all}
          </ButtonLink>
        </div>
      </Section>

      <Section id="faq" index="08" eyebrow={t.home.faq.eyebrow} title={t.home.faq.title}>
        <Faq entries={faq(locale)} linkPath={p} />
      </Section>

      <Cta locale={locale} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          '@id': `${site.url}/#software`,
          name: site.name,
          url: site.url,
          description: t.site.description,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Node.js 20+, any browser',
          softwareVersion: '0.1',
          license: 'https://opensource.org/license/mit',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          downloadUrl: packages.cli.npm,
          installUrl: packages.cli.npm,
          softwareHelp: { '@type': 'CreativeWork', url: docs() },
          author: { '@id': `${site.url}/#organization` },
          sameAs: [repositoryUrl],
        }}
      />
    </>
  )
}
