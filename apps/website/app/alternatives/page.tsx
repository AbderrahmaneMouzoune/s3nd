import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { alternativesIn, categories, type AlternativeCategory } from '@/lib/alternatives'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Alternatives and comparisons',
  description:
    'How s3nd compares with Magic Wormhole, croc, WeTransfer, PairDrop, Dexie Cloud, PowerSync, ElectricSQL, Replicache, PouchDB, Firebase and rclone. Where they overlap, where they differ, and which to pick.',
  path: '/alternatives',
  keywords: ['s3nd alternatives', 'file transfer tool comparison', 'local-first sync comparison'],
})

const ORDER: AlternativeCategory[] = ['file-transfer', 'file-sharing', 'sync-engine', 'storage-tooling']

export default function AlternativesPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'Alternatives', href: '/alternatives' }]}
        eyebrow="Compared"
        title="Sometimes another tool is the right answer."
        lead="s3nd sits between three kinds of tools: code-based file transfer, file sharing for people, and local-first sync engines. Each page describes the other tool in its own terms first, then where the two part ways, and says plainly when to pick it."
        actions={
          <ButtonLink href="/how-it-works" variant="secondary">
            How s3nd works
          </ButtonLink>
        }
      />

      {ORDER.map((category, index) => (
        <Section
          key={category}
          id={category}
          eyebrow={categories[category].title}
          title={categories[category].blurb}
          className={index % 2 === 1 ? 'bg-surface-muted/60' : undefined}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alternativesIn(category).map((alternative) => (
              <CardLink
                key={alternative.slug}
                href={`/alternatives/${alternative.slug}`}
                title={`s3nd vs ${alternative.name}`}
                meta={alternative.matrix.license}
              >
                {alternative.headline}
              </CardLink>
            ))}
          </div>
        </Section>
      ))}

      <Cta />
    </>
  )
}
