import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBucket } from '../src/bucket.js'
import type { S3ndError } from '@s3nd/protocol'
import { clearBucketEnv, createMemoryClient, createStubClient, notFoundError } from './helpers.js'

beforeEach(clearBucketEnv)
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('head', () => {
  it('reports what get() would, without a body', async () => {
    const { client, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', prefix: 'uploads', client })
    await bucket.upload('hello', { key: 'a.txt', filename: 'Hello world.txt' })

    const info = await bucket.head('a.txt')

    expect(send.mock.calls.at(-1)![0].constructor.name).toBe('HeadObjectCommand')
    expect(info).toMatchObject({
      bucket: 'assets',
      key: 'a.txt',
      path: 'uploads/a.txt',
      contentType: 'text/plain; charset=utf-8',
      filename: 'Hello world.txt',
      size: 5,
      etag: 'etag-1',
    })
    expect(info).not.toHaveProperty('body')
  })

  it('returns null for a missing key', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })

    expect(await bucket.head('missing.txt')).toBeNull()
  })

  it('honours a per-call prefix and the abort signal', async () => {
    const { client, calls } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', prefix: 'uploads', client })
    const signal = new AbortController().signal

    await bucket.head('a.txt', { prefix: 'other', signal })

    expect(calls[0]!.command.input.Key).toBe('other/a.txt')
    expect(calls[0]!.options?.abortSignal).toBe(signal)
  })

  it('wraps other failures as GET_FAILED', async () => {
    const cause = Object.assign(new Error('Forbidden'), { $metadata: { httpStatusCode: 403 } })
    const { client } = createStubClient({}, cause)
    const bucket = createBucket({ bucket: 'assets', client })

    const error = (await bucket.head('a.txt').catch((e) => e)) as S3ndError

    expect(error.code).toBe('GET_FAILED')
    expect(error.cause).toBe(cause)
  })
})

describe('exists', () => {
  it('answers yes or no from a HeadObject', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.put('a.txt', 'hello')

    expect(await bucket.exists('a.txt')).toBe(true)
    expect(await bucket.exists('b.txt')).toBe(false)
  })
})

describe('hasSnapshot', () => {
  it('sees a live snapshot without downloading it', async () => {
    const { client, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.putSnapshot('XK5892', { a: 1 }, { expiresIn: 60 })
    send.mockClear()

    expect(await bucket.hasSnapshot('XK5892')).toBe(true)
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['HeadObjectCommand'])
  })

  it('reports an expired snapshot as absent, from its metadata', async () => {
    vi.useFakeTimers()
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.putSnapshot('XK5892', { a: 1 }, { expiresIn: 60 })

    vi.advanceTimersByTime(61_000)

    expect(await bucket.hasSnapshot('XK5892')).toBe(false)
  })

  it('reports a missing snapshot as absent', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })

    expect(await bucket.hasSnapshot('XK5892')).toBe(false)
  })

  it('treats a snapshot without expiry metadata as present', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.putSnapshot('XK5892', { a: 1 })

    expect(await bucket.hasSnapshot('XK5892')).toBe(true)
  })

  it('mirrors expiresAt into metadata on write', async () => {
    const { client, calls } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', client })

    const result = await bucket.putSnapshot('XK5892', { a: 1 }, { expiresIn: 60 })

    expect(calls[0]!.command.input.Metadata).toEqual({ 's3nd-expires-at': result.expiresAt!.toISOString() })
  })
})

describe('deleteSnapshot', () => {
  it('removes the snapshot', async () => {
    const { client, objects } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.putSnapshot('XK5892', { a: 1 }, { prefix: 'transfers' })

    await bucket.deleteSnapshot('XK5892', { prefix: 'transfers' })

    expect(objects.has('transfers/XK5892')).toBe(false)
    expect(await bucket.getSnapshot('XK5892', { prefix: 'transfers' })).toBeNull()
  })

  it('is a no-op for a snapshot already gone', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })

    await expect(bucket.deleteSnapshot('XK5892')).resolves.toBeUndefined()
  })
})

