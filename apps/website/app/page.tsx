import type { Metadata } from 'next'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { Faq } from '@/components/faq'
import { JsonLd } from '@/components/json-ld'
import { SyncCodeDemo } from '@/components/sync-code-demo'
import { TransferDiagram } from '@/components/transfer-diagram'
import { ButtonLink, CardLink, Container, Eyebrow, Pill, Section, TextLink } from '@/components/ui'
import { examples } from '@/lib/examples'
import { providers } from '@/lib/providers'
import { docs, packages, repositoryUrl, site } from '@/lib/site'
import { useCases } from '@/lib/use-cases'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const LIBRARY_SAMPLE = `import { createBucket } from 's3nd'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

// On the old device: hand the user a code.
const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

// On the new device: they type it in.
const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data // → the state, ready to write back into IndexedDB`

const REACT_SAMPLE = `import { useReceiveTransfer, useSyncCodeInput } from '@s3nd/react'

function RestoreFromCode() {
  const input = useSyncCodeInput()
  const { load, transfer, data, notFound } = useReceiveTransfer<Dump>()

  return (
    <>
      <input {...input.inputProps} placeholder="K7QP 2M4X" />
      <button onClick={() => load(input.code!)} disabled={!input.isComplete}>
        Look it up
      </button>
      {notFound && <p>Unknown or expired code.</p>}
      {transfer && <button onClick={() => importDatabase(data!)}>Replace my data</button>}
    </>
  )
}`

const CLI_SAMPLE = `$ s3nd put ./report.pdf
report.pdf · 284 kB · expires in 1 hour
K7QP2M4X

$ s3nd get k7qp-2m4x        # on the other machine
Wrote /home/you/report.pdf · 284 kB

$ s3nd doctor
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no enabled expiration rule`

const HANDLER_SAMPLE = `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from 's3nd'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'my-bucket' }),
  app: 'notes',
  expiresIn: 3600,
})`

const STEPS = [
  {
    title: 'Snapshot',
    body: 'The old device exports its local state. s3nd wraps it in a self-describing envelope with your app name, schema version and expiry, gzips it, and writes it to your bucket under a fresh code.',
    href: docs('/snapshots'),
  },
  {
    title: 'Code',
    body: 'Eight Crockford base32 characters, forty bits, with the letters people misread left out. The user reads it off one screen and types it into the other, sloppily, and it still resolves.',
    href: docs('/sync-codes'),
  },
  {
    title: 'Restore',
    body: 'The new device looks the code up, sees when and where the snapshot was made, and only then replaces its own data. An expired snapshot is never handed over, and a newer schema refuses cleanly.',
    href: docs('/use-cases/new-device'),
  },
]

