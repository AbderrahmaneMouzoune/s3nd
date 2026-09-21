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

const HERO = `import { createBucket, createTransferHandler } from 's3nd'

const store = createBucket({ bucket: 'drop' })

// A drop box on your own domain, in one route file.
export const { GET, POST, DELETE } = createTransferHandler({
  bucket: store,
  expiresIn: 24 * 3600,
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})`

const FILES = `await store.upload(file)     // → { key, path, url?, size?, etag?, contentType }
await store.put(id, file)    // one file per identifier: create or replace
await store.get(id)          // → the file back, or null
await store.getUrl(id)       // → public or presigned URL
await store.delete(id)       // → void

store.client                 // the plain S3Client, for anything else`

const HANDLER = `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from 's3nd'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'drop' }),
  expiresIn: 24 * 3600,
  raw: 'redirect', // downloads 302 to a presigned URL
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})`

const HONO = `import { Hono } from 'hono'
import { createBucket, createTransferHandler } from 's3nd'

const transfers = createTransferHandler({ bucket: createBucket(), basePath: '/api/transfers' })

const app = new Hono()
app.all('/api/transfers', (c) => transfers(c.req.raw))
app.all('/api/transfers/*', (c) => transfers(c.req.raw))`

const BUN = `import { createBucket, createTransferHandler } from 's3nd'

const transfers = createTransferHandler({ bucket: createBucket(), basePath: '/api/transfers' })

Bun.serve({
  fetch(request) {
    if (new URL(request.url).pathname.startsWith('/api/transfers')) return transfers(request)
    return new Response('Not found', { status: 404 })
  },
})`

const SNAPSHOT = `const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600, ifAbsent: true })

const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data      // the state, or null when unknown or expired
snapshot?.createdAt // what to show before replacing anything
snapshot?.device`

const CONDITIONAL = `// Claim a fresh code: write only if nothing is stored under it yet.
await store.put(code, file, { ifAbsent: true })

// Rewrite a shared object: fail if someone else wrote since you read.
const current = await store.getSnapshot(\`user-\${userId}\`)
await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })`

const ERRORS = `import { isS3ndError } from 's3nd'

try {
  await store.upload(body, { filename })
} catch (error) {
  if (isS3ndError(error) && error.code === 'FILE_TOO_LARGE') {
    return Response.json({ error: 'Too large to transfer in one piece' }, { status: 413 })
  }
  throw error
}`

const CONFIG = `createBucket({
  bucket: 'drop',               // or S3ND_BUCKET / S3_BUCKET
  region: 'eu-west-3',          // or S3ND_REGION / AWS_REGION
  credentials: { … },           // omit for the AWS provider chain
  endpoint: 'https://…',        // R2, MinIO, Scaleway, Wasabi — or S3ND_ENDPOINT
  prefix: 'drop',               // internal namespace
  maxSize: 4 * 1024 * 1024,     // reject before any network call
  syncCode: { length: 8 },      // the shape of store.codes
})`

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
