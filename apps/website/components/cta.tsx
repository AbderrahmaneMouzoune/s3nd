import { docs, repositoryUrl } from '@/lib/site'

import { Command } from './code-block'
import { ButtonLink, Container } from './ui'

/** The closing band on every page. */
export function Cta() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="border-line bg-surface shadow-card relative overflow-hidden rounded-3xl border px-6 py-12 sm:px-12 sm:py-16">
          <div className="ticket-edge absolute inset-x-0 top-0" aria-hidden="true" />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Two routes on the server, two calls in the browser.
              </h2>
              <p className="text-ink-muted mt-4 max-w-lg text-lg text-pretty">
                Or one command in a terminal. Point it at the bucket you already have and hand someone a code.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={docs('/quick-start')} external>
                  Quick start
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="secondary" external>
                  GitHub
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Command>npm install s3nd</Command>
              <Command>npm install @s3nd/react</Command>
              <Command>npx @s3nd/cli doctor</Command>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