export default function HomePage() {
  return (
    <>
      <header className="border-line relative border-b">
        <Container className="pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <Eyebrow>Open source · MIT · TypeScript</Eyebrow>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                Move data between devices with a code.
              </h1>
              <p className="text-ink-muted mt-6 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl">
                s3nd snapshots a local-first app&apos;s state, or a file from your terminal, into an S3 bucket you
                control, under a short code the user carries across. Credentials stay on your server.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={docs('/quick-start')} external>
                  Quick start
                </ButtonLink>
                <ButtonLink href="/how-it-works" variant="secondary">
                  How it works
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="ghost" external>
                  GitHub
                </ButtonLink>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Command>npm install s3nd</Command>
                <Command>npx @s3nd/cli doctor</Command>
              </div>
            </div>
            <TransferDiagram />
          </div>
        </Container>
      </header>

      <Section
        id="ways-in"
        eyebrow="Three ways in"
        title="A library, hooks, and a command line. One primitive under all three."
        lead="The browser never sees a storage credential. The server-side package holds the keys; the browser packages depend on fetch and nothing else."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">The library</h3>
                <Pill>{packages.s3nd.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Snapshots with an envelope, conditional writes, a file API, and a transfer handler that is a Next route
                in one line. Runs where the AWS SDK runs.
              </p>
            </div>
            <CodeBlock code={LIBRARY_SAMPLE} lang="ts" className="flex-1" />
            <TextLink href="/library">Everything the library does</TextLink>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">React hooks</h3>
                <Pill>{packages.react.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Send a snapshot or a file, read a code back, and an input that repairs what the user typed. No path from
                it reaches S3.
              </p>
            </div>
            <CodeBlock code={REACT_SAMPLE} lang="tsx" className="flex-1" />
            <TextLink href="/react">The hooks, in detail</TextLink>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">The CLI</h3>
                <Pill>{packages.cli.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                A file between two machines with a code, straight to the bucket or through your server. And a doctor
                that checks the bucket is actually set up to hold transfers.
              </p>
            </div>
            <CodeBlock code={CLI_SAMPLE} lang="sh" className="flex-1" />
            <TextLink href="/cli">Every command</TextLink>
          </div>
        </div>
      </Section>

      <Section
        id="how"
        eyebrow="How a transfer works"
        title="Snapshot, code, restore."
        lead="IndexedDB is fast, offline and private, and it never leaves the browser it was written in. s3nd is the small server-side piece that closes that gap."
        className="bg-surface-muted/60"
      >
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-line bg-surface shadow-card rounded-2xl border p-6">
              <div className="text-accent font-mono text-xs">0{index + 1}</div>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{step.body}</p>
              <div className="mt-4 text-sm">
                <TextLink href={step.href} external>
                  Read more
                </TextLink>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">The routes, without writing them</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              <code className="font-mono">createTransferHandler()</code> serves the four-route transfer protocol. It
              takes a <code className="font-mono">Request</code> and returns a{' '}
              <code className="font-mono">Response</code>, so it is a Next route handler, a Hono route,{' '}
              <code className="font-mono">Bun.serve</code>, Deno or a worker, without an adapter for any of them. Add{' '}
              <code className="font-mono">authorize</code> and it is not public any more.
            </p>
            <div className="mt-4 text-sm">
              <TextLink href={docs('/protocol')} external>
                The transfer protocol
              </TextLink>
            </div>
          </div>
          <CodeBlock code={HANDLER_SAMPLE} lang="ts" />
        </div>
      </Section>

      <Section
        id="codes"
        eyebrow="Sync codes"
        title="A code that survives being read aloud."
        lead="The whole user experience of moving between devices is someone reading a code off one screen and typing it into another. Everything about the code is shaped by that."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo />
          <div className="space-y-5 text-sm leading-relaxed lg:pt-2">
            <p>
              The default is eight characters of Crockford base32: no <code className="font-mono">I</code>,{' '}
              <code className="font-mono">L</code>, <code className="font-mono">O</code> or{' '}
              <code className="font-mono">U</code>, so a code survives paper, a phone keyboard and a phone call.
              Generation and normalization live on the same object, so the two sides can never disagree about the
              alphabet.
            </p>
            <p>
              Four digits for a phone-first app, twelve alphanumerics for a long-lived one: both halves are
              configurable, and <code className="font-mono">entropyBits</code> tells you what the code is worth guessing
              against so the rate limit can do the rest.
            </p>
            <p>
              A code is a bearer token. Give it a short expiry, rate-limit the lookup route, and for sensitive data
              encrypt in the browser before anything reaches your server.
            </p>
            <div className="flex flex-wrap gap-4">
              <TextLink href={docs('/sync-codes')} external>
                Sync codes
              </TextLink>
              <TextLink href={docs('/code-configuration')} external>
                Configuring codes
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="providers"
        eyebrow="Your bucket"
        title="Any storage that speaks S3."
        lead="Set an endpoint and s3nd switches the two defaults those providers expect. The CLI writes a starter configuration for each, and doctor tells you whether it actually works."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {providers.map((provider) => (
            <CardLink key={provider.slug} href={`/providers/${provider.slug}`} title={provider.name}>
              {provider.tagline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section
        id="use-cases"
        eyebrow="Use cases"
        title="What people build with it."
        lead="The flagship case is a new phone with no account to sign into. The same primitive covers the cases around it."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <CardLink
              key={useCase.slug}
              href={`/use-cases/${useCase.slug}`}
              title={useCase.title}
              meta={useCase.packages.join(' · ')}
            >
              {useCase.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section
        id="examples"
        eyebrow="Examples"
        title="Runnable, in the repository."
        lead="Both point at a local MinIO by default, so the real code path runs on your laptop with nothing to sign up for."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {examples.map((example) => (
            <CardLink
              key={example.slug}
              href={example.source}
              title={example.title}
              meta={example.stack.join(' · ')}
              external
            >
              {example.summary}
            </CardLink>
          ))}
        </div>
        <div className="mt-6 text-sm">
          <TextLink href="/examples">All examples and guides</TextLink>
        </div>
      </Section>

      <Section
        id="compare"
        eyebrow="Compared"
        title="Why not croc, WeTransfer or a sync engine?"
        lead="Sometimes those are the right answer. The comparison pages say when, tool by tool."
      >
        <div className="flex flex-wrap gap-2">
          {[
            ['Magic Wormhole', 'magic-wormhole'],
            ['croc', 'croc'],
            ['WeTransfer', 'wetransfer'],
            ['PairDrop', 'pairdrop'],
            ['Dexie Cloud', 'dexie-cloud'],
            ['PowerSync', 'powersync'],
            ['ElectricSQL', 'electricsql'],
            ['PouchDB', 'pouchdb'],
            ['Firebase', 'firebase'],
            ['rclone', 'rclone'],
          ].map(([name, slug]) => (
            <ButtonLink key={slug} href={`/alternatives/${slug}`} variant="secondary">
              vs {name}
            </ButtonLink>
          ))}
          <ButtonLink href="/alternatives" variant="ghost">
            All comparisons
          </ButtonLink>
        </div>
      </Section>

      <Section id="faq" eyebrow="Questions" title="The ones that come up." className="bg-surface-muted/60">
        <Faq />
      </Section>

      <Cta />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          '@id': `${site.url}/#software`,
          name: site.name,
          url: site.url,
          description: site.description,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Node.js 20+, any browser',
          softwareVersion: '0.1',
          license: 'https://opensource.org/license/mit',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          downloadUrl: packages.s3nd.npm,
          installUrl: packages.s3nd.npm,
          softwareHelp: { '@type': 'CreativeWork', url: docs() },
          author: { '@id': `${site.url}/#organization` },
          sameAs: [repositoryUrl],
        }}
      />
    </>
  )
}
