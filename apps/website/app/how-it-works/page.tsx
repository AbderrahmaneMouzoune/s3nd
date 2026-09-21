import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { TransferDiagram } from '@/components/transfer-diagram'
import { ButtonLink, Card, Facts, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'How it works',
  description:
    'Snapshots, sync codes, the four-route transfer protocol and the split between the server-side package and the browser packages. How s3nd moves local-first data through your own bucket.',
  path: '/how-it-works',
  keywords: ['how s3nd works', 'indexeddb snapshot s3', 'transfer protocol sync code'],
})

const ENVELOPE = `{
  "s3nd": 1,              // envelope format, not your data's
  "app": "notes",
  "version": 3,           // your schema version
  "device": "Pixel 8",
  "createdAt": "2026-08-27T12:00:00.000Z",
  "expiresAt": "2026-08-27T13:00:00.000Z",
  "data": { /* whatever you passed */ }
}`

const ROUTES = `POST   /                # create a transfer, get the code back
GET    /:code           # metadata, with the state inline for a snapshot
GET    /:code/raw       # the bytes, or a 302 to a presigned URL
DELETE /:code           # burn it`

const CLIENT = `import { createTransferClient } from '@s3nd/protocol'

const transfers = createTransferClient({ baseUrl: '/api/transfers' })

const { code } = await transfers.createSnapshot({ data: state, version: 3 })
const incoming = await transfers.read(typed) // null when unknown or expired
await transfers.remove(code)`

const CONDITIONAL = `const current = await store.getSnapshot(\`user-\${userId}\`)

try {
  await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })
} catch (error) {
  if (isS3ndError(error) && error.code === 'PRECONDITION_FAILED') {
    // Another device won. Read again, merge again.
  }
  throw error
}`

