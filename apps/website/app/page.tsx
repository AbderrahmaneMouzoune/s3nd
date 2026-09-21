import type { Metadata } from 'next'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { Faq } from '@/components/faq'
import { HeroBoard } from '@/components/hero-board'
import { JsonLd } from '@/components/json-ld'
import { SyncCodeDemo } from '@/components/sync-code-demo'
import { Ticker } from '@/components/ticker'
import { ButtonLink, Card, CardLink, Container, Eyebrow, Facts, Pill, Section, Stamp, TextLink } from '@/components/ui'
import { providers } from '@/lib/providers'
import { docs, packages, repositoryUrl, site } from '@/lib/site'
import { useCases } from '@/lib/use-cases'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const TICKER = [
  'No account',
  'No relay',
  'Nothing to deploy',
  'Your bucket',
  'AWS S3',
  'Cloudflare R2',
  'MinIO',
  'Scaleway',
  'Wasabi',
  'Expires on its own',
  '40-bit codes',
  'CLI · Library · React',
  'MIT',
]

const CLI_SAMPLE = `$ s3nd put ./build.tar.gz
build.tar.gz · 41 MB · expires in 1 day
K7QP2M4X

$ tar cz ./photos | s3nd put - --name photos.tar.gz
$ CODE=$(s3nd put ./report.pdf)     # code on stdout, the rest on stderr

# any other machine
$ s3nd get k7qp-2m4x
Wrote ./build.tar.gz · 41 MB`

const APP_SAMPLE = `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from 's3nd'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'drop' }),
  expiresIn: 24 * 3600,
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})

// In the browser, with @s3nd/react:
const { sendFile, transfer } = useSendTransfer()
await sendFile(file) // → transfer.code`

const CURL_SAMPLE = `$ curl -X POST https://drop.example.com/api/transfers \\
    -H "Authorization: Bearer $TOKEN" \\
    -H "Content-Type: application/pdf" \\
    -H "X-S3nd-Filename: report.pdf" \\
    --data-binary @report.pdf
{ "code": "K7QP2M4X", "kind": "file", "size": 290816, "expiresAt": "…" }

$ curl -LOJ -H "Authorization: Bearer $TOKEN" \\
    https://drop.example.com/api/transfers/K7QP2M4X/raw`

const SNAPSHOT_SAMPLE = `import { createBucket } from 's3nd'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

// On the old phone: hand the user a code.
const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

// On the new phone: they type it in.
const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data // → ready to write back into IndexedDB`

const MECHANISM = [
  {
    stamp: 'put',
    title: 'Drop it in your bucket.',
    body: 'A file, a folder as an archive, whatever comes down stdin. One PutObject into a bucket you own, under a fresh code, with an expiry stamped on the object. The code is printed and nothing else, so it composes.',
    href: docs('/cli'),
    label: 'The CLI reference',
  },
  {
    stamp: 'code',
    title: 'Read it over the phone.',
    body: 'Eight characters, forty bits, no I, L, O or U. Write it on a sticky note, type it in the wrong case with a dash in the middle: it still resolves. The server picks it and claims it with a conditional write.',
    href: docs('/sync-codes'),
    label: 'Sync codes',
  },
  {
    stamp: 'get',
    title: 'Pick it up anywhere.',
    body: 'Any machine with the code and access to the bucket, or a token for your server, gets the file back. Until the transfer expires, or you burn it. The other machine did not have to be on when you sent.',
    href: docs('/no-server'),
    label: 'Without a server',
  },
]

