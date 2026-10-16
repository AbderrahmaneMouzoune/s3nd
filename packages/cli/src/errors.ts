/**
 * Shared by every s3nd error class, in every package. `Symbol.for` hands back
 * the same symbol to every copy of every module, so the guard below holds even
 * where `instanceof` would not: two copies of this module, two classes.
 */
const BRAND = Symbol.for('s3nd.error')

/**
 * An error the reader can do something about: a typo, a missing file, a value
 * the configuration cannot hold. It prints as its message and nothing else —
 * no stack, no class name — because everything it says is already the answer.
 */
export class CliError extends Error {
  constructor(
    message: string,
    /** Printed under the message, indented: the command that fixes it. */
    readonly hint?: string,
  ) {
    super(message)
    this.name = 'CliError'
    Object.defineProperty(this, BRAND, { value: 'CliError' })
  }
}

export function isCliError(error: unknown): error is CliError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<symbol, unknown>)[BRAND] === 'CliError' &&
    (error as Error).name === 'CliError'
  )
}
