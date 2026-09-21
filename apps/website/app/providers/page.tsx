import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, CardLink, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { providers } from '@/lib/providers'
import { docs } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Storage providers',
  description:
    's3nd works with AWS S3 and any S3-compatible storage: Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi. The endpoint is the only difference, and the CLI writes a starter configuration for each.',
  path: '/providers',
  keywords: ['s3 compatible storage', 'cloudflare r2 minio scaleway wasabi', 's3nd providers'],
})

const ENDPOINT = `const store = createBucket({
  bucket: 'transfers',
  endpoint: 'https://…',   // set this, and two defaults follow:
  // region: 'auto'        // for providers that ignore the region
  // forcePathStyle: true  // https://endpoint/bucket/key
})`

export default function ProvidersPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'Providers', href: '/providers' }]}
        eyebrow="Your bucket"
        title="Any storage that speaks S3."
        lead="Set an endpoint and s3nd adjusts the two defaults S3-compatible providers expect. Both stay overridable. The CLI writes a starter configuration for each provider, and doctor tells you whether it actually works."
        actions={
          <ButtonLink href={docs('/providers')} external>
            Providers in the docs
          </ButtonLink>
        }
        aside={<CodeBlock code={ENDPOINT} lang="ts" />}
      />

      <Section eyebrow="Providers" title="Pick yours.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <CardLink
              key={provider.slug}
              href={`/providers/${provider.slug}`}
              title={provider.name}
              meta={`s3nd init --provider ${provider.initName}`}
            >
              {provider.tagline}
            </CardLink>
          ))}
        </div>
        <p className="text-ink-muted mt-8 max-w-2xl text-sm leading-relaxed">
          Not listed? Ceph, Garage, SeaweedFS, Backblaze B2, DigitalOcean Spaces and the rest work the same way: an
          endpoint, a key pair, and <code className="font-mono">s3nd doctor</code> to confirm the conditional writes are
          honoured. <TextLink href="/cli">The CLI</TextLink> has the details.
        </p>
      </Section>

      <Cta />
    </>
  )
}
