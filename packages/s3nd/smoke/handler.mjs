/* global Deno, Bun, process, console, Blob, Request, Response, TextDecoder, TextEncoder */

// Runs the transfer handler from the built package against an in-memory S3,
// on whichever runtime executes this file: `bun smoke/handler.mjs`,
// `deno run --allow-env --allow-read smoke/handler.mjs`, or plain Node.
//
// It imports `dist/`, not `src/`, because what has to run outside Node is the
// published bundle. Run `bun run build` first.

import { createBucket, createTransferHandler } from '../dist/index.js'

const runtime = globalThis.Deno
  ? `Deno ${Deno.version.deno}`
  : globalThis.Bun
    ? `Bun ${Bun.version}`
    : `Node ${process.version}`

/** The few S3 commands the handler sends, kept in a Map. */
function memoryClient() {
  const objects = new Map()
  let counter = 0

  async function bytesOf(body) {
    if (body instanceof Uint8Array) return body
    return new Uint8Array(await new Response(body).arrayBuffer())
  }

  return {
    objects,
    async send(command) {
      const name = command.constructor.name
      const input = command.input
      const stored = objects.get(input.Key)

      if (name === 'PutObjectCommand') {
        if (input.IfNoneMatch === '*' && stored) {
          throw Object.assign(new Error('precondition'), {
            name: 'PreconditionFailed',
            $metadata: { httpStatusCode: 412 },
          })
        }
        counter += 1
        objects.set(input.Key, {
          body: await bytesOf(input.Body),
          contentType: input.ContentType,
          metadata: input.Metadata,
          etag: `etag-${counter}`,
        })
        return { ETag: `"etag-${counter}"` }
      }

      if (name === 'GetObjectCommand') {
        if (!stored)
          throw Object.assign(new Error('missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } })
        // What the SDK hands back outside Node: a web stream with its helpers.
        const body = new Blob([stored.body]).stream()
        return {
          Body: Object.assign(body, {
            transformToByteArray: async () => stored.body,
            transformToString: async () => new TextDecoder().decode(stored.body),
          }),
          ContentType: stored.contentType,
          ContentLength: stored.body.byteLength,
          Metadata: stored.metadata ?? {},
          ETag: `"${stored.etag}"`,
          LastModified: new Date(),
        }
      }

      if (name === 'DeleteObjectCommand') {
        objects.delete(input.Key)
        return {}
      }

      throw new Error(`Unexpected command: ${name}`)
    },
    destroy() {},
  }
}

function check(condition, message) {
  if (!condition) throw new Error(`${runtime}: ${message}`)
}

const client = memoryClient()
const handler = createTransferHandler({ bucket: createBucket({ bucket: 'smoke', client }), app: 'smoke' })
const base = 'http://localhost/api/transfers'

// A snapshot: JSON in, gzipped through CompressionStream, read back through
// DecompressionStream.
const state = { notes: Array.from({ length: 50 }, (_, id) => ({ id, body: 'the same words again' })) }
const created = await handler(
  new Request(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: state }),
  }),
)
check(created.status === 201, `POST snapshot answered ${created.status}`)
const { code } = await created.json()
const stored = client.objects.get(code).body
check(stored[0] === 0x1f && stored[1] === 0x8b, 'the snapshot was not gzipped')

const read = await handler(new Request(`${base}/${code}`))
check(read.status === 200, `GET snapshot answered ${read.status}`)
check(JSON.stringify((await read.json()).data) === JSON.stringify(state), 'the snapshot did not round-trip')

// A file: bytes in, streamed back out of /raw.
const bytes = new TextEncoder().encode('hello from '.repeat(100))
const file = await handler(
  new Request(base, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-s3nd-filename': 'hello.txt' },
    body: bytes,
  }),
)
check(file.status === 201, `POST file answered ${file.status}`)
const fileCode = (await file.json()).code

const raw = await handler(new Request(`${base}/${fileCode}/raw`))
check(raw.status === 200, `GET raw answered ${raw.status}`)
check((await raw.text()) === new TextDecoder().decode(bytes), 'the file did not round-trip')

const removed = await handler(new Request(`${base}/${fileCode}`, { method: 'DELETE' }))
check(removed.status === 204, `DELETE answered ${removed.status}`)
check(!client.objects.has(fileCode), 'the file was not deleted')

console.log(`${runtime}: the transfer handler works.`)
