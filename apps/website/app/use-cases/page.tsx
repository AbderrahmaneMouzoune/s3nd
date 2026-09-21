import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs } from '@/lib/site'
import { useCases } from '@/lib/use-cases'

export const metadata = pageMetadata({
  title: 'Use cases',
  description:
    'What people build with s3nd: moving a local-first app to a new device, continuous backup, end-to-end encrypted sync, attachments beside the data, a file between two machines, and backups from CI.',
  path: '/use-cases',
  keywords: ['local-first use cases', 'indexeddb sync use cases', 'file transfer cli use cases'],
})

export default function UseCasesPage() {
  const app = useCases.filter((useCase) => !useCase.packages.includes('@s3nd/cli'))
  const cli = useCases.filter((useCase) => useCase.packages.includes('@s3nd/cli'))

  return (
    <>
      <PageHero
        trail={[{ label: 'Use cases', href: '/use-cases' }]}
        eyebrow="Use cases"
        title="One primitive, six shapes."
        lead="The flagship case is a new phone with no account to sign into. The same snapshot-and-code primitive covers the cases around it, in an app and from a terminal."
        actions={
          <ButtonLink href={docs('/quick-start')} external>
            Quick start
          </ButtonLink>
        }
      />

      <Section
        eyebrow="In an application"
        title="A local-first app, on their other device."
        lead="The browser holds the data, your server holds the keys, and your bucket holds a snapshot for as long as it needs to."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {app.map((useCase) => (
            <CardLink
              key={useCase.slug}
              href={`/use-cases/${useCase.slug}`}
              title={useCase.title}
              meta={useCase.packages.join(' · ')}
            >
              {useCase.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="From a terminal"
        title="Machines you control, and nothing deployed."
        lead="When every participant holds the credentials, the CLI talks to the bucket directly and there is nothing to run between the two ends."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {cli.map((useCase) => (
            <CardLink
              key={useCase.slug}
              href={`/use-cases/${useCase.slug}`}
              title={useCase.title}
              meta={useCase.packages.join(' · ')}
            >
              {useCase.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Cta />
    </>
  )
}
