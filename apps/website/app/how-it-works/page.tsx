import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { TransferDiagram } from '@/components/transfer-diagram'
import { ButtonLink, Card, Facts, Section, Stamp, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'How it works',
  description:
    'A transfer is an object in your bucket under an eight-character code, with an expiry checked on every read. Files, snapshots, the four-route protocol, conditional writes, and why the packages are split the way they are.',
  path: '/how-it-works',
  keywords: ['how s3nd works', 'file transfer code s3 bucket', 'transfer protocol sync code', 'indexeddb snapshot s3'],
})

const FILE_OBJECT = `drop/K7QP2M4X
  Content-Type:         application/pdf
  Content-Disposition:  attachment; filename="report.pdf"
  x-amz-meta-s3nd-kind:        file
  x-amz-meta-s3nd-expires-at:  2026-08-27T13:00:00.000Z
  Body:                 the bytes, untouched`

const SNAPSHOT_ENVELOPE = `{
  "s3nd": 1,              // envelope format, not your data's
  "app": "notes",
  "version": 3,           // your schema version
  "device": "Pixel 8",
  "createdAt": "2026-08-27T12:00:00.000Z",
  "expiresAt": "2026-08-27T13:00:00.000Z",
  "data": { /* whatever you passed */ }
}                          // gzipped, typically 5–10× smaller`

const ROUTES = `POST   /                # create a transfer, get the code back
GET    /:code           # metadata; the state inline for a snapshot
GET    /:code/raw       # the bytes, or a 302 to a presigned URL
DELETE /:code           # burn it

# every error, same shape
{ "error": { "code": "NOT_FOUND", "message": "Unknown or expired code." } }`

const CLIENT = `import { createTransferClient } from '@s3nd/protocol'

const transfers = createTransferClient({ baseUrl: '/api/transfers' })

const { code } = await transfers.createFile({ body: file, filename: file.name })
const meta = await transfers.read(typed)        // null when unknown or expired
const bytes = await transfers.readBytes(code)   // the file back
await transfers.remove(code)`

const CONDITIONAL = `// Claim a fresh code: write only if nothing sits under it.
await store.putSnapshot(code, state, { ifAbsent: true })

// Rewrite a shared backup: fail if someone wrote since you read.
const current = await store.getSnapshot(\`user-\${userId}\`)
await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })
// → PRECONDITION_FAILED when another device won. Read again, merge again.`

