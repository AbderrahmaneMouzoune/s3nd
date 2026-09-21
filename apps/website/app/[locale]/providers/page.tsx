import type { Metadata } from 'next'

import { CodeBlock } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, CardLink, Section } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { providers } from '@/lib/providers'
import { docs } from '@/lib/site'

export async function generateMetadata({ params }: PageProps<'/[locale]/providers'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).providers

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/providers',
    keywords: t.keywords,
  })
}

const ENDPOINT = `const store = createBucket({
  bucket: 'transfers',
  endpoint: 'https://…',   // set this, and two defaults follow:
  // region: 'auto'        // for providers that ignore the region
  // forcePathStyle: true  // https://endpoint/bucket/key
})`

export default async function ProvidersPage({ params }: PageProps<'/[locale]/providers'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).providers
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/providers' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <ButtonLink href={docs('/providers')} size="lg" external>
            {t.primary}
          </ButtonLink>
        }
        aside={<CodeBlock code={ENDPOINT} lang="ts" />}
      />

      <Section eyebrow={t.pick.eyebrow} title={t.pick.title}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers(locale).map((provider, index) => (
            <CardLink
              key={provider.slug}
              href={p(`/providers/${provider.slug}`)}
              title={provider.name}
              meta={`s3nd init --provider ${provider.initName}`}
              index={index}
            >
              {provider.tagline}
            </CardLink>
          ))}
        </div>
        <p className="text-ink-muted mt-8 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.notListed} />
        </p>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
