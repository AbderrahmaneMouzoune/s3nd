import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { CliError } from './errors.js'

/** What `put` sends: a stream, never the whole file in memory. */
export interface Source {
  body: ReadableStream<Uint8Array>
  /** Known for a file, from `stat`; for stdin only once it is spooled. */
  size?: number
  filename: string
  /** Removes whatever the source left on disk. */
  cleanup(): Promise<void>
}

export interface SourceOptions {
  /** `--name`, which wins over the file's own name. */
  name?: string
  /**
   * Spool stdin to a temporary file first, to learn its size. A presigned
   * upload needs it upfront; streaming straight into a multipart upload, as
   * the local mode does, does not.
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
  return new CliError(
    'Nothing arrived on stdin.',
    'Pipe something in: `tar cz ./project | s3nd put - --name project.tar.gz`.',
  )
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
    throw new CliError(`${file} is a directory.`, 'Archive it first: `tar cz ./dir | s3nd put - --name dir.tar.gz`.')
  }

  return {
    body: toWeb(createReadStream(file)),
    size: info.size,
    filename: options.name ?? basename(file),
    cleanup: async () => {},
  }
}

async function openStdin(options: SourceOptions): Promise<Source> {
  const stdin = Readable.from(options.stdin ?? process.stdin)
  const filename = options.name ?? 'stdin'

  if (options.spool) {
    const directory = await mkdtemp(join(options.tmpdir ?? tmpdir(), 's3nd-'))
    const path = join(directory, 'stdin')
    const cleanup = () => rm(directory, { recursive: true, force: true })

    try {
      await pipeline(stdin, createWriteStream(path))
      const { size } = await stat(path)
      if (size === 0) throw nothingOnStdin()

      return { body: toWeb(createReadStream(path)), size, filename, cleanup }
    } catch (error) {
      await cleanup()
      throw error
    }
  }

  // Read the first chunk to tell an empty stdin from a slow one, then hand
  // that chunk back in front of the rest.
  const iterator = stdin[Symbol.asyncIterator]()
  const first = await iterator.next()
  if (first.done) throw nothingOnStdin()

  async function* rest() {
    yield first.value as Uint8Array
    for (;;) {
      const next = await iterator.next()
      if (next.done) return
      yield next.value as Uint8Array
    }
  }

  return { body: toWeb(Readable.from(rest())), filename, cleanup: async () => {} }
}
