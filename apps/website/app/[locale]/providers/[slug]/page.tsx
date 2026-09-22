import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, Card, CardLink, Section, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath, locales } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { findProvider, providerSlugs, providers } from '@/lib/providers'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => providerSlugs.map((slug) => ({ locale, slug })))
}

export async function generateMetadata(props: PageProps<'/[locale]/providers/[slug]'>): Promise<Metadata> {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const provider = findProvider(locale, slug)
  if (!provider) notFound()
  const t = getDictionary(locale).providers.detail

  return pageMetadata({
    locale,
    title: `${t.titlePrefix} ${provider.name}`,
    description: t.metaDescription(provider.name),
    path: `/providers/${provider.slug}`,
    keywords: provider.keywords,
  })
}

export default async function ProviderPage(props: PageProps<'/[locale]/providers/[slug]'>) {
  const locale = await localeFrom(props.params)
  const { slug } = await props.params
  const provider = findProvider(locale, slug)
  if (!provider) notFound()

  const d = getDictionary(locale)
  const t = d.providers
  const p = (path: string) => localePath(locale, path)
  const others = providers(locale).filter((other) => other.slug !== provider.slug)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[
          { label: t.crumb, href: '/providers' },
          { label: provider.name, href: `/providers/${provider.slug}` },
        ]}
        eyebrow={t.detail.eyebrow}
        title={`${t.detail.titlePrefix} ${provider.name}`}
        lead={provider.tagline}
        actions={
          <>
            <ButtonLink href={provider.docsHref} size="lg" external>
              {t.detail.primary}
            </ButtonLink>
            <ButtonLink href={p('/cli')} variant="secondary" size="lg">
              {t.detail.secondary}
            </ButtonLink>
          </>
        }
        aside={<CodeBlock code={provider.library} lang="ts" title="createBucket()" />}
      />

      <Section eyebrow={t.detail.why} title={provider.name}>
        <p className="max-w-2xl text-base leading-relaxed">{provider.description}</p>
      </Section>

      <Section eyebrow={t.detail.cli.eyebrow} title={t.detail.cli.title} lead={t.detail.cli.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-3">
            <Command>{`s3nd init --provider ${provider.initName} --bucket transfers`}</Command>
            <CodeBlock code={provider.config} lang="json" title="s3nd.config.json" />
          </div>
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{d.ui.then}</h3>
            <ol className="mt-3 space-y-3 text-sm leading-relaxed">
              {provider.next.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="text-accent font-mono text-xs">0{index + 1}</span>
                  <span className="min-w-0 break-words">{step}</span>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="text-accent font-mono text-xs">0{provider.next.length + 1}</span>
                <span>
                  <Rich text={t.detail.cli.doctor} />
                </span>
              </li>
            </ol>
          </div>
        </div>
      </Section>

      <Section eyebrow={t.detail.notes.eyebrow} title={t.detail.notes.title(provider.short)}>
        <div className="grid gap-6 md:grid-cols-3">
          {provider.notes.map((note, index) => (
            <Card key={note.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-semibold tracking-tight">{note.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{note.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-sm">
          <TextLink href={provider.docsHref} external>
            {t.detail.notes.link}
          </TextLink>
        </div>
      </Section>

      <Section eyebrow={t.detail.others.eyebrow} title={t.detail.others.title}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((other, index) => (
            <CardLink key={other.slug} href={p(`/providers/${other.slug}`)} title={other.name} index={index}>
              {other.tagline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
