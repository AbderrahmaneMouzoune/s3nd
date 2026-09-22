import { isUnlocked, passphraseMatches, readGuard, unlockCookieName, unlockToken } from '@/lib/guard'
import { normalizeCode } from '@/lib/transfers'

export const dynamic = 'force-dynamic'

/**
 * "I know the password." Typing it once here hands the browser a cookie for
 * this one code, so the pickup page, the preview and the download all work
 * afterwards without the password travelling again — an `<img>` cannot send a
 * header, and a download link cannot either.
 *
 * The cookie is the session's: close the browser and the code locks again. It
 * holds a value derived from the stored hash, so it cannot be forged from the
 * code, and it stops meaning anything the moment the transfer is gone.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code)
  if (code === null) return Response.json({ error: { code: 'INVALID_SYNC_CODE' } }, { status: 400 })

  const guard = await readGuard(code)

  // Nothing to unlock — either the code has no password, or the request
  // already carries proof of it.
  if (!guard?.password || (await isUnlocked(code, guard, request))) {
    return new Response(null, { status: 204 })
  }

  const body = (await request.json().catch(() => null)) as { passphrase?: unknown } | null
  const passphrase = typeof body?.passphrase === 'string' ? body.passphrase : ''

  if (!passphrase || !(await passphraseMatches(guard.password, passphrase))) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'That password does not open this code.' } },
      { status: 401 },
    )
  }

  const secure = new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const cookie = [
    `${unlockCookieName(code)}=${encodeURIComponent(unlockToken(guard.password))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return new Response(null, { status: 204, headers: { 'set-cookie': cookie } })
}
