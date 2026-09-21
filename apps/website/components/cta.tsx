import { docs, repositoryUrl } from '@/lib/site'

import { Command } from './code-block'
import { ButtonLink, Container } from './ui'

/** The closing band on every page. */
export function Cta() {
  return (
    <section className="border-line border-t py-16 sm:py-24">
      <Container>
        <div className="border-line-strong bg-surface shadow-card relative overflow-hidden rounded-xl border">
          <div className="hazard h-3" aria-hidden="true" />
          <div className="grid gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
                Put a file. Hand over the code.
              </h2>
              <p className="text-ink-muted mt-5 max-w-lg text-lg text-pretty">
                Point it at the bucket you already pay for. Nothing to deploy, nothing to sign up for, nothing in the
                middle.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/cli">Install the CLI</ButtonLink>
                <ButtonLink href={docs('/quick-start')} variant="secondary" external>
                  Put it in your app
                </ButtonLink>
                <ButtonLink href={repositoryUrl} variant="ghost" external>
                  GitHub
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Command>npm install -g @s3nd/cli</Command>
              <Command>s3nd init --provider r2 --bucket drop</Command>
              <Command>s3nd put ./anything.zip</Command>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
