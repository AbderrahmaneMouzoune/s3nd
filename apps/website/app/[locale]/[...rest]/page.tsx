import { notFound } from 'next/navigation'

/**
 * Every path under a locale that no page claims ends here, which is what
 * renders the 404 inside the locale layout rather than Next's bare one.
 */
export default function CatchAll() {
  notFound()
}