const PACKAGES = [
  {
    name: packages.cli.name,
    role: 'The binary',
    deps: 's3nd',
    body: 'put, get, rm, doctor, init and config. One implementation, the protocol client, wired either to fetch or straight into the handler in-process.',
  },
  {
    name: packages.s3nd.name,
    role: 'The primitive',
    deps: 'aws-sdk, protocol',
    body: 'Files, snapshots, conditional writes and the transfer handler. The only package that holds credentials, so the only one that runs on a server.',
  },
  {
    name: packages.protocol.name,
    role: 'The contract',
    deps: 'nanoid',
    body: 'The wire format, a fetch-based client, and the sync codes. Nothing here imports a storage client, which is what lets a browser share it.',
  },
  {
    name: packages.react.name,
    role: 'The hooks',
    deps: 'protocol, react (peer)',
    body: 'Send, receive, and a code input. Depends on the protocol and never on S3, so no path from your bundle reaches the AWS SDK.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'How it works', href: '/how-it-works' }]}
        eyebrow="Architecture"
        title="An object in your bucket, a code in someone's hand."
        lead="s3nd is deliberately small. This page is the whole of it: what a transfer is, what a code is, the protocol between a server and its clients, and why the packages are split the way they are."
        actions={
          <>
            <ButtonLink href="/cli">Install the CLI</ButtonLink>
            <ButtonLink href={docs('/protocol')} variant="secondary" external>
              The protocol spec
            </ButtonLink>
          </>
        }
        aside={<TransferDiagram />}
      />

      <Section
        index="01"
        eyebrow="A transfer"
        title="One object, one code, one expiry."
        lead="A file is stored as the bytes you gave, with the filename, the content type and the expiry in the object's metadata. Structured data is stored as a snapshot: a self-describing envelope, gzipped. Both sit under the code."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={FILE_OBJECT} lang="text" title="a file, as it lands in the bucket" />
          <CodeBlock code={SNAPSHOT_ENVELOPE} lang="jsonc" title="a snapshot, as it lands in the bucket" />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <Stamp tone="accent">expiry on read</Stamp>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              A transfer past its expiry is never handed over, even if the object is still sitting in the bucket. An
              expired code answers the same <code className="font-mono">NOT_FOUND</code> as one that never existed, so
              nobody can probe which codes were used.
            </p>
          </Card>
          <Card>
            <Stamp tone="accent">lifecycle rule</Stamp>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              Deleting the object is your bucket&apos;s job, through a lifecycle rule on the prefix.{' '}
              <code className="font-mono">s3nd doctor</code> checks you have one, because a bucket quietly filling up
              with expired transfers is the most common way this goes wrong.
            </p>
          </Card>
          <Card>
            <Stamp tone="accent">schema versions</Stamp>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              A snapshot carries your schema version. Pass <code className="font-mono">maxVersion</code> on read and a
              snapshot from a newer build throws <code className="font-mono">SNAPSHOT_TOO_NEW</code> instead of landing
              in an app that will misread it.
            </p>
          </Card>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <TextLink href={docs('/snapshots')} external>
            Snapshots
          </TextLink>
          <TextLink href={docs('/limits')} external>
            How big a transfer can be
          </TextLink>
        </div>
      </Section>

      <Section
        index="02"
        eyebrow="Sync codes"
        title="Forty bits that survive a phone call."
        lead="A code is the whole user experience of a transfer. It appears on one screen and someone types it into another, and everything about it is shaped by that."
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h3 className="font-bold tracking-tight">Crockford base32</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              No <code className="font-mono">I</code>, <code className="font-mono">L</code>,{' '}
              <code className="font-mono">O</code> or <code className="font-mono">U</code>. The first three are what
              people misread; dropping the fourth keeps a random code from spelling something unfortunate.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold tracking-tight">Normalized on the way back</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Separators dropped, case folded, and <code className="font-mono">O</code> read as zero only when there is
              no letter O to confuse it with. The repair happens in the browser, before any request.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold tracking-tight">Claimed with a conditional write</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              The server picks the code and writes with <code className="font-mono">ifAbsent</code>, so a collision
              fails loudly and retries with a fresh code instead of overwriting a stranger&apos;s transfer.
            </p>
          </Card>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <TextLink href={docs('/sync-codes')} external>
            Sync codes
          </TextLink>
          <TextLink href={docs('/code-configuration')} external>
            Length, alphabet, and what each costs
          </TextLink>
        </div>
      </Section>

      <Section
        index="03"
        eyebrow="The protocol"
        title="Four routes, one error format. Written down."
        lead="A browser cannot hold your S3 credentials, so when one takes part a server sits in the middle. The shape of that middle is a protocol, not whatever the handler happens to do."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-6">
            <CodeBlock code={ROUTES} lang="text" title="relative to wherever you mounted it" />
            <CodeBlock code={CLIENT} lang="ts" title="the client, in a browser" />
          </div>
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              A client works against any server that answers these routes, not only against{' '}
              <code className="font-mono">createTransferHandler()</code>. A server in Go or Rails works with every s3nd
              client. And the CLI pointed at <code className="font-mono">--remote</code> cannot tell which it is talking
              to, which is exactly why <code className="font-mono">s3nd put</code> works against your own deployment.
            </p>
            <p>
              What you send decides what a transfer holds: a JSON body is a snapshot, any other content type is a file
              with its name in <code className="font-mono">X-S3nd-Filename</code>. Clients throw a{' '}
              <code className="font-mono">TransferError</code> carrying the error code; branch on the code, never on the
              message.
            </p>
            <TextLink href={docs('/protocol')} external>
              The transfer protocol, route by route
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        index="04"
        eyebrow="Two writers"
        title="When two machines write, last-write-wins is data loss."
        lead="A one-shot transfer has a single writer. A per-user backup has two, and S3's default silently keeps whichever arrived last."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              Both options are plain S3 conditional headers. <code className="font-mono">ifAbsent</code> is how a fresh
              code is claimed; <code className="font-mono">ifMatch</code> is how a second device finds out it lost the
              race. They work on every provider that implements them, and the node example is where you find out whether
              yours does.
            </p>
            <TextLink href={docs('/two-devices')} external>
              Two devices, one snapshot
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        index="05"
        eyebrow="The packages"
        title="One constraint decides the split."
        lead="A browser must never end up with a storage client in its dependency tree. The protocol package is what both halves share, which is why it exists at all."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PACKAGES.map((entry) => (
            <Card key={entry.name}>
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
          <Facts
            items={[
              { label: 'Server runtime', value: 'Node 20 or later, what the AWS SDK v3 requires' },
              { label: 'Handler', value: 'Request in, Response out: Next.js, Hono, Bun.serve, Deno, workers' },
              { label: 'Browser packages', value: 'fetch and nothing else: browser, worker, React Native, Deno' },
              { label: 'Tests', value: 'Offline, against an in-memory S3 that honours conditional headers' },
            ]}
          />
        </div>
      </Section>

      <Cta />
    </>
  )
}
