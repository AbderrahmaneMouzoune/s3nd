import type { Metadata } from 'next'

import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { Rich } from '@/components/rich-text'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { getDictionary, localeFrom, localePath } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export async function generateMetadata({ params }: PageProps<'/[locale]/cli'>): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).cli

  return pageMetadata({
    locale,
    title: t.metaTitle,
    description: t.metaDescription,
    path: '/cli',
    keywords: t.keywords,
  })
}

const INIT = `$ s3nd init --provider r2 --bucket transfers
Wrote /home/you/transfers/s3nd.config.json

Put the three values in .env, and keep it out of git:
  R2_ACCOUNT_ID=…
  R2_ACCESS_KEY_ID=…
  R2_SECRET_ACCESS_KEY=…
The R2 API token needs Object Read & Write on this bucket, and nothing else.
Give the bucket a lifecycle rule that deletes objects under "transfers/" after a day or two.
Run \`s3nd doctor\` — it performs the operations s3nd needs and reports what happened.`

const DOCTOR = `$ s3nd doctor
Using /home/you/transfers/s3nd.config.json
✓ Configuration: bucket "transfers", region "auto"
✓ Credentials: resolved, key ends in 1a2b
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no enabled expiration rule
  → Add an S3 lifecycle rule that expires objects under this bucket after a day or
    two. Without it, expired transfers stay stored and billed.

1 check(s) failed.`

const PUT_GET = `$ s3nd put ./report.pdf
report.pdf · 284 kB · expires in 1 day
K7QP2M4X

$ CODE=$(s3nd put ./report.pdf)          # the code is stdout, the rest is stderr
$ tar cz ./project | s3nd put - --name project.tar.gz

# on the other machine
$ s3nd get K7QP2M4X
Wrote /home/you/report.pdf · 284 kB

$ s3nd get K7QP2M4X -o -  | less        # or to stdout
$ s3nd rm K7QP2M4X
Burned K7QP2M4X`

const CONFIG_FILE = `{
  "envFile": ".env",
  "profiles": {
    "r2": {
      "bucket": "transfers",
      "region": "auto",
      "endpoint": "https://\${R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
      "expiresIn": "24h",
      "credentials": { "accessKeyId": "\${R2_ACCESS_KEY_ID}", "secretAccessKey": "\${R2_SECRET_ACCESS_KEY}" }
    },
    "local": { "bucket": "transfers", "endpoint": "http://localhost:9000" },
    "prod":  { "remote": "https://drop.example.com/api/transfers", "token": "\${S3ND_TOKEN}" }
  }
}`

const PROFILES = `$ s3nd -p local doctor          # against a MinIO container, offline
$ s3nd -p r2 put ./report.pdf
$ s3nd -p prod put ./report.pdf # through your server, with a token

$ s3nd config                   # which value won, and where it came from
file         /home/you/transfers/s3nd.config.json (profile "r2")
mode         straight to S3
bucket       transfers                                 $S3ND_BUCKET
endpoint     https://8c4….r2.cloudflarestorage.com     s3nd.config.json (r2)
credentials  …1a2b                                     s3nd.config.json (r2)
expires in   1 day                                     s3nd.config.json (r2)`

const REMOTE = `$ s3nd --remote https://drop.example.com/api/transfers --token "$TOKEN" put ./report.pdf
K7QP2M4X

$ s3nd doctor --remote https://drop.example.com/api/transfers --token "$TOKEN"
✓ Server: https://drop.example.com/api/transfers answered
✓ Create, read, delete: round-tripped code 8WTXQC8R`

export default async function CliPage({ params }: PageProps<'/[locale]/cli'>) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale).cli
  const p = (path: string) => localePath(locale, path)

  return (
    <>
      <PageHero
        locale={locale}
        trail={[{ label: t.crumb, href: '/cli' }]}
        eyebrow={packages.cli.name}
        title={t.title}
        lead={t.lead}
        actions={
          <>
            <ButtonLink href={docs('/cli')} size="lg" external>
              {t.primary}
            </ButtonLink>
            <ButtonLink href={docs('/no-server')} variant="secondary" size="lg" external>
              {t.secondary}
            </ButtonLink>
            <ButtonLink href={packages.cli.npm} variant="ghost" size="lg" external>
              {t.ghost}
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Command>{packages.cli.install}</Command>
              <Command>npx @s3nd/cli doctor</Command>
            </div>
            <CodeBlock code={PUT_GET} lang="sh" />
          </div>
        }
      />

      <Section eyebrow={t.initDoctor.eyebrow} title={t.initDoctor.title} lead={t.initDoctor.lead}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={INIT} lang="sh" title={t.initDoctor.initTitle} />
          <CodeBlock code={DOCTOR} lang="sh" title={t.initDoctor.doctorTitle} />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.initDoctor.body} />
        </p>
      </Section>

      <Section eyebrow={t.config.eyebrow} title={t.config.title} lead={t.config.lead}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={CONFIG_FILE} lang="json" title="s3nd.config.json" />
          <CodeBlock code={PROFILES} lang="sh" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.config.body} />
        </p>
        <div className="mt-4 text-sm">
          <TextLink href={p('/use-cases/ci-backups')}>{t.config.link}</TextLink>
        </div>
      </Section>

      <Section eyebrow={t.remote.eyebrow} title={t.remote.title} lead={t.remote.lead}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={REMOTE} lang="sh" />
          <div className="space-y-4 text-sm leading-relaxed">
            {t.remote.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
            <TextLink href={docs('/server')} external>
              {t.remote.link}
            </TextLink>
          </div>
        </div>
      </Section>

      <Section eyebrow={t.reference.eyebrow} title={t.reference.title}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              {t.reference.commandsTitle}
            </h3>
            <dl className="divide-line divide-y text-sm">
              {t.reference.commands.map((entry) => (
                <div
                  key={entry.term}
                  className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
                >
                  <dt className="font-mono text-xs leading-relaxed">{entry.term}</dt>
                  <dd className="text-ink-muted leading-relaxed">{entry.body}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              {t.reference.optionsTitle}
            </h3>
            <dl className="divide-line divide-y text-sm">
              {t.reference.options.map((entry) => (
                <div
                  key={entry.term}
                  className="hover:bg-surface-muted grid gap-1 px-5 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
                >
                  <dt className="font-mono text-xs leading-relaxed">{entry.term}</dt>
                  <dd className="text-ink-muted leading-relaxed">{entry.body}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          <Rich text={t.reference.body} />
        </p>
      </Section>

      <Cta locale={locale} />
    </>
  )
}
