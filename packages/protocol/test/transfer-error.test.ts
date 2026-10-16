import { describe, expect, it, vi } from 'vitest'

import { isTransferError, TransferError } from '../src/index.js'

describe('isTransferError', () => {
  it('recognises a TransferError', () => {
    expect(isTransferError(new TransferError('NOT_FOUND', 'Gone.'))).toBe(true)
  })

  it('recognises one built by a second copy of the module', async () => {
    // What an application gets when one dependency `require`s this package and
    // another `import`s it: two classes, so `instanceof` answers false.
    vi.resetModules()
    const copy = await import('../src/transfer-error.js')
    const foreign = new copy.TransferError('NOT_FOUND', 'Gone.')

    expect(copy.TransferError).not.toBe(TransferError)
    expect(foreign instanceof TransferError).toBe(false)
    expect(isTransferError(foreign)).toBe(true)
    expect(copy.isTransferError(new TransferError('NOT_FOUND', 'Gone.'))).toBe(true)
  })

  it('does not take a lookalike for one', () => {
    const lookalike = Object.assign(new Error('Gone.'), { name: 'TransferError', code: 'NOT_FOUND' })

    expect(isTransferError(lookalike)).toBe(false)
    expect(isTransferError(null)).toBe(false)
    expect(isTransferError('TransferError')).toBe(false)
  })

  it('does not take another s3nd error for one', () => {
    const other = new Error('x')
    Object.defineProperty(other, Symbol.for('s3nd.error'), { value: 'S3ndError' })

    expect(isTransferError(other)).toBe(false)
  })
})
