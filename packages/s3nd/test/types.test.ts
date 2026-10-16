import { describe, expectTypeOf, it } from 'vitest'

import { createBucket, type PutOptions, type Snapshot, type UploadBody, type UploadOptions } from '../src/index.js'
import { createMemoryClient } from './helpers.js'

// The assertions here are checked by `tsc` (`bun run type-check` covers the
// test directory), not at run time: vitest only sees empty bodies. They pin
// down what the public generics resolve to, the part of the API a consumer
// gets silently wrong when it drifts.

interface Note {
  id: number
  title: string
}

const bucket = createBucket({ bucket: 'assets', client: createMemoryClient().client })

describe('public types', () => {
  it('types a snapshot by its generic, and defaults it to unknown', async () => {
    expectTypeOf(await bucket.getSnapshot<Note[]>('code')).toEqualTypeOf<Snapshot<Note[]> | null>()
    expectTypeOf(await bucket.getSnapshot('code')).toEqualTypeOf<Snapshot<unknown> | null>()
    expectTypeOf<Snapshot<Note[]>['data']>().toEqualTypeOf<Note[]>()
  })

  it('leaves the key out of put options, since put takes it as an argument', () => {
    expectTypeOf<PutOptions>().not.toHaveProperty('key')
    expectTypeOf<UploadOptions>().toHaveProperty('key')
  })

  it('accepts every documented body', () => {
    expectTypeOf<string>().toExtend<UploadBody>()
    expectTypeOf<Uint8Array>().toExtend<UploadBody>()
    expectTypeOf<ArrayBuffer>().toExtend<UploadBody>()
    expectTypeOf<Blob>().toExtend<UploadBody>()
    expectTypeOf<ReadableStream>().toExtend<UploadBody>()
    expectTypeOf<number>().not.toExtend<UploadBody>()
  })
})
