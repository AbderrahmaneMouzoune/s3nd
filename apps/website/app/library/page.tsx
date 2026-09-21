import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'The library',
  description:
    'The s3nd Node package: a file API over your bucket, a transfer handler that is one route file, snapshots with a self-describing envelope, conditional writes and stable error codes. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.',
  path: '/library',
  keywords: ['s3nd npm', 's3 upload library typescript', 'next.js file drop route', 's3 transfer handler node'],
})

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

const ERROR_CODES: [string, string][] = [
  ['INVALID_SYNC_CODE', 'Empty, or characters outside the alphabet'],
  ['FILE_TOO_LARGE', 'Body above the configured maxSize'],
  ['PRECONDITION_FAILED', 'An ifMatch or ifAbsent write lost the race'],
  ['SNAPSHOT_TOO_NEW', 'Schema version above the maxVersion given'],
  ['INVALID_KEY / INVALID_BODY', 'A key or a body type the bucket cannot take'],
  ['UPLOAD_FAILED / GET_FAILED / …', 'S3 rejected the request; the original error is in cause'],
]

export default function LibraryPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'The library', href: '/library' }]}
        eyebrow={packages.s3nd.name}
        title="Files and snapshots, in your bucket."
        lead="A small file API over object storage, a transfer handler that is one route file, and snapshots for structured state. The only package that holds credentials, so the only one that runs on your server."
        actions={
          <>
            <ButtonLink href={docs('/server')} external>
              Set up a server
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
        index="01"
        eyebrow="The file API"
        title="Five verbs over your bucket."
        lead="Strings, buffers, Blobs and streams are all accepted. Keys round-trip: what upload() returns is what you hand back to get(), getUrl() and delete(). The configured prefix is an internal namespace."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={FILES} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              <code className="font-mono">getUrl()</code> returns a presigned URL by default, or an unsigned one when a{' '}
              <code className="font-mono">publicUrl</code> is configured, with a{' '}
              <code className="font-mono">download</code> option that sets the filename the browser saves.
            </p>
            <p>
              A stream needs a <code className="font-mono">contentLength</code>, because a single PutObject cannot use
              chunked encoding. Set <code className="font-mono">maxSize</code> and an oversized body is refused before
              anything reaches the network.
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
        index="02"
        eyebrow="The handler"
        title="A drop box on your domain, in one route file."
        lead="createTransferHandler() serves the four-route protocol: create, read, download, burn. It takes a Request and returns a Response, so it is a Next route, a Hono route, Bun.serve or a worker without an adapter."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <CodeBlock code={HANDLER} lang="ts" title="Next.js App Router" />
          <CodeBlock code={HONO} lang="ts" title="Hono" />
          <CodeBlock code={BUN} lang="ts" title="Bun.serve" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-base leading-relaxed">
          Every route is public unless you pass <code className="font-mono">authorize</code>: fine for a personal drop
          box behind a proxy, not fine for anything else. Return <code className="font-mono">false</code> for a plain
          401 or a <code className="font-mono">Response</code> to answer with your own. With{' '}
          <code className="font-mono">raw: &apos;redirect&apos;</code> a download answers 302 with a presigned URL, so
          the bytes never transit your server twice.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <TextLink href={docs('/server')} external>
            Setting up a server
          </TextLink>
          <TextLink href={docs('/protocol')} external>
            The transfer protocol
          </TextLink>
          <TextLink href="/use-cases/team-drop-box">A drop box for your team</TextLink>
        </div>
      </Section>

      <Section
        index="03"
        eyebrow="Snapshots"
        title="Structured state, with a restore that is safe rather than hopeful."
        lead="putSnapshot() wraps your value in an envelope with your app name, schema version, device and expiry, then gzips it. getSnapshot() reads the envelope back and refuses what it should."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SNAPSHOT} lang="ts" />
          <div className="grid gap-4">
            <Card>
              <h3 className="font-bold tracking-tight">null when expired</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                An expired snapshot is never handed over, even if the object is still in the bucket. The receiving
                device does not need to tell &quot;never existed&quot; from &quot;expired&quot;.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold tracking-tight">SNAPSHOT_TOO_NEW</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Pass <code className="font-mono">maxVersion</code> and a snapshot written by a newer build throws
                instead of landing in an app that will misread it.
              </p>
            </Card>
            <div className="text-sm">
              <TextLink href={docs('/snapshots')} external>
                Snapshots, in full
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="04"
        eyebrow="Conditional writes"
        title="No silent overwrite, on any provider that implements them."
        lead="Both options are plain S3 conditional headers, and both fail before anything is replaced."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONDITIONAL} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
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
        index="05"
        eyebrow="Errors"
        title="Everything throws a S3ndError with a stable code."
        lead="Failures that can be caught locally, a bad code, an oversized body, unserializable data, are raised before anything reaches the network."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={ERRORS} lang="ts" />
          <dl className="border-line divide-line divide-y rounded-lg border text-sm">
            {ERROR_CODES.map(([code, when]) => (
              <div key={code} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
                <dt className="text-accent font-mono text-xs leading-relaxed">{code}</dt>
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
        index="06"
        eyebrow="Configuration"
        title="Every option, and the environment variable behind it."
        lead="createBucket() with no arguments works once S3_BUCKET and the usual AWS variables are set. With an endpoint, region defaults to auto and path-style addressing turns on, which is what R2, MinIO and Scaleway expect."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={CONFIG} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              Through your server, a transfer is bound by your runtime&apos;s request limit: 4.5 MB on Vercel functions,
              6 MB on Lambda. Set <code className="font-mono">maxSize</code> just under it and an oversized upload costs
              a comparison instead of a truncated request.
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
                Limits
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