const PACKAGES = [
  {
    name: packages.protocol.name,
    role: 'The contract',
    deps: 'nanoid',
    body: 'The wire format, a fetch-based client, and the sync codes. Nothing here imports a storage client, which is what lets a browser share it.',
  },
  {
    name: packages.s3nd.name,
    role: 'The primitive',
    deps: 'aws-sdk, protocol',
    body: 'Snapshots, files, conditional writes and the transfer handler. The only package that holds credentials, so the only one that runs on a server.',
  },
  {
    name: packages.react.name,
    role: 'The hooks',
    deps: 'protocol, react (peer)',
    body: 'Send, receive, and a code input. Depends on the protocol and never on S3, so no path from your bundle reaches the AWS SDK.',
  },
  {
    name: packages.cli.name,
    role: 'The binary',
    deps: 's3nd',
    body: 'put, get, rm, doctor, init and config. One implementation, the protocol client, wired either to fetch or straight into the handler in-process.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'How it works', href: '/how-it-works' }]}
        eyebrow="Architecture"
        title="A snapshot in your bucket, a code in someone's hand."
        lead="s3nd is deliberately small. This page is the whole of it: what a snapshot is, what a code is, the protocol between a server and its clients, and why the packages are split the way they are."
        actions={
          <>
            <ButtonLink href={docs('/quick-start')} external>
              Quick start
            </ButtonLink>
            <ButtonLink href={docs('/protocol')} variant="secondary" external>
              The protocol spec
            </ButtonLink>
          </>
        }
        aside={<TransferDiagram />}
      />

      <Section
        eyebrow="1 · Snapshots"
        title="An envelope that says what it is."
        lead="putSnapshot() wraps your value in a self-describing envelope, serializes it as JSON and gzips it. That envelope is what makes a restore safe rather than hopeful."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={ENVELOPE} lang="jsonc" title="what lands in the bucket" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <strong>Expiry is enforced on read.</strong> A snapshot past its{' '}
              <code className="font-mono">expiresAt</code> is never handed over, even if the object is still sitting in
              the bucket. Deleting the object is a lifecycle rule&apos;s job, and{' '}
              <code className="font-mono">s3nd doctor</code> checks you have one.
            </p>
            <p>
              <strong>Schema versions travel with the data.</strong> Pass <code className="font-mono">maxVersion</code>{' '}
              on read and a snapshot from a newer build throws <code className="font-mono">SNAPSHOT_TOO_NEW</code>{' '}
              instead of landing in an app that will misread it.
            </p>
            <p>
              <strong>Compression is not a detail.</strong> A database dump is the same keys repeated over every record,
              the best case for gzip. Five to ten times smaller is routine, and that is the headroom against your
              runtime&apos;s request limit.
            </p>
            <TextLink href={docs('/snapshots')} external>
              Snapshots, in full
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="2 · Sync codes"
        title="Forty bits that survive a phone call."
        lead="A code is the whole user experience of moving between devices. It appears on the old phone and the user types it into the new one."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h3 className="font-semibold tracking-tight">Crockford base32</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              No <code className="font-mono">I</code>, <code className="font-mono">L</code>,{' '}
              <code className="font-mono">O</code> or <code className="font-mono">U</code>. The first three are what
              people misread; dropping the fourth keeps a random code from spelling something unfortunate.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">Normalized on the way back</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Separators dropped, case folded, and <code className="font-mono">O</code> read as zero only when there is
              no letter O to confuse it with. The repair happens in the browser, before any request.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">Claimed with a conditional write</h3>
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
        eyebrow="3 · The protocol"
        title="Four routes, one error format. Written down."
        lead="A browser cannot hold your S3 credentials, so a transfer always has a server in the middle. The shape of that middle is a protocol, not whatever the handler happens to do."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-6">
            <CodeBlock code={ROUTES} lang="text" title="relative to wherever you mounted it" />
            <CodeBlock code={CLIENT} lang="ts" title="the client, in a browser" />
          </div>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              A client works against any server that answers these routes, not only against{' '}
              <code className="font-mono">createTransferHandler()</code>. A server in Go or Rails works with every s3nd
              client. And the CLI pointed at <code className="font-mono">--remote</code> cannot tell which it is talking
              to.
            </p>
            <p>
              Every non-2xx answer carries <code className="font-mono">{'{ error: { code, message } }'}</code>, and
              clients throw a <code className="font-mono">TransferError</code> with that code on it. Branch on the code,
              never on the message.
            </p>
            <p>
              <code className="font-mono">NOT_FOUND</code> deliberately covers an expired code as well as one that never
              existed. Telling them apart would let someone probe which codes have been used.
            </p>
            <TextLink href={docs('/protocol')} external>
              The transfer protocol, route by route
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="4 · Two writers"
        title="When both devices write, last-write-wins is data loss."
        lead="A one-shot transfer has a single writer. A per-account backup has two, and S3's default silently keeps whichever arrived last."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Pass the ETag you last read as <code className="font-mono">ifMatch</code>. A device that writes after
              someone else did gets <code className="font-mono">PRECONDITION_FAILED</code> instead of discarding their
              work, and your app reads again and merges.
            </p>
            <p>
              <code className="font-mono">ifAbsent</code> is the other half: write only if nothing is stored yet, which
              is how a fresh code is claimed. Both are plain S3 conditional headers, so they work on every provider that
              implements them, and the node example is where you find out whether yours does.
            </p>
            <TextLink href={docs('/two-devices')} external>
              Two devices, one snapshot
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="5 · The packages"
        title="One constraint decides the split."
        lead="A browser must never end up with a storage client in its dependency tree. The protocol package is what both halves share, which is why it exists at all."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PACKAGES.map((entry) => (
            <Card key={entry.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-mono text-base font-semibold">{entry.name}</h3>
                <span className="text-ink-faint font-mono text-[11px]">{entry.deps}</span>
              </div>
              <div className="text-accent mt-1 font-mono text-[11px] tracking-wider uppercase">{entry.role}</div>
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
