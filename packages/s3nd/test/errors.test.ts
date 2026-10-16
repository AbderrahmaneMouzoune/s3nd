import { describe, expect, it, vi } from 'vitest'

import { isS3ndError, isTransferError, S3ndError, TransferError } from '../src/index.js'

describe('isS3ndError', () => {
  it('recognises a S3ndError', () => {
    expect(isS3ndError(new S3ndError('GET_FAILED', 'Down.'))).toBe(true)
  })

  it('recognises one built by a second copy of the module', async () => {
    // What an application gets when one dependency `require`s this package and
    // another `import`s it: two classes, so `instanceof` answers false.
    vi.resetModules()
    const copy = await import('../src/errors.js')
    const foreign = new copy.S3ndError('GET_FAILED', 'Down.')

    expect(copy.S3ndError).not.toBe(S3ndError)
    expect(foreign instanceof S3ndError).toBe(false)
    expect(isS3ndError(foreign)).toBe(true)
    expect(copy.isS3ndError(new S3ndError('GET_FAILED', 'Down.'))).toBe(true)
  })

  it('does not take a lookalike or a TransferError for one', () => {
    const lookalike = Object.assign(new Error('Down.'), { name: 'S3ndError', code: 'GET_FAILED' })

    expect(isS3ndError(lookalike)).toBe(false)
    expect(isS3ndError(new TransferError('NOT_FOUND', 'Gone.'))).toBe(false)
    expect(isTransferError(new S3ndError('GET_FAILED', 'Down.'))).toBe(false)
  })
})
