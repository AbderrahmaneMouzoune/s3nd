import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { safeFilename, writeReceived } from '../src/receive.js'

describe('safeFilename', () => {
  it('keeps an ordinary name as it is', () => {
    expect(safeFilename('rapport été.pdf', 'K7QP2M4X')).toBe('rapport été.pdf')
  })

  it('drops any directory, whichever separator it uses', () => {
    expect(safeFilename('../../.bashrc', 'K7QP2M4X')).toBe('bashrc')
    expect(safeFilename('..\\..\\Windows\\evil.dll', 'K7QP2M4X')).toBe('evil.dll')
  })

  it('turns an absolute path into its last segment', () => {
    expect(safeFilename('/home/user/.ssh/authorized_keys', 'K7QP2M4X')).toBe('authorized_keys')
  })

  it('strips control characters', () => {
    expect(safeFilename('report\u0000\n.pdf', 'K7QP2M4X')).toBe('report.pdf')
  })

  it('falls back to the code when nothing survives', () => {
    expect(safeFilename('../..', 'K7QP2M4X')).toBe('K7QP2M4X')
    expect(safeFilename('/', 'K7QP2M4X')).toBe('K7QP2M4X')
    expect(safeFilename(undefined, 'K7QP2M4X')).toBe('K7QP2M4X')
  })
})

describe('writeReceived', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 's3nd-receive-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes a file that is not there yet', async () => {
    const path = join(root, 'report.pdf')

    await writeReceived(path, new TextEncoder().encode('new'), false)

    expect(readFileSync(path, 'utf8')).toBe('new')
  })

  it('refuses to replace an existing file, and says how to', async () => {
    const path = join(root, 'report.pdf')
    writeFileSync(path, 'mine')

    const error = await writeReceived(path, 'theirs', false).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ message: `${path} already exists.` })
    expect((error as { hint: string }).hint).toMatch(/--force/)
    expect((error as { hint: string }).hint).toMatch(/-o/)
    expect(readFileSync(path, 'utf8')).toBe('mine')
  })

  it('replaces it with force', async () => {
    const path = join(root, 'report.pdf')
    writeFileSync(path, 'mine')

    await writeReceived(path, 'theirs', true)

    expect(readFileSync(path, 'utf8')).toBe('theirs')
  })

  it('streams a body to the file and reports what it wrote', async () => {
    const path = join(root, 'big.bin')
    const seen: number[] = []

    const written = await writeReceived(path, new Blob([new Uint8Array(100_000)]).stream(), false, (n) => seen.push(n))

    expect(written).toBe(100_000)
    expect(readFileSync(path).byteLength).toBe(100_000)
    expect(seen.at(-1)).toBe(100_000)
  })

  it('never leaves a half-written file when the stream fails', async () => {
    const path = join(root, 'big.bin')
    let pulls = 0
    const failing = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1
        if (pulls > 3) controller.error(new Error('connection reset'))
        else controller.enqueue(new Uint8Array(1000))
      },
    })

    await expect(writeReceived(path, failing, false)).rejects.toThrow('connection reset')

    expect(readdirSync(root)).toEqual([])
  })

  it('keeps the file already there intact when a forced write fails', async () => {
    const path = join(root, 'report.pdf')
    writeFileSync(path, 'mine')
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('half'))
        controller.error(new Error('connection reset'))
      },
    })

    await expect(writeReceived(path, failing, true)).rejects.toThrow('connection reset')

    expect(readFileSync(path, 'utf8')).toBe('mine')
    expect(readdirSync(root)).toEqual(['report.pdf'])
  })
})
