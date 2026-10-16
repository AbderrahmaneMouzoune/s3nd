import { createWriteStream, existsSync } from 'node:fs'
import { link, rename, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { CliError } from './errors.js'

/**
 * The stored filename comes from whoever sent the transfer, so it is a name and
 * nothing more: no directory, from either kind of separator, no control
 * characters, no leading dots. When nothing survives, the code stands in.
 */
export function safeFilename(received: string | undefined, fallback: string): string {
  const name = (received ?? '')
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim()

  return name.length > 0 ? name : fallback
}

/**
 * Writes what `get` received, refusing to replace a file that is already there
 * unless `force`, and never leaving one half written. The bytes stream into a
 * temporary file beside the destination, which only takes the destination's
 * name once it is complete: `link` when nothing may be replaced, which fails
 * rather than overwrite, so nothing can slip in between the check and the
 * write; `rename` with `force`. A failure or an interruption removes the
 * temporary file and leaves the destination as it was.
 *
 * Returns the number of bytes written.
 */
export async function writeReceived(
  destination: string,
  data: string | Uint8Array | ReadableStream<Uint8Array>,
  force: boolean,
  onChunk?: (written: number) => void,
): Promise<number> {
  const temporary = join(
    dirname(destination),
    `.${basename(destination)}.${process.pid}-${Date.now().toString(36)}.s3nd-part`,
  )
  const body = typeof data === 'string' || data instanceof Uint8Array ? Readable.from([Buffer.from(data)]) : data
  let written = 0

  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      written += chunk.byteLength
      onChunk?.(written)
      callback(null, chunk)
    },
  })

  try {
    if (!force && existsSync(destination)) {
      // Refused before a byte is read: release the download rather than leave it hanging.
      if (!(body instanceof Readable)) await body.cancel().catch(() => undefined)
      throw alreadyThere(destination)
    }

    const source = body instanceof Readable ? body : Readable.fromWeb(body as never)
    await pipeline(source, counter, createWriteStream(temporary, { flags: 'wx' }))

    if (force) {
      await rename(temporary, destination)
    } else {
      try {
        await link(temporary, destination)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw alreadyThere(destination)
        // A filesystem without hard links: the existence check above is all
        // there is.
        if (existsSync(destination)) throw alreadyThere(destination)
        await rename(temporary, destination)
      }
    }
  } finally {
    await unlink(temporary).catch(() => undefined)
  }

  return written
}

function alreadyThere(destination: string): CliError {
  return new CliError(
    `${destination} already exists.`,
    'Pass --force to replace it, or -o <path> to write somewhere else.',
  )
}
