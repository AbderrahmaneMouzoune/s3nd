import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import { docs, repositoryUrl } from '@/lib/site'

import { Command } from './command'
import { ButtonLink, Container } from './ui'

/** The closing band on every page. */
export function Cta({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).cta

  return (
    <section className="border-line border-t py-16 sm:py-24">
      <Container>
        <div
          className="border-line-strong bg-surface shadow-card relative overflow-hidden rounded-xl border"
          data-reveal=""
        >
          <div className="hazard h-3" aria-hidden="true" />
          <div className="grid gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">{t.title}</h2>
              <p className="text-ink-muted mt-5 max-w-lg text-lg text-pretty">{t.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={localePath(locale, '/cli')} size="lg">
                  {t.primary}
                </ButtonLink>
                <ButtonLink href={docs('/quick-start')} variant="secondary" size="lg" external>
                  {t.secondary}
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="ghost" size="lg" external>
                  {t.ghost}
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {t.commands.map((command) => (
                <Command key={command}>{command}</Command>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