export default function HomePage() {
  const files = useCases.filter((useCase) => useCase.kind === 'files')
  const appState = useCases.filter((useCase) => useCase.kind === 'app-state')

  return (
    <>
      <header className="relative overflow-hidden">
        <div className="grid-paper absolute inset-0 -z-10" aria-hidden="true" />
        <Container className="pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <Eyebrow>Your bucket · A code · No account</Eyebrow>
              <h1 className="mt-5 text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance uppercase sm:text-7xl lg:text-[5.4rem]">
                Send anything with a code.
              </h1>
              <p className="text-ink-muted mt-7 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl">
                s3nd drops a file into an S3 bucket you own and hands you eight characters. Whoever has the code picks
                it up, from any machine, until it expires. From a terminal, from your own app, or from curl.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/cli">Install the CLI</ButtonLink>
                <ButtonLink href="/how-it-works" variant="secondary">
                  How it works
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="ghost" external>
                  GitHub
                </ButtonLink>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Command>npm i -g @s3nd/cli</Command>
                <Command>s3nd put ./anything.zip</Command>
              </div>
            </div>
            <HeroBoard />
          </div>
        </Container>
      </header>

      <Ticker items={TICKER} />

      <Section
        id="how"
        index="01"
        eyebrow="Put. Code. Get."
        title="The whole product is three commands."
        lead="The bytes go from one machine to your bucket and from your bucket to the other. Nothing streams through anyone else's server, and nobody signs up for anything."
      >
        <ol className="grid gap-4 lg:grid-cols-3">
          {MECHANISM.map((step) => (
            <li key={step.stamp} className="border-line bg-surface flex flex-col rounded-lg border p-6">
              <Stamp tone="accent">{step.stamp}</Stamp>
              <h3 className="mt-4 text-2xl font-bold tracking-tight">{step.title}</h3>
              <p className="text-ink-muted mt-3 flex-1 text-sm leading-relaxed">{step.body}</p>
              <div className="mt-5 text-sm">
                <TextLink href={step.href} external>
                  {step.label}
                </TextLink>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="ways-in"
        index="02"
        eyebrow="Three ways to send"
        title="A terminal, your own app, or anything that speaks HTTP."
        lead="One primitive under all three. The server-side package holds the keys; everything that runs in a browser depends on fetch and nothing else."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">From a terminal</h3>
                <Pill>{packages.cli.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Straight to the bucket with the credentials on that machine, nothing deployed. Or through your server
                with a token and <code className="font-mono">--remote</code>. A doctor command proves the setup works.
              </p>
            </div>
            <CodeBlock code={CLI_SAMPLE} lang="sh" className="flex-1" />
            <TextLink href="/cli">Every command</TextLink>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">Inside your app</h3>
                <Pill>{packages.s3nd.name}</Pill>
                <Pill>{packages.react.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                One route file serves the four-route protocol on your domain, with your auth. React hooks send a file,
                read a code back, and repair what the user typed.
              </p>
            </div>
            <CodeBlock code={APP_SAMPLE} lang="ts" className="flex-1" />
            <div className="flex flex-wrap gap-4">
              <TextLink href="/library">The library</TextLink>
              <TextLink href="/react">The hooks</TextLink>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">Anything with HTTP</h3>
                <Pill>{packages.protocol.name}</Pill>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                The protocol is four routes and one error format, written down. curl works, a Go client works, and a
                server in Rails works with every s3nd client.
              </p>
            </div>
            <CodeBlock code={CURL_SAMPLE} lang="sh" className="flex-1" />
            <TextLink href={docs('/protocol')} external>
              The protocol spec
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        id="bucket"
        index="03"
        eyebrow="Your bucket"
        title="Nobody in the middle."
        lead="Every other tool in this space either runs a relay, hosts your files, or asks for an account. s3nd is a thin layer over object storage you already pay for."
      >
        <Facts
          items={[
            {
              label: 'No relay',
              value:
                'Machine to bucket, bucket to machine. Your provider’s durability, your provider’s bill, and on R2 no egress fee at all.',
            },
            {
              label: 'No account',
              value:
                'A code is the whole handshake. On your own server, a bearer token per person is the most identity s3nd ever asks for.',
            },
            {
              label: 'Nothing to deploy',
              value:
                'The CLI talks to the bucket directly. A server enters the picture only when a browser has to, and it is one route file.',
            },
            {
              label: 'Expires on its own',
              value:
                'Every transfer carries an expiry, checked on every read. A lifecycle rule deletes the object, and s3nd doctor checks you have one.',
            },
          ]}
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {providers.map((provider) => (
            <CardLink key={provider.slug} href={`/providers/${provider.slug}`} title={provider.name}>
              {provider.tagline}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section
        id="codes"
        index="04"
        eyebrow="Sync codes"
        title="A code you can read over the phone."
        lead="The whole experience of a transfer is someone reading a code off one screen and typing it into another. Everything about the code is shaped by that."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo />
          <div className="space-y-5 text-base leading-relaxed lg:pt-2">
            <p>
              The default is eight characters of Crockford base32: no <code className="font-mono">I</code>,{' '}
              <code className="font-mono">L</code>, <code className="font-mono">O</code> or{' '}
              <code className="font-mono">U</code>, so a code survives paper, a phone keyboard and a phone call.
              Generation and normalization live on the same object, so the two sides can never disagree about the
              alphabet.
            </p>
            <p>
              Four digits for a phone-first app, twelve alphanumerics for a long-lived drop: both halves are
              configurable, and <code className="font-mono">entropyBits</code> tells you what the code is worth guessing
              against so the rate limit can do the rest.
            </p>
            <p>
              A code is a bearer token. Give it a short expiry, rate-limit the lookup route, and for sensitive payloads
              encrypt before anything reaches the bucket.
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
        id="app-state"
        index="05"
        eyebrow="Also"
        title="Not only files. An app's whole state."
        lead="A transfer can be structured data as well as bytes. That is how a local-first app with no accounts carries its database to the user's new phone: the browser exports IndexedDB, the server snapshots it, the other phone types the code."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SNAPSHOT_SAMPLE} lang="ts" />
          <div className="grid gap-4">
            <Card>
              <h3 className="font-bold tracking-tight">A self-describing envelope</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Your app name, your schema version, the device, an expiry, then the data, gzipped. A restore refuses a
                snapshot from a newer build instead of misreading it, and shows when and where it was made before
                replacing anything.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold tracking-tight">Two devices, one backup, no silent loss</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Pass the ETag you last read as <code className="font-mono">ifMatch</code> and a device that writes after
                someone else did gets an error instead of overwriting their work.
              </p>
            </Card>
            <div className="flex flex-wrap gap-4 text-sm">
              <TextLink href="/use-cases/new-device">Move an app to a new device</TextLink>
              <TextLink href="/react">The React hooks</TextLink>
              <TextLink href={docs('/snapshots')} external>
                Snapshots
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section id="use-cases" index="06" eyebrow="Use cases" title="What people move with it.">
        <div className="grid gap-10">
          <div>
            <h3 className="text-ink-faint mb-4 font-mono text-[10px] tracking-[0.22em] uppercase">Files</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((useCase) => (
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
          </div>
          <div>
            <h3 className="text-ink-faint mb-4 font-mono text-[10px] tracking-[0.22em] uppercase">App state</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {appState.map((useCase) => (
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
          </div>
        </div>
      </Section>

      <Section
        id="compare"
        index="07"
        eyebrow="Compared"
        title="Why not croc, WeTransfer or rclone?"
        lead="Sometimes they are the right answer. The comparison pages say when, tool by tool, in the other tool's own terms."
      >
        <div className="flex flex-wrap gap-2">
          {[
            ['croc', 'croc'],
            ['Magic Wormhole', 'magic-wormhole'],
            ['WeTransfer', 'wetransfer'],
            ['transfer.sh', 'transfer-sh'],
            ['PairDrop', 'pairdrop'],
            ['Firefox Send', 'firefox-send'],
            ['rclone', 'rclone'],
            ['Dexie Cloud', 'dexie-cloud'],
            ['PowerSync', 'powersync'],
            ['Firebase', 'firebase'],
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

      <Section id="faq" index="08" eyebrow="Questions" title="The ones that come up.">
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
