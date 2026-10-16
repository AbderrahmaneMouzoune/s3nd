import { describe, expect, it } from 'vitest'

import { createBucket } from '../src/bucket.js'
import { isS3ndError, isTransferError, syncCodeAlphabets, type S3ndError, type TransferError } from '../src/index.js'
import { createStubClient } from './helpers.js'

describe('store.codes', () => {
  it('follows the scheme configured on the bucket', () => {
    const { client } = createStubClient()
    const store = createBucket({
      bucket: 'assets',
      syncCode: { length: 4, alphabet: syncCodeAlphabets.digits },
      client,
    })

    expect(store.codes.create()).toMatch(/^\d{4}$/)
    expect(store.codes.normalize('1-2 3O')).toBe('1230')
    expect(store.codes.length).toBe(4)
  })

  it('defaults to the Crockford scheme', () => {
    const { client } = createStubClient()
    const store = createBucket({ bucket: 'assets', client })

    expect(store.codes.alphabet).toBe(syncCodeAlphabets.crockford)
    expect(store.codes.create()).toHaveLength(8)
  })
})

describe('store.codes errors', () => {
  it('reads a code shape it cannot use as a configuration error', () => {
    const { client } = createStubClient()

    let caught: unknown
    try {
      createBucket({ bucket: 'assets', syncCode: { alphabet: 'A' }, client })
    } catch (error) {
      caught = error
    }

    expect(isS3ndError(caught)).toBe(true)
    expect((caught as S3ndError).code).toBe('INVALID_CONFIG')
    expect((caught as S3ndError).message).toMatch(/syncCode.*at least two characters/)
    expect((caught as S3ndError).cause).toBeInstanceOf(TypeError)
  })

  it('refuses a typed code with the TransferError a client would get', () => {
    const { client } = createStubClient()
    const store = createBucket({ bucket: 'assets', client })

    let caught: unknown
    try {
      store.codes.normalize('nope!')
    } catch (error) {
      caught = error
    }

    expect(isTransferError(caught)).toBe(true)
    expect((caught as TransferError).code).toBe('INVALID_SYNC_CODE')
  })
})
