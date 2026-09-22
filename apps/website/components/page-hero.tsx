import type { ReactNode } from 'react'

import type { Locale } from '@/lib/i18n/config'

import { Breadcrumbs, type Crumb } from './breadcrumbs'
import { Container, Eyebrow } from './ui'

interface PageHeroProps {
  locale: Locale
  trail?: Crumb[]
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  /** Something to the right of the text on wide screens: a code block, a board. */
  aside?: ReactNode
  /** Something the full width of the hero, under the text: a scene. */
  below?: ReactNode
}

/** The top of every page but the home. Each block rises in turn on load. */
export function PageHero({ locale, trail, eyebrow, title, lead, actions, aside, below }: PageHeroProps) {
  return (
    <header className="relative pt-10 pb-14 sm:pt-14 sm:pb-20">
      <div className="grid-paper absolute inset-0 -z-10" aria-hidden="true" />
      <Container>
        {trail ? (
          <div className="rise">
            <Breadcrumbs locale={locale} trail={trail} />
          </div>
        ) : null}
        <div
          className={
            aside ? 'mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center' : 'mt-8'
          }
        >
          <div className="max-w-2xl">
            {eyebrow ? (
              <div className="rise rise-1">
                <Eyebrow>{eyebrow}</Eyebrow>
              </div>
            ) : null}
            <h1 className="rise rise-2 mt-4 text-5xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
              {title}
            </h1>
            {lead ? (
              <p className="rise rise-3 text-ink-muted mt-6 text-lg leading-relaxed text-pretty sm:text-xl">{lead}</p>
            ) : null}
            {actions ? <div className="rise rise-4 mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {aside ? <div className="rise rise-4 min-w-0">{aside}</div> : null}
        </div>
        {below ? <div className="rise rise-5 mt-10 min-w-0 sm:mt-14">{below}</div> : null}
      </Container>
    </header>
  )
}