describe('list', () => {
  async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = []
    for await (const item of iterable) items.push(item)
    return items
  }

  it('yields keys relative to the configured prefix', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', prefix: 'snapshots', client })
    await bucket.put('b', 'x')
    await bucket.put('a', 'xy')
    await bucket.put('elsewhere', 'x', { prefix: 'other' })

    const listed = await collect(bucket.list())

    expect(listed.map((object) => object.key)).toEqual(['a', 'b'])
    expect(listed[0]).toMatchObject({ bucket: 'assets', key: 'a', path: 'snapshots/a', size: 2, etag: 'etag-2' })
    expect(listed[0]!.lastModified).toBeInstanceOf(Date)
  })

  it('hands back keys that get() accepts with the same prefix', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.put('XK5892', 'hello', { prefix: 'transfers' })

    const [first] = await collect(bucket.list({ prefix: 'transfers' }))
    const file = await bucket.get(first!.key, { prefix: 'transfers' })

    expect(await file!.text()).toBe('hello')
  })

  it('lists the whole bucket when there is no prefix', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.put('a', 'x', { prefix: 'one' })
    await bucket.put('b', 'x', { prefix: 'two' })

    const listed = await collect(bucket.list())

    expect(listed.map((object) => object.key)).toEqual(['one/a', 'two/b'])
  })

  it('narrows with startsWith inside the namespace', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', prefix: 'backups', client })
    await bucket.put('user-1/a', 'x')
    await bucket.put('user-2/a', 'x')

    const listed = await collect(bucket.list({ startsWith: 'user-2/' }))

    expect(listed.map((object) => object.key)).toEqual(['user-2/a'])
  })

  it('follows continuation tokens across pages', async () => {
    const { client, objects, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    for (let index = 0; index < 2500; index += 1) {
      objects.set(`k-${String(index).padStart(4, '0')}`, {
        body: new Uint8Array(),
        etag: `e-${index}`,
        lastModified: new Date(),
      })
    }

    const listed = await collect(bucket.list())

    expect(listed).toHaveLength(2500)
    expect(send.mock.calls.filter(([command]) => command.constructor.name === 'ListObjectsV2Command')).toHaveLength(3)
  })

  it('stops at the limit without fetching more than it needs', async () => {
    const { client, objects, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    for (let index = 0; index < 20; index += 1) {
      objects.set(`k-${String(index).padStart(2, '0')}`, {
        body: new Uint8Array(),
        etag: 'e',
        lastModified: new Date(),
      })
    }

    const listed = await collect(bucket.list({ limit: 5 }))

    expect(listed.map((object) => object.key)).toEqual(['k-00', 'k-01', 'k-02', 'k-03', 'k-04'])
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0]![0].input.MaxKeys).toBe(5)
  })

  it('skips folder placeholders', async () => {
    const { client, objects } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', prefix: 'uploads', client })
    objects.set('uploads/', { body: new Uint8Array(), etag: 'e', lastModified: new Date() })
    objects.set('uploads/docs/', { body: new Uint8Array(), etag: 'e', lastModified: new Date() })
    await bucket.put('docs/a.txt', 'x')

    const listed = await collect(bucket.list())

    expect(listed.map((object) => object.key)).toEqual(['docs/a.txt'])
  })

  it('rejects a limit that is not a positive integer before any request', async () => {
    const { client, send } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', client })

    await expect(collect(bucket.list({ limit: 0 }))).rejects.toMatchObject({ code: 'LIST_FAILED' })
    await expect(collect(bucket.list({ limit: 1.5 }))).rejects.toMatchObject({ code: 'LIST_FAILED' })
    expect(send).not.toHaveBeenCalled()
  })

  it('wraps S3 failures as LIST_FAILED', async () => {
    const cause = new Error('AccessDenied')
    const { client } = createStubClient({}, cause)
    const bucket = createBucket({ bucket: 'assets', client })

    const error = (await collect(bucket.list()).catch((e) => e)) as S3ndError

    expect(error.code).toBe('LIST_FAILED')
    expect(error.cause).toBe(cause)
  })
})

