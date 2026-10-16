import { describe, expect, it } from 'vitest'

import { createBucket } from '../src/bucket.js'
import type { S3ndError } from '../src/errors.js'
import { createMemoryClient, type MemoryClientOptions } from './helpers.js'

function setup(conditionalWrites: MemoryClientOptions['conditionalWrites']) {
  const memory = createMemoryClient({ conditionalWrites })
  return { memory, bucket: createBucket({ bucket: 'assets', client: memory.client }) }
}

describe('a backend without conditional writes', () => {
  it.each([
    ['501', { refuse: 501 }],
    ['a 400 about the header', { refuse: 400, name: 'InvalidArgument' }],
  ])('names the limitation on ifAbsent when it answers %s', async (_label, refusal) => {
    const { bucket } = setup(refusal)

    const error = (await bucket.put('code', 'x', { ifAbsent: true }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('CONDITIONAL_WRITE_UNSUPPORTED')
    expect(error.message).toMatch(/does not seem to support conditional writes/)
    expect(error.message).toMatch(/If-None-Match/)
    expect(error.cause).toBeInstanceOf(Error)
  })

  it('names it on ifMatch too', async () => {
    const { bucket } = setup({ refuse: 501 })

    const error = (await bucket.putSnapshot('code', { a: 1 }, { ifMatch: 'etag-1' }).catch((e) => e)) as S3ndError

    expect(error.code).toBe('CONDITIONAL_WRITE_UNSUPPORTED')
    expect(error.message).toMatch(/If-Match/)
  })

  it('leaves an unconditional write alone, which never sent the header', async () => {
    const { bucket } = setup({ refuse: 501 })

    await expect(bucket.put('code', 'x')).resolves.toMatchObject({ key: 'code' })
  })

  it('keeps a 400 about the body an upload failure', async () => {
    const { bucket } = setup({ refuse: 400, name: 'EntityTooLarge' })

    await expect(bucket.put('code', 'x', { ifAbsent: true })).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })
  })

  it('cannot tell when the backend ignores the header and overwrites', async () => {
    // The documented risk: nothing to catch without a read after the write.
    const { bucket } = setup('ignored')

    await bucket.put('code', 'first', { ifAbsent: true })
    await expect(bucket.put('code', 'second', { ifAbsent: true })).resolves.toBeDefined()
    expect(await (await bucket.get('code'))!.text()).toBe('second')
  })
})
