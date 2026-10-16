import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

import { CliError } from './errors.js'
import { isEmptyDirectory, tarDirectory, type ArchiveStats } from './tar.js'

/** What `put` sends: a stream, never the whole file in memory. */
export interface Source {
  body: ReadableStream<Uint8Array>
  /** Known for a file, from `stat`; for a stream only once it is spooled. */
  size?: number
  filename: string
  /**
   * Set when the CLI compressed what it sends: what went in, before gzip. Read
   * it once the transfer is done; for a directory it is counted on the way.
   */
  original?: { readonly size: number }
  /** Removes whatever the source left on disk. */
  cleanup(): Promise<void>
}

export interface SourceOptions {
  /** `--name`, which wins over the computed name. */
  name?: string
  /** `--compress`: gzip a file, or stdin, on the way out. A directory always is. */
  compress?: boolean
  /**
   * Spool anything whose size is unknown (stdin, an archive, a compressed
   * file) to a temporary file first, to learn it. A presigned upload needs the
   * size upfront; streaming straight into a multipart upload, as the local
   * mode does, does not.
   */
  spool: boolean
  /** Where a spool goes. The system's temporary directory by default. */
  tmpdir?: string
  stdin?: NodeJS.ReadableStream
}

function toWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
}

function nothingOnStdin(): CliError {
  return new CliError('Nothing arrived on stdin.', 'Pipe something in, or pass a path: `s3nd put ./project`.')
}

const noCleanup = async () => {}

/**
 * `source` through gzip. `pipeline` rather than `pipe`, so the two live and
 * die together: cancelling the upload stops the reading, and a read error
 * fails the upload instead of going unheard.
 */
function gzipped(source: Readable): Readable {
  const gzip = createGzip()
  pipeline(source, gzip).catch(() => undefined)
  return gzip
}

/**
 * Hands a stream of unknown size on as it is, or, with `spool`, writes it to a
 * temporary file and hands that on with its size. `empty` is thrown when the
 * spooled stream turns out to hold nothing.
 */
async function sized(
  stream: Readable,
  filename: string,
  options: { spool: boolean; tmpdir?: string; original?: Source['original']; empty?: () => Error },
): Promise<Source> {
  if (!options.spool) return { body: toWeb(stream), filename, original: options.original, cleanup: noCleanup }

  const directory = await mkdtemp(join(options.tmpdir ?? tmpdir(), 's3nd-'))
  const path = join(directory, 'spool')
  const cleanup = () => rm(directory, { recursive: true, force: true })

  try {
    await pipeline(stream, createWriteStream(path))
    const { size } = await stat(path)
    if (size === 0 && options.empty) throw options.empty()

    return { body: toWeb(createReadStream(path)), size, filename, original: options.original, cleanup }
  } catch (error) {
    await cleanup()
    throw error
  }
}

export async function openSource(file: string, options: SourceOptions): Promise<Source> {
  if (file === '-') return openStdin(options)

  let info
  try {
    info = await stat(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CliError(`No such file: ${file}`, 'Pass "-" to read the transfer from stdin instead.')
    }
    throw error
  }

  if (info.isDirectory()) {
    if (await isEmptyDirectory(file)) {
      throw new CliError(`${file} is empty.`, 'There is nothing in it to send.')
    }

    // tar, then gzip, on the fly: no archive is ever written whole, in memory
    // or on disk, unless a server needs its size.
    const stats: ArchiveStats = { files: 0, bytes: 0 }
    const archive = gzipped(Readable.from(tarDirectory(file, stats)))

    return sized(archive, options.name ?? `${basename(file)}.tar.gz`, {
      spool: options.spool,
      tmpdir: options.tmpdir,
      original: {
        get size() {
          return stats.bytes
        },
      },
    })
  }

  const filename = options.name ?? basename(file)

  if (options.compress) {
    const compressed = gzipped(createReadStream(file))
    return sized(compressed, options.name ?? `${filename}.gz`, {
      spool: options.spool,
      tmpdir: options.tmpdir,
      original: { size: info.size },
    })
  }

  return { body: toWeb(createReadStream(file)), size: info.size, filename, cleanup: noCleanup }
}

async function openStdin(options: SourceOptions): Promise<Source> {
  const stdin = Readable.from(options.stdin ?? process.stdin)

  // Read the first chunk to tell an empty stdin from a slow one, then hand
  // that chunk back in front of the rest.
  const iterator = stdin[Symbol.asyncIterator]()
  const first = await iterator.next()
  if (first.done) throw nothingOnStdin()

  let original = 0
  async function* rest() {
    original += (first.value as Uint8Array).byteLength
    yield first.value as Uint8Array
    for (;;) {
      const next = await iterator.next()
      if (next.done) return
      original += (next.value as Uint8Array).byteLength
      yield next.value as Uint8Array
    }
  }

  const input = Readable.from(rest())

  if (options.compress) {
    return sized(gzipped(input), options.name ?? 'stdin.gz', {
      spool: options.spool,
      tmpdir: options.tmpdir,
      original: {
        get size() {
          return original
        },
      },
    })
  }

  return sized(input, options.name ?? 'stdin', { spool: options.spool, tmpdir: options.tmpdir, empty: nothingOnStdin })
}
