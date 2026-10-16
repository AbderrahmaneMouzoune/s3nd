import { writeFile } from 'node:fs/promises'

import { CliError } from './errors.js'

/**
 * The stored filename comes from whoever sent the transfer, so it is a name and
 * nothing more: no directory, from either kind of separator, no control
 * characters, no leading dots. When nothing survives, the code stands in.
 */
export function safeFilename(received: string | undefined, fallback: string): string {
  const name = (received ?? '')
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim()

  return name.length > 0 ? name : fallback
}

/**
 * Writes what `get` received, refusing to replace a file that is already there
 * unless `force`. The check and the write are one call, so nothing can slip in
 * between them.
 */
export async function writeReceived(destination: string, data: string | Uint8Array, force: boolean): Promise<void> {
  try {
    await writeFile(destination, data, { flag: force ? 'w' : 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error

    throw new CliError(
      `${destination} already exists.`,
      'Pass --force to replace it, or -o <path> to write somewhere else.',
    )
  }
}
