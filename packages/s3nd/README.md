# @s3nd/core

[![npm](https://img.shields.io/npm/v/%40s3nd%2Fcore?color=ffb000&labelColor=111111&label=npm)](https://www.npmjs.com/package/@s3nd/core)
[![install size](https://img.shields.io/npm/unpacked-size/%40s3nd%2Fcore?color=111111&labelColor=111111&label=install%20size)](https://www.npmjs.com/package/@s3nd/core)
[![MIT](https://img.shields.io/badge/license-MIT-ffb000.svg)](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/packages/s3nd/LICENSE)
[![Docs](https://img.shields.io/badge/docs-doc.s3nd.sh-111111.svg)](https://doc.s3nd.sh)

<p align="center">
  <img src="https://raw.githubusercontent.com/AbderrahmaneMouzoune/s3nd/main/.github/demos/core.gif" alt="A terminal runs the round-trip example: a snapshot of 200 notes is stored under the code K7QP2M4X, read back through the sloppily typed k7qp-2m4x, both conditional writes are rejected with PRECONDITION_FAILED, and the code is burned." width="880">
</p>

Move a local-first app's data from one device to another, through your own bucket.

```ts
import { createBucket } from '@s3nd/core'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

// On the old device: hand the user a code.
const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

// On the new device: they type it in.
const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data // → the state, ready to write back into IndexedDB
```

Your app keeps everything in IndexedDB: fast, offline, private. Then the user opens it on their
phone and it is empty, because IndexedDB does not leave the browser it was written in. s3nd
is the small server-side piece that closes that gap: it snapshots the local state into a bucket
you control, under a code the user carries across.

Credentials stay on your server. The browser only ever talks to your own API, so there is no CORS
policy to write on the bucket and nothing to sign client-side. Works with AWS S3 and any
S3-compatible storage (Cloudflare R2, MinIO, Scaleway, Wasabi, Ceph).

The [documentation site](https://github.com/AbderrahmaneMouzoune/s3nd/tree/main/apps/docs)
covers the whole flow, and a
[runnable IndexedDB example](https://github.com/AbderrahmaneMouzoune/s3nd/tree/main/examples/indexeddb-sync)
lives in the same repository.

## Install

```sh
npm install @s3nd/core
```

Node 20 or later, which is what AWS SDK v3 requires. The package imports no `node:*` module, and
CI also runs the transfer handler on Bun and Deno; Cloudflare Workers should work with
`nodejs_compat` and explicit `credentials`. The Vercel Edge runtime is not supported: keep routes
that import `@s3nd/core` on `runtime = 'nodejs'`. `@aws-sdk/client-s3` and
`@aws-sdk/s3-request-presigner` come along as dependencies, so there is nothing else to install
and no peer dependency to satisfy.

## What a snapshot is

`putSnapshot()` wraps your value in a self-describing envelope, serializes it as JSON and gzips it:

```jsonc
{
  "s3nd": 1, // envelope format, not your data's
  "app": "notes",
  "version": 3, // your schema version
  "device": "Pixel 8",
  "createdAt": "2026-08-27T12:00:00.000Z",
  "expiresAt": "2026-08-27T13:00:00.000Z",
  "data": {/* whatever you passed */},
}
```

That envelope is what makes a restore safe rather than hopeful. `getSnapshot()` reads it back and:

- returns `null` when there is nothing stored, **or when the snapshot has expired**; an expired
  snapshot is never handed over, even if the object is still sitting in the bucket;
- throws `SNAPSHOT_TOO_NEW` when the snapshot's `version` is above the `maxVersion` this build
  understands, instead of feeding an old app data it will misread;
- gives you back `createdAt`, `device` and `etag`, which is what you need to show the user _what_
  they are about to restore.

Compression is on by default and is not a detail: an IndexedDB dump is repetitive JSON, so gzip
routinely cuts it by 5 to 10× in the bucket. `maxSize` measures those stored, gzipped bytes; the
request that carries a snapshot to your API is plain JSON, and your platform limits it before s3nd runs.

## The routes, without writing them

`createTransferHandler()` serves [the transfer protocol](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/apps/docs/content/docs/protocol.mdx):
create a transfer, read it back, burn it. It takes a `Request` and returns a `Response`, so it is a
Next route handler, a Hono route, `Bun.serve` or a worker without an adapter for any of them.

```ts
// app/api/transfers/[[...route]]/route.ts
import { createBucket, createTransferHandler } from '@s3nd/core'

export const { GET, POST, DELETE } = createTransferHandler({
  bucket: createBucket({ bucket: 'my-bucket' }),
  app: 'notes',
  expiresIn: 3600,
})
```

Every route is public unless you pass `authorize`: fine for a personal drop box behind a proxy,
not fine for anything else:

```ts
createTransferHandler({
  bucket,
  authorize: (request) => request.headers.get('authorization') === `Bearer ${process.env.TOKEN}`,
})
```

Past your runtime's request limit, `upload: 'presign'` (or `'both'`) has the client send a file
straight to the bucket through a signed URL, then checks it on `POST /:code/complete`. It needs a
CORS rule on the bucket for browsers, and a lifecycle rule on `pending/` for uploads nobody
completes. `store.presignUpload(key, { contentLength })` is the building block, if you write your
own routes.

Every failure answers JSON. One the protocol has no name for (a throwing `authorize`, a failed S3
call) answers `INTERNAL` with a generic message, so nothing about your bucket leaks; pass
`onError: (error, request) => …` to log the real error.

The browser half is a separate package, `@s3nd/protocol`, which has no runtime dependencies; no
path from it reaches the AWS SDK, so it bundles for a browser or React Native without
dragging a storage client along:

```ts
import { createTransferClient } from '@s3nd/protocol'

const transfers = createTransferClient({ baseUrl: '/api/transfers' })

const { code } = await transfers.createSnapshot({ data: state, version: 3 })
const incoming = await transfers.read(typed) // null when unknown or expired
```

In React, [`@s3nd/react`](https://www.npmjs.com/package/@s3nd/react) wraps that in
hooks: `useSendTransfer`, `useReceiveTransfer`, and an input that repairs the code as the user
types it.

Writing the routes by hand stays perfectly reasonable when you want different shapes or different
semantics: the handler is built on the same public methods you would call yourself, and
`store.codes`, `putSnapshot()` and `getSnapshot()` are unchanged.

## The CLI

[`@s3nd/cli`](https://www.npmjs.com/package/@s3nd/cli) is a separate package built on
this one, so nothing a command line needs ships to your server:

```sh
npx @s3nd/cli doctor
```

`doctor` performs the operations s3nd needs and reports what happened, including whether a
lifecycle rule will actually delete your expired transfers, which is the one thing nobody discovers
until a bill arrives. `put`, `get` and `rm` move files between machines with a code.

## Sync codes

`store.codes` pairs code generation with the normalization that reads codes back, so the two can
never disagree about the alphabet. Codes are drawn from `crypto.getRandomValues`, with no bias
toward any character.

The default is eight characters of
[Crockford base32](https://www.crockford.com/base32.html): no `I`, `L`, `O` or `U`, so a code
survives being read aloud, written on paper, or typed on a phone. Both halves are configurable:

```ts
import { createBucket, syncCodeAlphabets } from '@s3nd/core'

const store = createBucket({
  bucket: 'my-bucket',
  syncCode: { length: 4, alphabet: syncCodeAlphabets.digits },
})

store.codes.create() // "8143"
store.codes.entropyBits // 13.29, what it is worth guessing against
```

`normalize()` canonicalizes what someone typed: separators dropped, case folded when the alphabet
has a single case, and confusable characters repaired when the alphabet makes that unambiguous:
`O` reads as zero only when there is no letter `O` to confuse it with. Call it on user input before
you look anything up.

```ts
store.codes.normalize('k7-qp2m4x') // → "K7QP2M4X"
store.codes.normalize('OIL5ABCD') // → "0115ABCD"
```

`createSyncCodes()`, `createSyncCode()` and `normalizeSyncCode()` are exported for use outside a
store; prefer `store.codes` in application code, since configuring the shape in one place is what
keeps the two sides in agreement.

They are re-exported here from `@s3nd/protocol`, which owns them: a sync code _is_ part of
the contract between the two devices. Import them from there when you need them in a browser, so
the repair can happen as the user types, before any network call:

```ts
import { normalizeSyncCode } from '@s3nd/protocol'
```

**A sync code is a bearer token.** Anyone who has it can read that snapshot. Give it a short
`expiresIn` and rate-limit the lookup route; the shorter the code, the more that rate limit is
doing the work. If the data is sensitive, encrypt it in the browser before it ever reaches your
server: `putSnapshot()` stores whatever you hand it, ciphertext included.

Burning a code after a successful restore is a good habit: `store.deleteSnapshot(code)` is the
whole of it. To check a code without downloading the snapshot, `store.hasSnapshot(code)` answers
from a `HeadObject` and treats an expired snapshot as gone.

`expiresIn` is enforced on read; the object itself stays until a lifecycle rule removes it, and
lifecycle rules count in days. Scope one to the snapshot prefix:

```json
{
  "Rules": [
    {
      "ID": "expire-transfer-snapshots",
      "Status": "Enabled",
      "Filter": { "Prefix": "snapshots/" },
      "Expiration": { "Days": 1 }
    }
  ]
}
```

On R2: `npx wrangler r2 bucket lifecycle add my-bucket expire-transfer-snapshots snapshots/ --expire-days 1`.

## Two devices, one snapshot

For a shared key that both devices write to (a continuous backup rather than a one-shot
transfer), pass the ETag you last read as `ifMatch`. A device that writes after someone else did
gets `PRECONDITION_FAILED` instead of silently discarding their work:

```ts
const current = await store.getSnapshot(`user-${userId}`)

try {
  await store.putSnapshot(`user-${userId}`, merged, { ifMatch: current?.etag })
} catch (error) {
  if (isS3ndError(error) && error.code === 'PRECONDITION_FAILED') {
    // Another device won. Read again, merge again.
  }

  throw error
}
```

`ifAbsent: true` is the other half: write only if nothing is stored yet, which is how you claim a
freshly generated code without a chance of trampling one already in use.

## The file API underneath

Snapshots are built on a small set of file primitives, and they stay available for everything that
is not a snapshot, such as an attachment, an exported PDF or an avatar:

```ts
await store.upload(file) // → { key, path, url?, size?, etag?, contentType }
await store.put(id, file) // one file per identifier: create or replace
await store.get(id) // → the file back, or null
await store.head(id) // → size, type, ETag, metadata, without the body; or null
await store.exists(id) // → boolean
await store.getUrl(id) // → public or presigned URL
await store.copy(from, to) // → server-side, no bytes through your runtime
await store.move(from, to) // → copy, then delete the source
await store.delete(id) // → void

for await (const object of store.list({ prefix: 'snapshots' })) {
  // paginated ListObjectsV2, one page at a time
}
```

Keys round-trip: what `upload()` and `list()` return is what you hand back to `get()`, `getUrl()`
and `delete()`. The configured `prefix` is an internal namespace, and every method takes a
per-call `prefix` that overrides it. `list()` needs `s3:ListBucket` on the bucket, which nothing
else does.

Anything the package does not wrap is one command away through `store.client`, which is the plain
`S3Client`.

## Errors

Everything throws a `S3ndError` carrying a stable `code`, with the original error in `cause`:

| Code                                                            | When                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `INVALID_CONFIG`                                                | Missing bucket, `publicUrl` that is not an absolute URL, non-positive `maxSize`.                        |
| `INVALID_SNAPSHOT`                                              | Data JSON cannot represent, a stored object that is not a snapshot, or an envelope from a newer format. |
| `SNAPSHOT_TOO_NEW`                                              | The snapshot's schema version is above the `maxVersion` given.                                          |
| `PRECONDITION_FAILED`                                           | An `ifMatch` or `ifAbsent` write lost the race.                                                         |
| `INVALID_KEY`                                                   | Empty key, leading or trailing `/`, `..` segment, backslash, over 1024 bytes.                           |
| `INVALID_BODY`                                                  | Unsupported upload body type.                                                                           |
| `MISSING_CONTENT_LENGTH`                                        | No longer raised: a stream without `contentLength` goes through multipart.                              |
| `FILE_TOO_LARGE`                                                | Body above the configured `maxSize`, known upfront or counted while streaming.                          |
| `UPLOAD_FAILED` / `GET_FAILED` / `DELETE_FAILED` / `URL_FAILED` | S3 rejected the request.                                                                                |
| `LIST_FAILED` / `COPY_FAILED`                                   | S3 rejected a `list()` or `copy()`, or its arguments were invalid.                                      |

A typed code that cannot exist is the one exception: `store.codes.normalize()` throws a
`TransferError` with `INVALID_SYNC_CODE`, the protocol's own answer, which the handler sends as is.
`TransferError` and `isTransferError` are re-exported here, so a server imports from one package.
Both `isS3ndError` and `isTransferError` check a `Symbol.for('s3nd.error')` brand rather than
`instanceof`, so they hold when an application ends up with two copies of a package.

Failures that can be caught locally (a bad code, an oversized body, unserializable data) are
raised before anything reaches the network.

## Size, and where the ceiling is

A snapshot goes from the browser to your server, and only then to S3, so your runtime's request
limit applies: **6 MB** on synchronous Lambda, **4.5 MB** on Vercel serverless functions, **6 MB**
on Netlify, **1 MB** by default on Next.js Pages Router API routes. Gzip buys most apps an order of
magnitude of headroom, and `maxSize` lets you refuse an oversized snapshot before it costs you a
request.

Above that, split the snapshot per object store, or presign an upload so the browser talks to S3
directly.

Between your server and S3 there is no ceiling: above `multipartThreshold` (16 MiB), and for any
stream whose length you do not pass, `upload()` uses a multipart upload in `partSize` pieces
(8 MiB), so a stream of any size goes through without being buffered whole. `maxSize` is counted
while streaming, and a failed or aborted upload sends `AbortMultipartUpload`. Add an
`AbortIncompleteMultipartUpload` lifecycle rule for the uploads a crashed process leaves behind.
Multipart does not raise your runtime's request limit, though.

## Configuration

```ts
createBucket({
  bucket: 'my-bucket', // required (or S3ND_BUCKET / S3_BUCKET)
  region: 'eu-west-3', // or S3ND_REGION / AWS_REGION / AWS_DEFAULT_REGION
  credentials: { accessKeyId: '…', secretAccessKey: '…' }, // omit for the AWS provider chain
  endpoint: 'https://…', // S3-compatible storage, or S3ND_ENDPOINT / S3_ENDPOINT
  prefix: 'snapshots', // internal namespace, applied on the way in and out
  maxSize: 5 * 1024 * 1024, // reject bigger writes, counted while streaming
  multipartThreshold: 16 * 1024 * 1024, // above this, a multipart upload
  partSize: 8 * 1024 * 1024, // size of each part, 5 MiB at least
})
```

With an `endpoint` set, `region` defaults to `"auto"`, path-style addressing is enabled, and the
AWS SDK's default checksums are only sent when an operation requires them, which is what R2, MinIO
and Scaleway expect. Every option except `client` falls back to an environment variable,
so `createBucket()` with no arguments works once `S3_BUCKET` and the usual `AWS_*` variables are
set.

## License

MIT © Abderrahmane Mouzoune
