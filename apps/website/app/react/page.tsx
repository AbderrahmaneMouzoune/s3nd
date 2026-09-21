import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { SyncCodeDemo } from '@/components/sync-code-demo'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'React hooks',
  description:
    '@s3nd/react: hooks for sending a file or a snapshot, reading a code back, and a sync code input that repairs what the user typed. Never sees a storage credential, never pulls the AWS SDK into your bundle.',
  path: '/react',
  keywords: ['react file upload code', 's3nd react', 'react hook transfer code', 'one-time code input react'],
})

const PROVIDER = `import { S3ndProvider } from '@s3nd/react'

export default function Providers({ children }) {
  return <S3ndProvider baseUrl="/api/transfers">{children}</S3ndProvider>
}`

const SEND_FILE = `import { useSendTransfer } from '@s3nd/react'

function DropFile() {
  const { sendFile, transfer, isPending, error } = useSendTransfer()

  return (
    <>
      <input
        type="file"
        disabled={isPending}
        onChange={(event) => event.target.files?.[0] && sendFile(event.target.files[0])}
      />
      {transfer && <p>Read this out to them: {transfer.code}</p>}
      {error && <p>{error.message}</p>}
    </>
  )
}`

const RECEIVE_FILE = `import { useReceiveTransfer, useSyncCodeInput } from '@s3nd/react'

function PickUp() {
  const input = useSyncCodeInput()
  const { load, loadBytes, transfer, notFound, isPending } = useReceiveTransfer()

  async function download() {
    const bytes = await loadBytes(input.code!)
    if (bytes) saveToDisk(new Blob([bytes]), transfer?.filename ?? 'file') // your helper
  }

  return (
    <>
      <input {...input.inputProps} placeholder="K7QP 2M4X" />
      <button onClick={() => load(input.code!)} disabled={!input.isComplete || isPending}>
        Look it up
      </button>
      {notFound && <p>Unknown or expired code.</p>}
      {transfer?.kind === 'file' && (
        <button onClick={download}>
          Download {transfer.filename} · {transfer.size} bytes
        </button>
      )}
    </>
  )
}`

const SEND_STATE = `const { send, transfer } = useSendTransfer()

// Structured state goes as a snapshot, with your schema version.
await send(await exportDatabase(), { version: 3 })

// On the other device: load, show, then apply.
const { load, transfer, data } = useReceiveTransfer<DatabaseDump>()
await load(code)
// transfer.device, transfer.createdAt → show them
// importDatabase(data!) → only after the user confirms`

const HOOKS: [string, string][] = [
  ['useSendTransfer()', 'send, sendFile, transfer, status, isPending, error, reset'],
  ['useReceiveTransfer()', 'load, loadBytes, burn, transfer, data, notFound, status, isPending, error, reset'],
  ['useSyncCodeInput()', 'value, setValue, code, isComplete, error, reset, inputProps'],
  ['useTransferClient()', 'the underlying client, for anything the hooks do not cover'],
]

