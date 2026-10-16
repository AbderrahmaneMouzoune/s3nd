import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { gunzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { tarDirectory, type ArchiveStats } from '../src/tar.js'
import { openSource } from '../src/transfer.js'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 's3nd-tar-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

async function drain(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer())
}

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const parts: Uint8Array[] = []
  for await (const chunk of chunks) parts.push(chunk)
  return Buffer.concat(parts)
}

/** A project with what a real one holds: nesting, an executable, a link, an empty folder. */
function project(): string {
  const dir = join(root, 'project')
  mkdirSync(join(dir, 'src', 'deep'), { recursive: true })
  mkdirSync(join(dir, 'empty'))
  writeFileSync(join(dir, 'README.md'), '# project\n')
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const answer = 42\n')
  writeFileSync(join(dir, 'src', 'deep', 'data.bin'), Buffer.alloc(70_000, 7))
  writeFileSync(join(dir, 'run.sh'), '#!/bin/sh\necho hi\n')
  chmodSync(join(dir, 'run.sh'), 0o755)
  symlinkSync('README.md', join(dir, 'link-to-readme'))
  // Points outside the directory: kept as a link, never followed.
  symlinkSync('/etc/passwd', join(dir, 'outside'))
  return dir
}

/** Extracts with the system's own tar, which is the acceptance test that matters. */
function extract(archive: Buffer, gzip: boolean): string {
  const target = join(root, 'out')
  mkdirSync(target, { recursive: true })
  const path = join(root, gzip ? 'archive.tar.gz' : 'archive.tar')
  writeFileSync(path, archive)
  execFileSync('tar', [gzip ? '-xzf' : '-xf', path, '-C', target])
  return target
}

describe('tarDirectory', () => {
  it('writes an archive tar extracts, with contents, permissions and links intact', async () => {
    const stats: ArchiveStats = { files: 0, bytes: 0 }
    const archive = await collect(tarDirectory(project(), stats))
    const out = join(extract(archive, false), 'project')

    expect(readFileSync(join(out, 'README.md'), 'utf8')).toBe('# project\n')
    expect(readFileSync(join(out, 'src', 'index.ts'), 'utf8')).toBe('export const answer = 42\n')
    expect(readFileSync(join(out, 'src', 'deep', 'data.bin')).equals(Buffer.alloc(70_000, 7))).toBe(true)
    expect(statSync(join(out, 'run.sh')).mode & 0o777).toBe(0o755)
    expect(statSync(join(out, 'empty')).isDirectory()).toBe(true)
    expect(readlinkSync(join(out, 'link-to-readme'))).toBe('README.md')
    expect(lstatSync(join(out, 'outside')).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(out, 'outside'))).toBe('/etc/passwd')
    expect(stats).toEqual({ files: 4, bytes: 10 + 25 + 70_000 + 18 })
    expect(archive.byteLength % 512).toBe(0)
  })

  it('keeps paths too long for ustar through a PAX header', async () => {
    const dir = join(root, 'long')
    const segment = 'a-directory-name-that-goes-on-for-quite-a-while'
    const nested = join(dir, segment, segment, segment, segment)
    mkdirSync(nested, { recursive: true })
    const name = `${'f'.repeat(120)}.txt`
    writeFileSync(join(nested, name), 'deep')

    const out = extract(await collect(tarDirectory(dir)), false)

    expect(readFileSync(join(out, 'long', segment, segment, segment, segment, name), 'utf8')).toBe('deep')
  })

  it('keeps names outside ASCII', async () => {
    const dir = join(root, 'été')
    mkdirSync(dir)
    writeFileSync(join(dir, 'résumé.pdf'), 'cv')

    const out = extract(await collect(tarDirectory(dir)), false)

    expect(readFileSync(join(out, 'été', 'résumé.pdf'), 'utf8')).toBe('cv')
  })

  it('produces the same archive for the same directory', async () => {
    const dir = project()

    expect((await collect(tarDirectory(dir))).equals(await collect(tarDirectory(dir)))).toBe(true)
  })
})

describe('put of a directory or a compressed file', () => {
  it('sends a directory as <name>.tar.gz, which tar xzf unpacks', async () => {
    const source = await openSource(project(), { spool: false })

    expect(source.filename).toBe('project.tar.gz')
    expect(source.size).toBeUndefined()

    const out = extract(await drain(source.body), true)
    expect(readFileSync(join(out, 'project', 'README.md'), 'utf8')).toBe('# project\n')
    expect(source.original?.size).toBe(10 + 25 + 70_000 + 18)
  })

  it('lets --name win over the computed name', async () => {
    const archive = await openSource(project(), { name: 'release.tgz', spool: false })
    const file = join(root, 'dump.sql')
    writeFileSync(file, 'select 1;')
    const compressed = await openSource(file, { name: 'backup.gz', compress: true, spool: false })

    expect(archive.filename).toBe('release.tgz')
    expect(compressed.filename).toBe('backup.gz')
    await archive.body.cancel()
    await compressed.body.cancel()
  })

  it('spools the archive against a server, to know its size', async () => {
    const source = await openSource(project(), { spool: true })
    const bytes = await drain(source.body)
    await source.cleanup()

    expect(source.size).toBe(bytes.byteLength)
    expect(readFileSync(join(extract(bytes, true), 'project', 'run.sh'), 'utf8')).toContain('echo hi')
  })

  it('gzips a file with --compress into <name>.gz, which gunzip restores', async () => {
    const file = join(root, 'dump.sql')
    writeFileSync(file, 'insert into notes values (1);\n'.repeat(1000))

    const source = await openSource(file, { compress: true, spool: false })
    const bytes = await drain(source.body)

    expect(source.filename).toBe('dump.sql.gz')
    expect(source.original?.size).toBe(30_000)
    expect(bytes.byteLength).toBeLessThan(1000)
    expect(gunzipSync(bytes).toString()).toBe('insert into notes values (1);\n'.repeat(1000))
  })

  it('sends a file as it is without --compress', async () => {
    const file = join(root, 'report.pdf')
    writeFileSync(file, 'pdf')

    const source = await openSource(file, { spool: false })

    expect(source).toMatchObject({ filename: 'report.pdf', size: 3 })
    expect(source.original).toBeUndefined()
    expect((await drain(source.body)).toString()).toBe('pdf')
  })

  it('gzips stdin with --compress', async () => {
    const stdin = new PassThrough()
    stdin.end('piped text')

    const source = await openSource('-', { compress: true, spool: true, stdin })
    const bytes = await drain(source.body)
    await source.cleanup()

    expect(source.filename).toBe('stdin.gz')
    expect(gunzipSync(bytes).toString()).toBe('piped text')
    expect(source.original?.size).toBe(10)
  })

  it('refuses an empty directory, saying so', async () => {
    mkdirSync(join(root, 'nothing'))

    await expect(openSource(join(root, 'nothing'), { spool: false })).rejects.toThrow(/is empty/)
  })
})