describe('copy', () => {
  it('copies server-side, keeping content type and metadata', async () => {
    const { client, objects, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.put('a.txt', 'hello', { filename: 'Hello.txt' })

    const result = await bucket.copy('a.txt', 'b.txt')

    const command = send.mock.calls.at(-1)![0]
    expect(command.constructor.name).toBe('CopyObjectCommand')
    expect(command.input).toMatchObject({ Bucket: 'assets', Key: 'b.txt', CopySource: 'assets/a.txt' })
    expect(result).toMatchObject({ bucket: 'assets', key: 'b.txt', path: 'b.txt', etag: 'etag-2' })
    expect(objects.has('a.txt')).toBe(true)

    const copied = await bucket.get('b.txt')
    expect(await copied!.text()).toBe('hello')
    expect(copied!.filename).toBe('Hello.txt')
    expect(copied!.contentType).toBe('text/plain; charset=utf-8')
  })

  it('promotes a snapshot into another prefix', async () => {
    const { client } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.putSnapshot('XK5892', { a: 1 }, { prefix: 'transfers' })

    const result = await bucket.copy('XK5892', 'user-42', { prefix: 'transfers', toPrefix: 'backups' })

    expect(result!.path).toBe('backups/user-42')
    expect((await bucket.getSnapshot('user-42', { prefix: 'backups' }))!.data).toEqual({ a: 1 })
  })

  it('encodes the copy source', async () => {
    const { client, calls } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', client })

    await bucket.copy('dir/a file#1.txt', 'b.txt')

    expect(calls[0]!.command.input.CopySource).toBe('assets/dir/a%20file%231.txt')
  })

  it('returns null when the source does not exist', async () => {
    const { client } = createStubClient({}, notFoundError())
    const bucket = createBucket({ bucket: 'assets', client })

    expect(await bucket.copy('missing', 'b')).toBeNull()
  })

  it('refuses to copy an object onto itself', async () => {
    const { client, send } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', client })

    await expect(bucket.copy('a', 'a')).rejects.toMatchObject({ code: 'COPY_FAILED' })
    expect(send).not.toHaveBeenCalled()
  })

  it('wraps S3 failures as COPY_FAILED', async () => {
    const cause = new Error('AccessDenied')
    const { client } = createStubClient({}, cause)
    const bucket = createBucket({ bucket: 'assets', client })

    const error = (await bucket.copy('a', 'b').catch((e) => e)) as S3ndError

    expect(error.code).toBe('COPY_FAILED')
    expect(error.cause).toBe(cause)
  })
})

describe('move', () => {
  it('copies then deletes the source', async () => {
    const { client, objects } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })
    await bucket.put('a.txt', 'hello', { prefix: 'in' })

    const result = await bucket.move('a.txt', 'a.txt', { prefix: 'in', toPrefix: 'out' })

    expect(result!.path).toBe('out/a.txt')
    expect(objects.has('in/a.txt')).toBe(false)
    expect(objects.has('out/a.txt')).toBe(true)
  })

  it('returns null and deletes nothing when the source is missing', async () => {
    const { client, send } = createMemoryClient()
    const bucket = createBucket({ bucket: 'assets', client })

    expect(await bucket.move('missing', 'b')).toBeNull()
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['CopyObjectCommand'])
  })
})

describe('per-call prefix', () => {
  it('applies to getUrl()', async () => {
    const bucket = createBucket({ bucket: 'assets', publicUrl: 'https://cdn.example.com', prefix: 'uploads' })

    expect(await bucket.getUrl('a.png', { prefix: 'avatars' })).toBe('https://cdn.example.com/avatars/a.png')
  })

  it('applies to delete(), single and batched', async () => {
    const { client, calls } = createStubClient({})
    const bucket = createBucket({ bucket: 'assets', prefix: 'uploads', client })

    await bucket.delete('a', { prefix: 'other' })
    await bucket.delete(['a', 'b'], { prefix: 'other' })

    expect(calls[0]!.command.input.Key).toBe('other/a')
    expect(calls[1]!.command.input.Delete.Objects).toEqual([{ Key: 'other/a' }, { Key: 'other/b' }])
  })
})
