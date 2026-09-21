import { timingSafeEqual } from 'node:crypto'

import { createTransferHandler, type TransferHandler } from 's3nd'

import { dropConfig } from './config'
import { store } from './store'

/** Compares two strings without leaking, through timing, where they differ. */
function sameSecret(given: string | null, expected: string): boolean {
  if (given == null) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)

  return a.length === b.length && timingSafeEqual(a, b)
}

let handler: TransferHandler | undefined

/**
 * The four-route transfer protocol, served by `app/api/transfers` and called
 * in-process by the pickup page. Uploading needs the password when one is
 * set; reading and burning a code never do, because the code is the secret.
 */
export function transfers(): TransferHandler {
  handler ??= createTransferHandler({
    bucket: store(),
    basePath: '/api/transfers',
    app: dropConfig.name,
    expiresIn: dropConfig.expiresIn,
    raw: dropConfig.rawMode,
    authorize: (request) => {
      if (request.method !== 'POST' || !dropConfig.password) return true

      const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
      return sameSecret(bearer, dropConfig.password)
    },
  })

  return handler
}
