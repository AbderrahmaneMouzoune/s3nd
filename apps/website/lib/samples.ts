/**
 * Every code sample the pages show, in one place, so the Markdown versions
 * of the pages (`lib/markdown.ts`) carry exactly the same code.
 */
export const samples = {
  home: {
    CLI_SAMPLE: `$ s3nd put ./build.tar.gz
build.tar.gz · 41 MB · expires in 1 day
K7QP2M4X

$ tar cz ./photos | s3nd put - --name photos.tar.gz
$ CODE=$(s3nd put ./report.pdf)     # code on stdout, the rest on stderr

# any other machine
$ s3nd get k7qp-2m4x
Wrote ./build.tar.gz · 41 MB`,
    APP_SAMPLE: `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from '@s3nd/core'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'drop' }),
  expiresIn: 24 * 3600,
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})

// In the browser, with @s3nd/react:
const { sendFile, transfer } = useSendTransfer()
await sendFile(file) // → transfer.code`,
    CURL_SAMPLE: `$ curl -X POST https://drop.example.com/api/transfers \\
    -H "Authorization: Bearer $TOKEN" \\
    -H "Content-Type: application/pdf" \\
    -H "X-S3nd-Filename: report.pdf" \\
    --data-binary @report.pdf
{ "code": "K7QP2M4X", "kind": "file", "size": 290816, "expiresAt": "…" }

$ curl -LOJ -H "Authorization: Bearer $TOKEN" \\
    https://drop.example.com/api/transfers/K7QP2M4X/raw`,
    SNAPSHOT_SAMPLE: `import { createBucket } from '@s3nd/core'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

// On the old phone: hand the user a code.
const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

// On the new phone: they type it in.
const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data // → ready to write back into IndexedDB`,
  },
  howItWorks: {
    FILE_OBJECT: `drop/K7QP2M4X
  Content-Type:         application/pdf
  Content-Disposition:  attachment; filename="report.pdf"
  x-amz-meta-s3nd-kind:        file
  x-amz-meta-s3nd-expires-at:  2026-08-27T13:00:00.000Z
  Body:                 the bytes, untouched`,
    SNAPSHOT_ENVELOPE: `{
  "s3nd": 1,              // envelope format, not your data's
  "app": "notes",
  "version": 3,           // your schema version
  "device": "Pixel 8",
  "createdAt": "2026-08-27T12:00:00.000Z",
  "expiresAt": "2026-08-27T13:00:00.000Z",
  "data": { /* whatever you passed */ }
}                          // gzipped, typically 5–10× smaller`,
    ROUTES: `POST   /                # create a transfer, get the code back
GET    /:code           # metadata; the state inline for a snapshot
GET    /:code/raw       # the bytes, or a 302 to a presigned URL
DELETE /:code           # burn it

# every error, same shape
{ "error": { "code": "NOT_FOUND", "message": "Unknown or expired code." } }`,
    CLIENT: `import { createTransferClient } from '@s3nd/protocol'

const transfers = createTransferClient({ baseUrl: '/api/transfers' })

const { code } = await transfers.createFile({ body: file, filename: file.name })
const meta = await transfers.read(typed)        // null when unknown or expired
const bytes = await transfers.readBytes(code)   // the file back
await transfers.remove(code)`,
    CONDITIONAL: `// Claim a fresh code: write only if nothing sits under it.
await store.putSnapshot(code, state, { ifAbsent: true })

// Rewrite a shared backup: fail if someone wrote since you read.
const current = await store.getSnapshot(\`user-\${userId}\`)
await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })
// → PRECONDITION_FAILED when another device won. Read again, merge again.`,
  },
  cli: {
    INIT: `$ s3nd init --provider r2 --bucket transfers
Wrote /home/you/transfers/s3nd.config.json

Put the three values in .env, and keep it out of git:
  R2_ACCOUNT_ID=…
  R2_ACCESS_KEY_ID=…
  R2_SECRET_ACCESS_KEY=…
The R2 API token needs Object Read & Write on this bucket, and nothing else.
Give the bucket a lifecycle rule that deletes objects under "transfers/" after a day or two.
Run \`s3nd doctor\` — it performs the operations s3nd needs and reports what happened.`,
    DOCTOR: `$ s3nd doctor
Using /home/you/transfers/s3nd.config.json
✓ Configuration: bucket "transfers", region "auto"
✓ Credentials: resolved, key ends in 1a2b
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no enabled expiration rule
  → Add an S3 lifecycle rule that expires objects under this bucket after a day or
    two. Without it, expired transfers stay stored and billed.

1 check(s) failed.`,
    PUT_GET: `$ s3nd put ./report.pdf
report.pdf · 284 kB · expires in 1 day
K7QP2M4X

$ CODE=$(s3nd put ./report.pdf)          # the code is stdout, the rest is stderr
$ tar cz ./project | s3nd put - --name project.tar.gz

# on the other machine
$ s3nd get K7QP2M4X
Wrote /home/you/report.pdf · 284 kB

$ s3nd get K7QP2M4X -o -  | less        # or to stdout
$ s3nd rm K7QP2M4X
Burned K7QP2M4X`,
    CONFIG_FILE: `{
  "envFile": ".env",
  "profiles": {
    "r2": {
      "bucket": "transfers",
      "region": "auto",
      "endpoint": "https://\${R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
      "expiresIn": "24h",
      "credentials": { "accessKeyId": "\${R2_ACCESS_KEY_ID}", "secretAccessKey": "\${R2_SECRET_ACCESS_KEY}" }
    },
    "local": { "bucket": "transfers", "endpoint": "http://localhost:9000" },
    "prod":  { "remote": "https://drop.example.com/api/transfers", "token": "\${S3ND_TOKEN}" }
  }
}`,
    PROFILES: `$ s3nd -p local doctor          # against a MinIO container, offline
$ s3nd -p r2 put ./report.pdf
$ s3nd -p prod put ./report.pdf # through your server, with a token

$ s3nd config                   # which value won, and where it came from
file         /home/you/transfers/s3nd.config.json (profile "r2")
mode         straight to S3
bucket       transfers                                 $S3ND_BUCKET
endpoint     https://8c4….r2.cloudflarestorage.com     s3nd.config.json (r2)
credentials  …1a2b                                     s3nd.config.json (r2)
expires in   1 day                                     s3nd.config.json (r2)`,
    REMOTE: `$ s3nd --remote https://drop.example.com/api/transfers --token "$TOKEN" put ./report.pdf
K7QP2M4X

$ s3nd doctor --remote https://drop.example.com/api/transfers --token "$TOKEN"
✓ Server: https://drop.example.com/api/transfers answered
✓ Create, read, delete: round-tripped code 8WTXQC8R`,
  },
  library: {
    HERO: `import { createBucket, createTransferHandler } from '@s3nd/core'

const store = createBucket({ bucket: 'drop' })

// A drop box on your own domain, in one route file.
export const { GET, POST, DELETE } = createTransferHandler({
  bucket: store,
  expiresIn: 24 * 3600,
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})`,
    FILES: `await store.upload(file)     // → { key, path, url?, size?, etag?, contentType }
await store.put(id, file)    // one file per identifier: create or replace
await store.get(id)          // → the file back, or null
await store.getUrl(id)       // → public or presigned URL
await store.delete(id)       // → void

store.client                 // the plain S3Client, for anything else`,
    HANDLER: `// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from '@s3nd/core'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'drop' }),
  expiresIn: 24 * 3600,
  raw: 'redirect', // downloads 302 to a presigned URL
  authorize: (request) => request.headers.get('authorization') === \`Bearer \${process.env.TOKEN}\`,
})`,
    HONO: `import { Hono } from 'hono'
import { createBucket, createTransferHandler } from '@s3nd/core'

const transfers = createTransferHandler({ bucket: createBucket(), basePath: '/api/transfers' })

const app = new Hono()
app.all('/api/transfers', (c) => transfers(c.req.raw))
app.all('/api/transfers/*', (c) => transfers(c.req.raw))`,
    BUN: `import { createBucket, createTransferHandler } from '@s3nd/core'

const transfers = createTransferHandler({ bucket: createBucket(), basePath: '/api/transfers' })

Bun.serve({
  fetch(request) {
    if (new URL(request.url).pathname.startsWith('/api/transfers')) return transfers(request)
    return new Response('Not found', { status: 404 })
  },
})`,
    SNAPSHOT: `const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600, ifAbsent: true })

const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data      // the state, or null when unknown or expired
snapshot?.createdAt // what to show before replacing anything
snapshot?.device`,
    CONDITIONAL: `// Claim a fresh code: write only if nothing is stored under it yet.
await store.put(code, file, { ifAbsent: true })

// Rewrite a shared object: fail if someone else wrote since you read.
const current = await store.getSnapshot(\`user-\${userId}\`)
await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })`,
    ERRORS: `import { isS3ndError } from '@s3nd/core'

try {
  await store.upload(body, { filename })
} catch (error) {
  if (isS3ndError(error) && error.code === 'FILE_TOO_LARGE') {
    return Response.json({ error: 'Too large to transfer in one piece' }, { status: 413 })
  }
  throw error
}`,
    CONFIG: `createBucket({
  bucket: 'drop',               // or S3ND_BUCKET / S3_BUCKET
  region: 'eu-west-3',          // or S3ND_REGION / AWS_REGION
  credentials: { … },           // omit for the AWS provider chain
  endpoint: 'https://…',        // R2, MinIO, Scaleway, Wasabi — or S3ND_ENDPOINT
  prefix: 'drop',               // internal namespace
  maxSize: 4 * 1024 * 1024,     // reject before any network call
  syncCode: { length: 8 },      // the shape of store.codes
})`,
  },
  react: {
    PROVIDER: `import { S3ndProvider } from '@s3nd/react'

export default function Providers({ children }) {
  return <S3ndProvider baseUrl="/api/transfers">{children}</S3ndProvider>
}`,
    SEND_FILE: `import { useSendTransfer } from '@s3nd/react'

function DropFile() {
  const { sendFile, transfer, isPending, error } = useSendTransfer()

  return (
    <>
      <input
        type="file"
        disabled={isPending}
        onChange={(event) => event.target.files?.[0] && sendFile(event.target.files[0])}
      />
      {transfer && <p>Read this out to them: {transfer.code}</p>}
      {error && <p>{error.message}</p>}
    </>
  )
}`,
    RECEIVE_FILE: `import { useReceiveTransfer, useSyncCodeInput } from '@s3nd/react'

function PickUp() {
  const input = useSyncCodeInput()
  const { load, loadBytes, transfer, notFound, isPending } = useReceiveTransfer()

  async function download() {
    const bytes = await loadBytes(input.code!)
    if (bytes) saveToDisk(new Blob([bytes]), transfer?.filename ?? 'file') // your helper
  }

  return (
    <>
      <input {...input.inputProps} placeholder="K7QP 2M4X" />
      <button onClick={() => load(input.code!)} disabled={!input.isComplete || isPending}>
        Look it up
      </button>
      {notFound && <p>Unknown or expired code.</p>}
      {transfer?.kind === 'file' && (
        <button onClick={download}>
          Download {transfer.filename} · {transfer.size} bytes
        </button>
      )}
    </>
  )
}`,
    SEND_STATE: `const { send, transfer } = useSendTransfer()

// Structured state goes as a snapshot, with your schema version.
await send(await exportDatabase(), { version: 3 })

// On the other device: load, show, then apply.
const { load, transfer, data } = useReceiveTransfer<DatabaseDump>()
await load(code)
// transfer.device, transfer.createdAt → show them
// importDatabase(data!) → only after the user confirms`,
  },
  examples: {
    MINIO: `docker run -p 9000:9000 -p 9001:9001 \\
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \\
  quay.io/minio/minio server /data --console-address ":9001"`,
    OUTPUT: `code      ZZWMBSTD
stored    1826 bytes gzipped, from 22991 raw (12.6x)
typed     "zzwm-bstd" → ZZWMBSTD
restored  200 notes from node-script, written 2026-08-27T14:29:20.442Z
identical true
claim     rejected as PRECONDITION_FAILED
ifMatch   rejected as PRECONDITION_FAILED
burned    gone`,
  },
  providers: {
    ENDPOINT: `const store = createBucket({
  bucket: 'transfers',
  endpoint: 'https://…',   // set this, and two defaults follow:
  // region: 'auto'        // for providers that ignore the region
  // forcePathStyle: true  // https://endpoint/bucket/key
})`,
  },
  drop: {
    ENV: `S3ND_BUCKET=drop
S3ND_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3ND_REGION=auto
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…

# optional
DROP_PASSWORD=…              # ask for it before an upload
DROP_EXPIRES_IN=86400        # the default lifetime, in seconds
DROP_MAX_EXPIRES_IN=604800   # the longest a sender may choose
DROP_MAX_SIZE_MB=4           # under Vercel's 4.5 MB request limit
DROP_PREVIEW=true            # show what is behind a code before downloading`,
  },
} as const
