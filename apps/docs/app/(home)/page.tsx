import Link from 'next/link'
import { codeToHtml } from 'shiki'

import { Logo } from '@/components/logo'
import { repositoryUrl, websiteUrl } from '@/lib/shared'

const SAMPLE = `import { createBucket } from 's3nd'

const store = createBucket({ bucket: 'my-bucket', prefix: 'snapshots' })

// On the old device: hand the user a code.
const code = store.codes.create() // "K7QP2M4X"
await store.putSnapshot(code, state, { app: 'notes', version: 3, expiresIn: 3600 })

// On the new device: they type it in.
const snapshot = await store.getSnapshot(store.codes.normalize(typed), { maxVersion: 3 })
snapshot?.data // → the state, ready to write back into IndexedDB`

const CODE = ['K', '7', 'Q', 'P', '2', 'M', '4', 'X']

const WAYS_IN = [
  {
    title: 'Quick start',
    href: '/docs/quick-start',
    description: 'Two routes on the server, two calls in the browser.',
    stamp: '01',
  },
  {
    title: 'Without a server',
    href: '/docs/no-server',
    description: 'The CLI straight to Cloudflare R2, end to end.',
    stamp: '02',
  },
  {
    title: 'The protocol',
    href: '/docs/protocol',
    description: 'Four routes, one error format, written down.',
    stamp: '03',
  },
]

const USE_CASES = [
  {
    title: 'Move to a new device',
    href: '/docs/use-cases/new-device',
    description: 'A code on the old phone, typed into the new one. The whole database follows.',
  },
  {
    title: 'Continuous backup',
    href: '/docs/use-cases/continuous-backup',
    description: 'One snapshot per account, rewritten as the local database changes.',
  },
  {
    title: 'End-to-end encrypted sync',
    href: '/docs/use-cases/encrypted-sync',
    description: 'Encrypt in the browser with a passphrase. Your server stores bytes it cannot read.',
  },
  {
    title: 'Attachments beside the data',
    href: '/docs/use-cases/attachments',
    description: 'The blobs an IndexedDB app holds, carried across with the records that point at them.',
  },
]

const REFERENCE = [
  { title: 'API reference', href: '/docs/api', description: 'createBucket(), the file API, snapshots, the handler.' },
  { title: 'The CLI', href: '/docs/cli', description: 'put, get, rm, doctor, init and config.' },
  { title: 'React hooks', href: '/docs/react', description: 'Send, receive, and a code input that repairs typos.' },
  { title: 'Errors', href: '/docs/errors', description: 'Every stable code, and what to do about it.' },
]

export default async function HomePage() {
  // The stylesheet colours tokens from `--shiki-dark` (the form fumadocs emits
  // for the pages), so the sample asks for the same dual-theme output.
  const highlighted = await codeToHtml(SAMPLE, {
    lang: 'ts',
    themes: { light: 'vesper', dark: 'vesper' },
    defaultColor: false,
  })

  return (
    <main className="relative">
      <div className="grid-paper absolute inset-x-0 top-0 -z-10 h-[32rem]" aria-hidden="true" />

      <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-12 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
          <div className="min-w-0">
            <p className="rise text-accent flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
              <Logo className="size-5" />
              Documentation · doc.s3nd.sh
            </p>
            <h1 className="rise rise-1 mt-5 max-w-3xl text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
              Your local-first app, on their other device.
            </h1>
            <p className="rise rise-2 text-ink-muted mt-6 max-w-xl text-lg leading-relaxed text-pretty">
              IndexedDB never leaves the browser it was written in. s3nd snapshots that state into a bucket you control,
              under a code the user carries across. Credentials stay on your server.
            </p>

            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link
                className="btn-primary bg-accent text-accent-ink hover:bg-accent-bright group inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
                href="/docs/quick-start"
              >
                Quick start
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
              <Link
                className="border-ink/30 bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-md border px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase transition-colors"
                href="/docs/snapshots"
              >
                How snapshots work
              </Link>
              <a
                className="text-ink-muted hover:text-ink inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase transition-colors"
                href={repositoryUrl}
                rel="noopener"
              >
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="rise rise-3 border-line-strong bg-surface min-w-0 overflow-hidden rounded-xl border shadow-[0_1px_0_rgb(0_0_0/0.6),0_12px_32px_-16px_rgb(0_0_0/0.8)]">
            <div className="border-line flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">lib/store.ts</span>
              <span className="border-accent text-accent rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">
                your bucket
              </span>
            </div>
            <div
              className="not-prose overflow-x-auto px-4 py-4 text-[13px] leading-relaxed [&_pre]:min-w-max"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
              <div className="flex flex-wrap gap-1" role="img" aria-label="Code: K7QP 2M4X">
                {CODE.map((character, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={`flap h-8 w-6 text-sm ${index === 3 ? 'mr-1.5' : ''}`}
                  >
                    {character}
                  </span>
                ))}
              </div>
              <span className="text-ink-faint font-mono text-[10px] tracking-[0.2em] uppercase">
                40 bits · expires 1h
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">Start here</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {WAYS_IN.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="group border-line bg-surface hover:border-accent relative flex flex-col overflow-hidden rounded-lg border p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5"
              >
                <span className="text-accent font-mono text-xs">{entry.stamp}</span>
                <span className="mt-3 flex items-start justify-between gap-4 text-lg font-bold tracking-tight">
                  {entry.title}
                  <span
                    aria-hidden="true"
                    className="text-ink-faint group-hover:text-accent shrink-0 font-mono transition-[color,transform] duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="text-ink-muted mt-2 text-sm leading-relaxed">{entry.description}</span>
                <span
                  aria-hidden="true"
                  className="bg-accent absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">Use cases</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Worked, end to end.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((useCase) => (
              <Link
                key={useCase.href}
                href={useCase.href}
                className="group border-line bg-surface hover:border-accent relative flex flex-col overflow-hidden rounded-lg border p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5"
              >
                <span className="flex items-start justify-between gap-4 text-lg font-bold tracking-tight">
                  {useCase.title}
                  <span
                    aria-hidden="true"
                    className="text-ink-faint group-hover:text-accent shrink-0 font-mono transition-[color,transform] duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="text-ink-muted mt-2 text-sm leading-relaxed">{useCase.description}</span>
                <span
                  aria-hidden="true"
                  className="bg-accent absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">Reference</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REFERENCE.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="group border-line bg-surface hover:border-accent flex flex-col rounded-lg border p-5 transition-colors duration-300"
              >
                <span className="group-hover:text-accent font-bold tracking-tight transition-colors">
                  {entry.title}
                </span>
                <span className="text-ink-muted mt-1.5 text-sm leading-relaxed">{entry.description}</span>
              </Link>
            ))}
          </div>
          <p className="text-ink-faint mt-10 font-mono text-[11px] tracking-wider uppercase">
            The product, the use cases and the comparisons live on{' '}
            <a className="text-accent hover:underline" href={websiteUrl} rel="noopener">
              s3nd.sh ↗
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
