'use client'

import { localePath, type Locale } from '@/lib/i18n/config'
import { docs } from '@/lib/site'

import { useLocale } from './locale-provider'
import { ButtonLink, CodeChip, Container } from './ui'

interface NotFoundCopy {
  heading: string
  body: string
  back: string
  docs: string
}

export function NotFoundContent({ copy }: { copy: Record<Locale, NotFoundCopy> }) {
  const { locale } = useLocale()
  const t = copy[locale]

  return (
    <Container className="py-24 text-center sm:py-32">
      <div className="rise">
        <CodeChip code="404" />
      </div>
      <h1 className="rise rise-1 mt-6 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">{t.heading}</h1>
      <p className="rise rise-2 text-ink-muted mx-auto mt-4 max-w-md text-lg text-pretty">{t.body}</p>
      <div className="rise rise-3 mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={localePath(locale, '/')} size="lg">
          {t.back}
        </ButtonLink>
        <ButtonLink href={docs()} variant="secondary" size="lg" external>
          {t.docs}
        </ButtonLink>
      </div>
    </Container>
  )
}
