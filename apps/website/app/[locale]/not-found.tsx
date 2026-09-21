import { NotFoundContent } from '@/components/not-found-content'
import { en } from '@/lib/i18n/en'
import { fr } from '@/lib/i18n/fr'

/**
 * The 404, inside the locale layout. A not-found boundary gets no params, so
 * the copy for both languages goes down and the client picks the one the
 * layout's provider announced.
 */
export default function NotFound() {
  return <NotFoundContent copy={{ en: en.notFound, fr: fr.notFound }} />
}
