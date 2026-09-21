import type { ReactNode } from 'react'

import { Breadcrumbs, type Crumb } from './breadcrumbs'
import { Container, Eyebrow } from './ui'

interface PageHeroProps {
  trail?: Crumb[]
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  /** Something to the right of the text on wide screens: a code block, a board. */
  aside?: ReactNode
}

export function PageHero({ trail, eyebrow, title, lead, actions, aside }: PageHeroProps) {
  return (
    <header className="relative pt-10 pb-14 sm:pt-14 sm:pb-20">
      <div className="grid-paper absolute inset-0 -z-10" aria-hidden="true" />
      <Container>
        {trail ? <Breadcrumbs trail={trail} /> : null}
        <div
          className={
            aside ? 'mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center' : 'mt-8'
          }
        >
          <div className="max-w-2xl">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">{title}</h1>
            {lead ? <p className="text-ink-muted mt-6 text-lg leading-relaxed text-pretty sm:text-xl">{lead}</p> : null}
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {aside ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </Container>
    </header>
  )
}
