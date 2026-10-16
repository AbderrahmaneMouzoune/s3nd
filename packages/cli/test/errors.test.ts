import { describe, expect, it, vi } from 'vitest'

import { CliError, isCliError } from '../src/errors.js'

describe('isCliError', () => {
  it('recognises a CliError', () => {
    expect(isCliError(new CliError('No such file.', 'Pass "-" for stdin.'))).toBe(true)
  })

  it('recognises one built by a second copy of the module', async () => {
    // Two copies of a module mean two classes, and `instanceof` answers false.
    vi.resetModules()
    const copy = await import('../src/errors.js')
    const foreign = new copy.CliError('No such file.')

    expect(copy.CliError).not.toBe(CliError)
    expect(foreign instanceof CliError).toBe(false)
    expect(isCliError(foreign)).toBe(true)
  })

  it('does not take a lookalike for one', () => {
    expect(isCliError(Object.assign(new Error('x'), { name: 'CliError' }))).toBe(false)
    expect(isCliError(undefined)).toBe(false)
  })
})
