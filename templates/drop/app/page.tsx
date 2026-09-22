import { Drop } from '@/components/drop'
import { dropConfig } from '@/lib/config'
import { expiryChoices } from '@/lib/options'

/**
 * Rendered per request rather than baked into the build: the form now decides
 * things the server will act on — how long a transfer lives above all — and a
 * page carrying a stale ceiling would offer choices the routes then clamp
 * behind the sender's back.
 */
export const dynamic = 'force-dynamic'

/**
 * The upload page. The limits are hints; the handler enforces them on every
 * request regardless. The choices are computed here rather than in the
 * browser, because the environment is the server's to know.
 */
export default function HomePage() {
  return (
    <Drop
      maxSize={dropConfig.maxSize}
      expiresIn={dropConfig.expiresIn}
      choices={expiryChoices(dropConfig)}
      preview={dropConfig.preview}
    />
  )
}
