import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { findProvider, providers } from '@/lib/providers'

export const dynamicParams = false

export function generateStaticParams() {
  return providers.map((provider) => ({ slug: provider.slug }))
}

export async function generateMetadata(props: PageProps<'/providers/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const provider = findProvider(slug)
  if (!provider) notFound()

  return pageMetadata({
    title: `s3nd with ${provider.name}`,
    description: `Move files and local-first app data through a ${provider.name} bucket with s3nd: the createBucket() configuration, the CLI starter, and what to know about this provider.`,
    path: `/providers/${provider.slug}`,
    keywords: provider.keywords,
  })
}

export default async function ProviderPage(props: PageProps<'/providers/[slug]'>) {
  const { slug } = await props.params
  const provider = findProvider(slug)
  if (!provider) notFound()

  const others = providers.filter((other) => other.slug !== provider.slug)

  return (
    <>
      <PageHero
        trail={[
          { label: 'Providers', href: '/providers' },
          { label: provider.name, href: `/providers/${provider.slug}` },
        ]}
        eyebrow="Storage provider"
        title={`s3nd with ${provider.name}`}
        lead={provider.tagline}
        actions={
          <>
            <ButtonLink href={provider.docsHref} external>
              In the documentation
            </ButtonLink>
            <ButtonLink href="/cli" variant="secondary">
              The CLI
            </ButtonLink>
          </>
        }
        aside={<CodeBlock code={provider.library} lang="ts" title="createBucket()" />}
      />

      <Section eyebrow="Why this one" title={provider.name}>
        <p className="max-w-2xl text-base leading-relaxed">{provider.description}</p>
      </Section>

      <Section
        eyebrow="From the command line"
        title="A starter configuration, and what is left to do."
        lead="init writes the file with ${VAR} references rather than secrets, so it is meant to be committed; the env file it points at is not."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-3">
            <Command>{`s3nd init --provider ${provider.initName} --bucket transfers`}</Command>
            <CodeBlock code={provider.config} lang="json" title="s3nd.config.json" />
          </div>
          <div>
            <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">Then</h3>
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
                  Run <code className="font-mono">s3nd doctor</code>. It performs the operations s3nd needs and reports
                  what happened.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </Section>

      <Section eyebrow="Worth knowing" title={`Notes on ${provider.short}.`}>
        <div className="grid gap-6 md:grid-cols-3">
          {provider.notes.map((note) => (
            <Card key={note.title}>
              <h3 className="font-semibold tracking-tight">{note.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{note.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-sm">
          <TextLink href={provider.docsHref} external>
            The full guide
          </TextLink>
        </div>
      </Section>

      <Section eyebrow="Other providers" title="The endpoint is the only difference.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((other) => (
            <CardLink key={other.slug} href={`/providers/${other.slug}`} title={other.name}>
              {other.tagline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta />
    </>
  )
}
