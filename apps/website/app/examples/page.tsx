import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, CardLink, Pill, Section, TextLink } from '@/components/ui'
import { examples, guides } from '@/lib/examples'
import { pageMetadata } from '@/lib/metadata'
import { github, repositoryUrl } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Examples',
  description:
    'Runnable s3nd examples: a Next.js notes app that moves its IndexedDB between browsers with a code, and a Node script that round-trips a snapshot and proves the conditional writes. Plus the worked guides in the documentation.',
  path: '/examples',
  keywords: ['s3nd example', 'indexeddb sync example nextjs', 's3 snapshot example node'],
})

const MINIO = `docker run -p 9000:9000 -p 9001:9001 \\
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \\
  quay.io/minio/minio server /data --console-address ":9001"`

const OUTPUT = `code      ZZWMBSTD
stored    1826 bytes gzipped, from 22991 raw (12.6x)
typed     "zzwm-bstd" → ZZWMBSTD
restored  200 notes from node-script, written 2026-08-27T14:29:20.442Z
identical true
claim     rejected as PRECONDITION_FAILED
ifMatch   rejected as PRECONDITION_FAILED
burned    gone`

export default function ExamplesPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'Examples', href: '/examples' }]}
        eyebrow="Examples"
        title="Runnable, in the repository."
        lead="Two examples you can clone and run, and the worked guides in the documentation. Both examples point at a local MinIO by default, so the real code path runs on your laptop with nothing to sign up for."
        actions={
          <>
            <ButtonLink href={github('examples')} external>
              Browse the examples
            </ButtonLink>
            <ButtonLink href={repositoryUrl} variant="secondary" external>
              GitHub
            </ButtonLink>
          </>
        }
        aside={<CodeBlock code={MINIO} lang="sh" title="a bucket on your laptop" />}
      />

      {examples.map((example, index) => (
        <Section
          key={example.slug}
          id={example.slug}
          eyebrow={`examples/${example.slug}`}
          title={example.title}
          lead={example.summary}
          className={index % 2 === 1 ? 'bg-surface-muted/60' : undefined}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h3 className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">Worth noticing</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
                {example.shows.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="bg-accent mt-2 inline-block size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {example.stack.map((item) => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <TextLink href={example.source} external>
                  Source on GitHub
                </TextLink>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <CodeBlock code={example.run} lang="sh" title="run it" />
              {example.slug === 'node-script' ? <CodeBlock code={OUTPUT} lang="text" title="expected output" /> : null}
            </div>
          </div>
        </Section>
      ))}

      <Section
        eyebrow="Guides"
        title="Worked examples in the documentation."
        lead="Each guide is copy-pasteable end to end: the store, the routes, the client half, and the thing that goes wrong if you skip a step."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <CardLink key={guide.href} href={guide.href} title={guide.title} external>
              {guide.summary}
            </CardLink>
          ))}
        </div>
      </Section>

      <Section eyebrow="Try it in a minute" title="No clone required." className="bg-surface-muted/60">
        <Card>
          <ol className="grid gap-6 md:grid-cols-3">
            <li>
              <div className="text-accent font-mono text-xs">01</div>
              <p className="mt-2 text-sm leading-relaxed">Start MinIO with the command above and create a bucket.</p>
            </li>
            <li>
              <div className="text-accent font-mono text-xs">02</div>
              <p className="mt-2 text-sm leading-relaxed">Write a starter configuration and check it.</p>
              <div className="mt-3 flex flex-col gap-2">
                <Command>npx @s3nd/cli init --provider minio --bucket transfers</Command>
                <Command>npx @s3nd/cli doctor</Command>
              </div>
            </li>
            <li>
              <div className="text-accent font-mono text-xs">03</div>
              <p className="mt-2 text-sm leading-relaxed">Move a file, and get it back with a sloppily typed code.</p>
              <div className="mt-3 flex flex-col gap-2">
                <Command>npx @s3nd/cli put ./anything.pdf</Command>
                <Command>npx @s3nd/cli get k7qp-2m4x</Command>
              </div>
            </li>
          </ol>
        </Card>
      </Section>

      <Cta />
    </>
  )
}
