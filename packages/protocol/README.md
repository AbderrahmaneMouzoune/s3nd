# @s3nd/protocol

[![npm](https://img.shields.io/npm/v/%40s3nd%2Fprotocol?color=ffb000&labelColor=111111&label=npm)](https://www.npmjs.com/package/@s3nd/protocol)
[![install size](https://img.shields.io/npm/unpacked-size/%40s3nd%2Fprotocol?color=111111&labelColor=111111&label=install%20size)](https://www.npmjs.com/package/@s3nd/protocol)
[![MIT](https://img.shields.io/badge/license-MIT-ffb000.svg)](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/packages/protocol/LICENSE)
[![Docs](https://img.shields.io/badge/docs-doc.s3nd.sh-111111.svg)](https://doc.s3nd.sh)

<p align="center">
  <img src="https://raw.githubusercontent.com/AbderrahmaneMouzoune/s3nd/main/.github/demos/protocol.gif" alt="A terminal drives the four routes with curl: POST creates the transfer and answers with the code K7QP2M4X, GET /k7qp-2m4x returns its metadata, GET /K7QP2M4X/raw downloads the bytes, DELETE burns it, and a last GET answers NOT_FOUND." width="880">
</p>

The shared vocabulary of every s3nd piece: the wire contract between a server and its
clients, a client that speaks it, and the sync codes that travel over it.

```sh
npm install @s3nd/protocol
```

It holds one invariant: **nothing here imports a storage client**. That is what lets
[`@s3nd/react`](https://www.npmjs.com/package/@s3nd/react), the CLI and a browser bundle
share this code without any of them pulling the AWS SDK behind it. It has no runtime
dependencies: codes come from `crypto.getRandomValues`, which every supported runtime ships.

Most applications do not install this directly: `@s3nd/core` and `@s3nd/react` depend on it
and re-export what you need. Reach for it when you are writing a client for a runtime neither of
those covers, or implementing the protocol on a server that is not Node.

## The client

```ts
import { createTransferClient } from '@s3nd/protocol'

const transfers = createTransferClient({
  baseUrl: 'https://drop.example.com/api/transfers',
  headers: { authorization: `Bearer ${token}` },
})

const { code } = await transfers.createSnapshot({ data: state, version: 3 })
const incoming = await transfers.read(typed) // null when unknown or expired
const bytes = await transfers.readBytes(code) // for a file transfer
await transfers.remove(code)
```

Files can go straight to the bucket instead of through the server, with progress:

```ts
const transfers = createTransferClient({ baseUrl: '/api/transfers', upload: 'auto' })

await transfers.createFile({
  body: file,
  filename: file.name,
  onProgress: ({ loaded, total }) => render(loaded / (total ?? loaded)),
})
```

`upload` is `'proxy'` (the default: the bytes go in `POST /`), `'presign'` (the server signs a URL,
the bytes go to the bucket) or `'auto'` (presign when the server offers it). In a browser,
`onProgress` sends through `XMLHttpRequest`, the only API that reports upload progress.
`readBytes(code, { onProgress })` counts a download the same way. For a file too large to hold,
`readStream(code)` hands back `{ body, size, contentType }` with `body` a `ReadableStream`, and
`createFile()` takes a stream as `body`, with its `size` when you know it.

`fetch` and nothing else, so it runs in a browser, a worker, React Native, Deno or Node without a
polyfill. Pass your own `fetch` to add retries, or to point it somewhere else in tests.

Pass `timeout` (milliseconds) to bound every call: past it, the call rejects with a `TransferError`
coded `TIMEOUT`, a code only the client raises. A response that is not the JSON the protocol
promises (an HTML login page on a 200, a body without a `code`) rejects as `INTERNAL` with a message
naming what came back.

## The routes

All of them are relative to wherever the server mounted them.

| Route            | What it does                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| `POST /`         | Creates a transfer, returns the code. JSON body is a snapshot, anything else a file |
| `GET /:code`     | Metadata, with the state inline for a snapshot                                      |
| `GET /:code/raw` | The bytes, or a `302` to a presigned URL                                            |
| `DELETE /:code`  | Burns the code                                                                      |

A server can also offer presigned uploads: `POST /` with `{ "upload": "presign", … }` hands back a
URL to send the bytes to, and `POST /:code/complete` makes the code live once they are there.
[`PROTOCOL.md`](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/packages/protocol/PROTOCOL.md)
specifies it.

Every non-2xx answer carries `{ "error": { "code", "message" } }`, and the client turns it into a
`TransferError` with that `code` on it. Branch on the code, never on the message:

```ts
import { isTransferError } from '@s3nd/protocol'

if (isTransferError(error) && error.code === 'TOO_LARGE') {
  // ask the user to trim their database
}
```

`NOT_FOUND` deliberately covers an expired code as well as one that never existed: telling them
apart would let someone probe which codes have been used.

[`PROTOCOL.md`](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/packages/protocol/PROTOCOL.md),
shipped in this package, is the normative specification: every route, header, body, error code and
rule a server or a client has to follow. The
[protocol guide](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/apps/docs/content/docs/protocol.mdx)
is the readable tour of it.

Every request carries `s3nd-protocol: 1` (`PROTOCOL_HEADER`), and a server answers a newer version
with `UNSUPPORTED_PROTOCOL` instead of misreading it.

## Sync codes

A sync code belongs here rather than in `@s3nd/core` because it _is_ part of the contract: its
alphabet, and the rules for reading back what someone typed, are what the two devices have to agree
on.

```ts
import { createSyncCodes, syncCodeAlphabets } from '@s3nd/protocol'

const codes = createSyncCodes()
codes.create() // "K7QP2M4X"
codes.normalize('k7-qp2m4x') // "K7QP2M4X"
codes.normalize('OIL5ABCD') // "0115ABCD": O, I and L are not in the alphabet
codes.entropyBits // 40
```

The default is eight characters of [Crockford base32](https://www.crockford.com/base32.html): no
`I`, `L`, `O` or `U`, so a code survives being read aloud, written on paper, or typed on a phone.
`createSyncCodes()` pairs generation with normalization so the two can never disagree about the
alphabet.

Normalizing in the browser, before any request, is what makes the input forgiving; see
`useSyncCodeInput` in `@s3nd/react`.

## License

MIT © Abderrahmane Mouzoune