export default function ReactPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'React hooks', href: '/react' }]}
        eyebrow={packages.react.name}
        title="Hooks that never see a credential."
        lead="Send a file or a snapshot, read a code back, and an input that repairs the code as the user types it. Its whole dependency tree is the protocol package and nanoid, with React as a peer. The AWS SDK stays on your server."
        actions={
          <>
            <ButtonLink href={docs('/react')} external>
              React guide
            </ButtonLink>
            <ButtonLink href={packages.react.npm} variant="secondary" external>
              npm
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <Command>{packages.react.install}</Command>
            <CodeBlock code={PROVIDER} lang="tsx" title="point it at the transfer routes" />
          </div>
        }
      />

      <Section
        index="01"
        eyebrow="Sending"
        title="A file input, a code."
        lead="sendFile() takes a File straight off an input, keeping its name and type. Failures land in error rather than rejecting, because an event handler should not need a try/catch."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SEND_FILE} lang="tsx" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              The hook posts to the transfer routes on your server, which hold the bucket credentials. The browser never
              sees a key, and your <code className="font-mono">authorize</code> function decides who may send.
            </p>
            <p>
              <code className="font-mono">transfer</code> carries the code, the kind, the size and the expiry. Show the
              code grouped in fours; the receiving side accepts it with or without the spaces.
            </p>
            <TextLink href="/use-cases/team-drop-box">A drop box for your team</TextLink>
          </div>
        </div>
      </Section>

      <Section
        index="02"
        eyebrow="Receiving"
        title="Look it up, show it, then download."
        lead="load() fetches what a code holds without moving the bytes, so the user sees a filename and a size before anything is downloaded. loadBytes() brings the file across."
      >
        <CodeBlock code={RECEIVE_FILE} lang="tsx" />
      </Section>

      <Section
        index="03"
        eyebrow="The code input"
        title="What the user typed stays untouched."
        lead="useSyncCodeInput does the repair in the browser, before any request. Rewriting the field under the cursor is the one thing that makes these inputs miserable, so it never does."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              <code className="font-mono">value</code> is verbatim. <code className="font-mono">code</code> is the
              canonical form to submit, <code className="font-mono">null</code> while what is typed cannot be one.{' '}
              <code className="font-mono">isComplete</code> is the moment to enable the button.
            </p>
            <p>
              <code className="font-mono">inputProps</code> carries the keyboard and autofill hints a one-time code
              wants: <code className="font-mono">autoComplete=&quot;one-time-code&quot;</code>, capitals, no
              autocorrect, and a numeric keyboard when the alphabet is digits.
            </p>
            <p>
              Pass the same shape your server configured, <code className="font-mono">{'{ length: 4, alphabet }'}</code>
              , and both halves follow.
            </p>
          </div>
        </div>
      </Section>

      <Section
        index="04"
        eyebrow="App state"
        title="The same hooks carry a snapshot."
        lead="Structured state goes through send() as a snapshot, and comes back inline in data. Loading and applying are deliberately separate: only your code knows its object stores, and the user should see what is about to replace their data."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SEND_STATE} lang="ts" />
          <div className="space-y-4 text-base leading-relaxed">
            <p>
              The IndexedDB example in the repository has a complete export and import pair against a real object store,
              and the use-case page walks the whole flow.
            </p>
            <div className="flex flex-wrap gap-4">
              <TextLink href="/use-cases/new-device">Move an app to a new device</TextLink>
              <TextLink href="/examples">The examples</TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="05"
        eyebrow="Guarantees"
        title="A user hammering a button gets one answer."
        lead="Every call aborts the one before it, a late reply from a superseded call is dropped rather than published, and nothing is written after unmount."
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h3 className="font-bold tracking-tight">Client hooks, App Router ready</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Every export is a client hook and the build carries{' '}
              <code className="font-mono">&apos;use client&apos;</code>, so it drops straight into the Next.js App
              Router. React 18 or later.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold tracking-tight">Tokens and custom clients</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Pass <code className="font-mono">headers</code> to the provider for a token, or{' '}
              <code className="font-mono">client</code> to bring your own, which is also how you drive it in tests with
              no network at all.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold tracking-tight">Status you can render</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              <code className="font-mono">status</code> is idle, pending, success or error, and{' '}
              <code className="font-mono">notFound</code> covers both an unknown and an expired code, the way the
              protocol does.
            </p>
          </Card>
        </div>
        <dl className="border-line divide-line mt-8 divide-y rounded-lg border text-sm">
          {HOOKS.map(([hook, returns]) => (
            <div key={hook} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
              <dt className="text-accent font-mono text-xs leading-relaxed">{hook}</dt>
              <dd className="text-ink-muted font-mono text-xs leading-relaxed">{returns}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Cta />
    </>
  )
}
