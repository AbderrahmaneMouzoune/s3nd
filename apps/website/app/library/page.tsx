import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'The library',
  description:
    'The s3nd Node package: snapshots with a self-describing envelope, a transfer handler that is one route file, conditional writes, a file API and stable error codes. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.',
  path: '/library',
  keywords: ['s3nd npm', 'indexeddb to s3 nodejs', 's3 snapshot library typescript', 'next.js s3 transfer handler'],
})

const HERO = `import { createBucket } from 's3nd'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data`

const HANDLER = `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from 's3nd'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'my-bucket' }),
  app: 'notes',
  expiresIn: 3600,
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

const CONDITIONAL = `// Claim a fresh code: write only if nothing is stored under it yet.
await store.putSnapshot(code, state, { ifAbsent: true })

// Rewrite a shared backup: fail if someone else wrote since you read.
const current = await store.getSnapshot(\`user-\${userId}\`)
await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })`

const FILES = `await store.upload(file)     // → { key, path, url?, size?, etag?, contentType }
await store.put(id, file)    // one file per identifier: create or replace
await store.get(id)          // → the file back, or null
await store.getUrl(id)       // → public or presigned URL
await store.delete(id)       // → void

store.client                 // the plain S3Client, for anything else`

const ERRORS = `import { isS3ndError } from 's3nd'

try {
  await store.putSnapshot(code, state)
} catch (error) {
  if (isS3ndError(error) && error.code === 'FILE_TOO_LARGE') {
    return Response.json({ error: 'Too large to transfer in one piece' }, { status: 413 })
  }
  throw error
}`

const CONFIG = `createBucket({
  bucket: 'my-bucket',          // or S3ND_BUCKET / S3_BUCKET
  region: 'eu-west-3',          // or S3ND_REGION / AWS_REGION
  credentials: { … },           // omit for the AWS provider chain
  endpoint: 'https://…',        // R2, MinIO, Scaleway, Wasabi — or S3ND_ENDPOINT
  prefix: 'snapshots',          // internal namespace
  maxSize: 4 * 1024 * 1024,     // reject before any network call
  syncCode: { length: 8 },      // the shape of store.codes
})`

const ERROR_CODES: [string, string][] = [
  ['INVALID_SYNC_CODE', 'Empty, or characters outside the alphabet'],
  ['SNAPSHOT_TOO_NEW', 'Schema version above the maxVersion given'],
  ['PRECONDITION_FAILED', 'An ifMatch or ifAbsent write lost the race'],
  ['FILE_TOO_LARGE', 'Body above the configured maxSize'],
  ['INVALID_SNAPSHOT', 'Not JSON-representable, or not a snapshot'],
  ['UPLOAD_FAILED / GET_FAILED / …', 'S3 rejected the request; the original error is in cause'],
]

export default function LibraryPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'The library', href: '/library' }]}
        eyebrow={packages.s3nd.name}
        title="The server-side primitive."
        lead="Snapshots in a self-describing envelope, a transfer handler that is one route file, conditional writes, and the file API underneath. The only package that holds credentials, so the only one that runs on your server."
        actions={
          <>
            <ButtonLink href={docs('/quick-start')} external>
              Quick start
            </ButtonLink>
            <ButtonLink href={docs('/api')} variant="secondary" external>
              API reference
            </ButtonLink>
            <ButtonLink href={packages.s3nd.npm} variant="ghost" external>
              npm
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

      <Section
        eyebrow="Snapshots"
        title="A restore that is safe rather than hopeful."
        lead="putSnapshot() wraps your value in an envelope with your app name, schema version, device and expiry, then gzips it. getSnapshot() reads the envelope back and refuses what it should."
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h3 className="font-semibold tracking-tight">null when expired</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              An expired snapshot is never handed over, even if the object is still in the bucket. The receiving device
              does not need to tell &quot;never existed&quot; from &quot;expired&quot;.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">SNAPSHOT_TOO_NEW</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Pass <code className="font-mono">maxVersion</code> and a snapshot written by a newer build throws instead
              of landing in an app that will misread it.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">createdAt, device, etag</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              What you need to show the user what they are about to restore, and the ETag you need for a conditional
              write later.
            </p>
          </Card>
        </div>
        <div className="mt-6 text-sm">
          <TextLink href={docs('/snapshots')} external>
            Snapshots, in full
          </TextLink>
        </div>
      </Section>

      <Section
        eyebrow="The handler"
        title="The routes, without writing them."
        lead="createTransferHandler() serves the transfer protocol: create, read, burn. It takes a Request and returns a Response, so it is a Next route, a Hono route, Bun.serve or a worker without an adapter."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <CodeBlock code={HANDLER} lang="ts" title="Next.js App Router" />
          <CodeBlock code={HONO} lang="ts" title="Hono" />
          <CodeBlock code={BUN} lang="ts" title="Bun.serve" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          Every route is public unless you pass <code className="font-mono">authorize</code>: fine for a personal drop
          box behind a proxy, not fine for anything else. Return <code className="font-mono">false</code> for a plain
          401 or a <code className="font-mono">Response</code> to answer with your own. Writing the routes by hand stays
          reasonable when you want different shapes; the handler is built on the same public methods.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <TextLink href={docs('/server')} external>
            Setting up a server
          </TextLink>
          <TextLink href={docs('/protocol')} external>
            The transfer protocol
          </TextLink>
        </div>
      </Section>

      <Section
        eyebrow="Conditional writes"
        title="Two devices, one snapshot, no silent loss."
        lead="Both options are plain S3 conditional headers, and both fail before anything is overwritten."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <code className="font-mono">ifAbsent</code> is how a freshly generated code is claimed without a chance of
              trampling one already in use. The handler retries with a fresh code on the rare collision.
            </p>
            <p>
              <code className="font-mono">ifMatch</code> is how a second device finds out it lost the race. It gets{' '}
              <code className="font-mono">PRECONDITION_FAILED</code>, reads again, and merges, which is application code
              because only your app knows what a merge means.
            </p>
            <TextLink href={docs('/two-devices')} external>
              Two devices, one snapshot
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="The file API"
        title="Underneath the snapshots, and still yours."
        lead="Snapshots are built on a small set of file primitives that stay available for everything that is not a snapshot: an attachment, an exported PDF, an avatar."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={FILES} lang="ts" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Keys round-trip: what <code className="font-mono">upload()</code> returns is what you hand back to{' '}
              <code className="font-mono">get()</code>, <code className="font-mono">getUrl()</code> and{' '}
              <code className="font-mono">delete()</code>. The configured prefix is an internal namespace.
            </p>
            <p>
              Strings, buffers, Blobs and streams are all accepted. A stream needs a{' '}
              <code className="font-mono">contentLength</code>, because a single PutObject cannot use chunked encoding.
            </p>
            <p>
              Anything the package does not wrap is one command away through{' '}
              <code className="font-mono">store.client</code>, the plain <code className="font-mono">S3Client</code>.
            </p>
            <TextLink href={docs('/api')} external>
              The API reference
            </TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Errors"
        title="Everything throws a S3ndError with a stable code."
        lead="Failures that can be caught locally, a bad code, an oversized body, unserializable data, are raised before anything reaches the network."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={ERRORS} lang="ts" />
          <dl className="border-line divide-line divide-y rounded-2xl border text-sm">
            {ERROR_CODES.map(([code, when]) => (
              <div key={code} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
                <dt className="font-mono text-xs leading-relaxed">{code}</dt>
                <dd className="text-ink-muted leading-relaxed">{when}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-6 text-sm">
          <TextLink href={docs('/errors')} external>
            Every error code
          </TextLink>
        </div>
      </Section>

      <Section
        eyebrow="Configuration"
        title="Every option, and the environment variable behind it."
        lead="createBucket() with no arguments works once S3_BUCKET and the usual AWS variables are set. With an endpoint, region defaults to auto and path-style addressing turns on, which is what R2, MinIO and Scaleway expect."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONFIG} lang="ts" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              A snapshot goes through your server, so your runtime&apos;s request limit is the ceiling: 4.5 MB on Vercel
              functions, 6 MB on Lambda. Set <code className="font-mono">maxSize</code> just under it and an oversized
              snapshot costs a comparison instead of a truncated request.
            </p>
            <p>
              <code className="font-mono">createBucket()</code> is cheap: the underlying client is built on the first
              request, so calling it at module scope is fine.
            </p>
            <div className="flex flex-wrap gap-4">
              <TextLink href={docs('/configuration')} external>
                Configuration
              </TextLink>
              <TextLink href={docs('/limits')} external>
                How big can a snapshot be
              </TextLink>
              <TextLink href="/providers">Providers</TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Cta />
    </>
  )
}
