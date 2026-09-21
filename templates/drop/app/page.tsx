import { Drop } from '@/components/drop'
import { dropConfig } from '@/lib/config'

/**
 * The upload page. The limits are read once, at build time, and shown as
 * hints; the handler enforces them on every request regardless.
 */
export default function HomePage() {
  return <Drop maxSize={dropConfig.maxSize} expiresIn={dropConfig.expiresIn} />
}
