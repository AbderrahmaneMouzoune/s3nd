import { createReadStream } from 'node:fs'
import { lstat, readdir, readlink } from 'node:fs/promises'
import { basename, join } from 'node:path'

/**
 * A ustar writer, enough for `s3nd put ./directory`: regular files,
 * directories and symbolic links, permissions kept, streamed one file at a
 * time so a large directory never sits in memory. Paths or sizes ustar cannot
 * hold go in a PAX extended header, which every tar since 2001 reads.
 *
 * In-house rather than a dependency: the format is a 512-byte header per
 * entry, and the CLI's dependencies are kept to the s3nd packages.
 */

const BLOCK = 512
/** ustar's size field is 11 octal digits: 8 GiB, less one byte. */
const MAX_USTAR_SIZE = 8 ** 11 - 1
const encoder = new TextEncoder()

export interface ArchiveStats {
  /** Regular files written. */
  files: number
  /** Their bytes, before compression. */
  bytes: number
}

interface Entry {
  path: string
  type: 'file' | 'directory' | 'symlink'
  mode: number
  size: number
  mtime: number
  linkname?: string
}

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, '0') + '\0'
}

function put(header: Uint8Array, offset: number, width: number, text: string): void {
  header.set(encoder.encode(text).subarray(0, width), offset)
}

/** `name` and `prefix` for a path that fits ustar's 100 + 155 bytes, or `null`. */
function splitPath(path: string): { name: string; prefix: string } | null {
  if (encoder.encode(path).byteLength <= 100) return { name: path, prefix: '' }

  for (let index = path.indexOf('/'); index !== -1; index = path.indexOf('/', index + 1)) {
    const prefix = path.slice(0, index)
    const name = path.slice(index + 1)
    if (encoder.encode(prefix).byteLength <= 155 && encoder.encode(name).byteLength <= 100 && name.length > 0) {
      return { name, prefix }
    }
  }

  return null
}

function header(fields: {
  name: string
  prefix?: string
  mode: number
  size: number
  mtime: number
  type: string
  linkname?: string
}): Uint8Array {
  const block = new Uint8Array(BLOCK)

  put(block, 0, 100, fields.name)
  put(block, 100, 8, octal(fields.mode & 0o7777, 8))
  put(block, 108, 8, octal(0, 8))
  put(block, 116, 8, octal(0, 8))
  put(block, 124, 12, octal(fields.size, 12))
  put(block, 136, 12, octal(Math.floor(fields.mtime / 1000), 12))
  put(block, 156, 1, fields.type)
  put(block, 157, 100, fields.linkname ?? '')
  put(block, 257, 6, 'ustar\0')
  put(block, 263, 2, '00')
  put(block, 345, 155, fields.prefix ?? '')

  // The checksum is computed with its own field read as eight spaces.
  block.fill(0x20, 148, 156)
  let sum = 0
  for (const byte of block) sum += byte
  put(block, 148, 8, sum.toString(8).padStart(6, '0') + '\0 ')

  return block
}

/** One `<length> <key>=<value>\n` record, the length counting itself. */
function paxRecord(key: string, value: string): string {
  const body = ` ${key}=${value}\n`
  const bodyLength = encoder.encode(body).byteLength
  let length = bodyLength + 1
  while (String(length).length + bodyLength !== length) length = String(length).length + bodyLength

  return `${length}${body}`
}

function padding(size: number): Uint8Array {
  const rest = size % BLOCK
  return new Uint8Array(rest === 0 ? 0 : BLOCK - rest)
}

/** The header blocks of an entry: a PAX header first when ustar cannot hold it. */
function headersFor(entry: Entry): Uint8Array[] {
  const records: string[] = []
  const path = entry.type === 'directory' ? `${entry.path}/` : entry.path

  let split = splitPath(path)
  if (!split) {
    records.push(paxRecord('path', path))
    split = { name: path.slice(-100), prefix: '' }
  }

  let linkname = entry.linkname
  if (linkname != null && encoder.encode(linkname).byteLength > 100) {
    records.push(paxRecord('linkpath', linkname))
    linkname = linkname.slice(0, 100)
  }

  let size = entry.size
  if (size > MAX_USTAR_SIZE) {
    records.push(paxRecord('size', String(size)))
    size = 0
  }

  const blocks: Uint8Array[] = []

  if (records.length > 0) {
    const data = encoder.encode(records.join(''))
    blocks.push(
      header({ name: 'PaxHeader', mode: 0o644, size: data.byteLength, mtime: entry.mtime, type: 'x' }),
      data,
      padding(data.byteLength),
    )
  }

  const type = entry.type === 'file' ? '0' : entry.type === 'directory' ? '5' : '2'
  blocks.push(
    header({ name: split.name, prefix: split.prefix, mode: entry.mode, size, mtime: entry.mtime, type, linkname }),
  )

  return blocks
}

/**
 * Every entry under `root`, depth first, in name order so the same directory
 * always produces the same archive. Symbolic links are recorded as links,
 * never followed, so nothing outside the directory is ever read. Sockets,
 * FIFOs and devices are skipped.
 */
async function* walk(root: string, relative: string): AsyncGenerator<Entry & { absolute: string }> {
  const names = (await readdir(join(root, relative))).sort()

  for (const name of names) {
    const path = relative ? `${relative}/${name}` : name
    const absolute = join(root, path)
    const info = await lstat(absolute)

    if (info.isSymbolicLink()) {
      yield {
        path,
        absolute,
        type: 'symlink',
        mode: info.mode,
        size: 0,
        mtime: info.mtimeMs,
        linkname: await readlink(absolute),
      }
    } else if (info.isDirectory()) {
      yield { path, absolute, type: 'directory', mode: info.mode, size: 0, mtime: info.mtimeMs }
      yield* walk(root, path)
    } else if (info.isFile()) {
      yield { path, absolute, type: 'file', mode: info.mode, size: info.size, mtime: info.mtimeMs }
    }
  }
}

/** Whether a directory holds anything worth archiving. */
export async function isEmptyDirectory(root: string): Promise<boolean> {
  for await (const entry of walk(root, '')) {
    void entry
    return false
  }

  return true
}

/**
 * The tar archive of `root`, as chunks. Entries are named under the
 * directory's own name, so `tar xf` recreates it, as `tar c ./project` would.
 * `stats` is filled in as the archive is read.
 */
export async function* tarDirectory(
  root: string,
  stats: ArchiveStats = { files: 0, bytes: 0 },
): AsyncGenerator<Uint8Array> {
  const top = basename(root)
  const info = await lstat(root)
  yield* headersFor({ path: top, type: 'directory', mode: info.mode, size: 0, mtime: info.mtimeMs })

  for await (const entry of walk(root, '')) {
    const archived = { ...entry, path: `${top}/${entry.path}` }
    yield* headersFor(archived)

    if (entry.type !== 'file') continue

    // Exactly the size the header announced, even if the file changed since
    // it was listed: a short read is padded, a long one cut, and the archive
    // stays readable either way.
    let written = 0
    for await (const chunk of createReadStream(entry.absolute, { end: Math.max(entry.size - 1, 0) })) {
      if (entry.size === 0) break
      const bytes = (chunk as Buffer).subarray(0, entry.size - written)
      written += bytes.byteLength
      yield bytes
      if (written >= entry.size) break
    }
    if (written < entry.size) yield new Uint8Array(entry.size - written)

    stats.files += 1
    stats.bytes += entry.size
    yield padding(entry.size)
  }

  // Two empty blocks end the archive.
  yield new Uint8Array(BLOCK * 2)
}
