import { dropConfig } from '@/lib/config'
import { isUnlocked, readGuard } from '@/lib/guard'
import { PROTECTED_HEADER } from '@/lib/options'
import { inlinePreviewType } from '@/lib/preview'
import { normalizeCode, transfers } from '@/lib/transfers'

export const dynamic = 'force-dynamic'

/** The name out of the `attachment; filename*=UTF-8''…` the raw route sends. */
function filenameOf(disposition: string | null): string | undefined {
  const match = disposition?.match(/filename\*=UTF-8''([^;]+)/i)
  if (!match?.[1]) return undefined

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/**
 * The same bytes as `/api/transfers/:code/raw`, served to be looked at rather
 * than saved: `inline`, so an `<img>`, a `<video>` or a PDF frame renders it
 * where it sits. Nothing else differs — same expiry, same password, and a
 * preview never burns a one-time code. Only the download does.
 *
 * A preview pulls the object through the function exactly like a download, so
 * `DROP_PREVIEW_MAX_MB` puts a ceiling on what is rendered; above it, the
 * pickup page describes the file instead of showing it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!dropConfig.preview) return new Response(null, { status: 404 })

  const code = normalizeCode((await params).code)
  if (code === null) return new Response(null, { status: 400 })

  const guard = await readGuard(code)
  if (!(await isUnlocked(code, guard, request))) {
    return new Response(null, { status: 401, headers: { [PROTECTED_HEADER]: '1' } })
  }

  // Streamed rather than presigned whatever DROP_RAW_MODE says: a redirect
  // would send the browser to a URL that downloads instead of rendering.
  const response = await transfers({ raw: 'stream' })(new Request(`http://drop.internal/api/transfers/${code}/raw`))

  if (!response.ok) return new Response(null, { status: response.status })

  const size = Number(response.headers.get('content-length') ?? '0')
  if (size > dropConfig.previewMaxSize) {
    await response.body?.cancel()

    return new Response(null, { status: 413 })
  }

  const filename = filenameOf(response.headers.get('content-disposition'))
  const type = inlinePreviewType(response.headers.get('content-type') ?? undefined, filename)

  if (type === null) {
    await response.body?.cancel()

    return new Response(null, { status: 415 })
  }

  const headers = new Headers({
    'content-type': type,
    'content-disposition': 'inline',
    'cache-control': 'private, no-store',
    // Bytes somebody else uploaded, served from this origin: the type is not
    // to be second-guessed, and the document is not to be this origin's.
    // `allow-scripts` is what a built-in PDF viewer needs, and it buys the
    // document nothing here: a sandbox is an origin of its own.
    'x-content-type-options': 'nosniff',
    'content-security-policy': type === 'application/pdf' ? 'sandbox allow-scripts' : 'sandbox',
  })
  if (size > 0) headers.set('content-length', String(size))

  return new Response(response.body, { headers })
}
