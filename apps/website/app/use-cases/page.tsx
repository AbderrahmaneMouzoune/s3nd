import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { useCases } from '@/lib/use-cases'

export const metadata = pageMetadata({
  title: 'Use cases',
  description:
    'What people move with s3nd: a file between two machines, a drop box for a team, backups from CI, and a local-first app carried to a new device, backed up continuously, or encrypted end to end.',
  path: '/use-cases',
  keywords: ['file transfer use cases', 'self-hosted file drop', 'local-first sync use cases'],
})

export default function UseCasesPage() {
  const files = useCases.filter((useCase) => useCase.kind === 'files')
  const appState = useCases.filter((useCase) => useCase.kind === 'app-state')

  return (
    <>
      <PageHero
        trail={[{ label: 'Use cases', href: '/use-cases' }]}
        eyebrow="Use cases"
        title="One primitive, seven shapes."
        lead="A file between two machines is the plain case. The same put, code, get covers a team, a workflow, and an application carrying its own state to the user's next device."
        actions={<ButtonLink href="/cli">Install the CLI</ButtonLink>}
      />

      <Section
        index="01"
        eyebrow="Files"
        title="Machines, people, pipelines."
        lead="The CLI straight to the bucket when every participant is a machine you control, and one route on your server when it is not."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((useCase) => (
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
        index="02"
        eyebrow="App state"
        title="A local-first app, on their other device."
        lead="The browser holds the data, your server holds the keys, and your bucket holds a snapshot for as long as it needs to. No account required."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {appState.map((useCase) => (
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
