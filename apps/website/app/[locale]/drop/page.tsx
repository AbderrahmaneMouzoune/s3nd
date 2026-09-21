import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, Card, Section } from '@/components/ui'
import { getDictionary, localeFrom } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { dropTemplate } from '@/lib/site'

export async function generateMetadata({ params }: PageProps<'/[locale]/drop'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).drop

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/drop',
    keywords: t.keywords,
  })
}

const ENV = `S3ND_BUCKET=drop
S3ND_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3ND_REGION=auto
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…

# optional
DROP_PASSWORD=…              # ask for it before an upload
DROP_EXPIRES_IN=86400        # seconds, one day
DROP_MAX_SIZE_MB=4           # under Vercel's 4.5 MB request limit`

export default async function DropPage({ params }: PageProps<'/[locale]/drop'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).drop

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/drop' }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={dropTemplate.deployUrl} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={dropTemplate.source} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Command>npx degit AbderrahmaneMouzoune/s3nd/templates/drop my-drop</Command>
            </div>
            <CodeBlock code={ENV} lang="sh" title={t.setup.envTitle} />
          </div>
        }
      />

      <Section index="01" eyebrow={t.what.eyebrow} title={t.what.title} lead={t.what.lead}>
        <div className="grid gap-6 md:grid-cols-2">
          {t.what.cards.map((card, index) => (
            <Card key={card.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-bold tracking-tight">{card.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={card.body} />
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section index="02" eyebrow={t.setup.eyebrow} title={t.setup.title} lead={t.setup.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <ol className="space-y-4 text-sm leading-relaxed">
            {t.setup.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="text-accent font-mono text-xs">0{index + 1}</span>
                <span className="min-w-0">
                  <Rich text={step} />
                </span>
              </li>
            ))}
          </ol>
          <div className="min-w-0 space-y-3">
            <Command>cp .env.example .env.local</Command>
            <Command>npm install && npm run dev</Command>
            <ButtonLink href={dropTemplate.deployUrl} size="lg" external className="mt-2">
              {t.primary}
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section index="03" eyebrow={t.limits.eyebrow} title={t.limits.title}>
        <div className="grid gap-6 md:grid-cols-3">
          {t.limits.cards.map((card, index) => (
            <Card key={card.title} data-reveal="" style={{ '--stagger': index } as CSSProperties}>
              <h3 className="font-semibold tracking-tight">{card.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                <Rich text={card.body} />
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
