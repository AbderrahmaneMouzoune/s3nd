import type { Metadata } from 'next'

import { ButtonLink, CodeChip, Container } from '@/components/ui'
import { docs } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <Container className="py-24 text-center sm:py-32">
      <CodeChip code="404" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Unknown or expired code.</h1>
      <p className="text-ink-muted mx-auto mt-4 max-w-md text-lg text-pretty">
        Nothing is stored under this address. The page may have moved, or it never existed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to the start</ButtonLink>
        <ButtonLink href={docs()} variant="secondary" external>
          Documentation
        </ButtonLink>
      </div>
    </Container>
  )
}
