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
    '@s3nd/react: hooks for sending a snapshot or a file, reading a code back, and a sync code input that repairs what the user typed. Never sees a storage credential, never pulls the AWS SDK into your bundle.',
  path: '/react',
  keywords: ['react indexeddb sync hook', 's3nd react', 'react hook transfer code', 'one-time code input react'],
})

const PROVIDER = `import { S3ndProvider } from '@s3nd/react'

export default function Providers({ children }) {
  return <S3ndProvider baseUrl="/api/transfers">{children}</S3ndProvider>
}`

const SEND = `import { useSendTransfer } from '@s3nd/react'

function MoveToAnotherDevice() {
  const { send, transfer, isPending, error } = useSendTransfer()

  return (
    <>
      <button onClick={async () => send(await exportDatabase(), { version: 3 })} disabled={isPending}>
        Move to another device
      </button>
      {transfer && <p>Type this on the other device: {transfer.code}</p>}
      {error && <p>{error.message}</p>}
    </>
  )
}`

const RECEIVE = `import { useReceiveTransfer, useSyncCodeInput } from '@s3nd/react'

function RestoreFromCode() {
  const input = useSyncCodeInput()
  const { load, transfer, data, notFound, isPending } = useReceiveTransfer<DatabaseDump>()

  return (
    <>
      <input {...input.inputProps} placeholder="K7QP2M4X" />
      <button onClick={() => input.code && load(input.code)} disabled={!input.isComplete || isPending}>
        Look it up
      </button>

      {notFound && <p>Unknown or expired code.</p>}
      {transfer && (
        <>
          <p>From {transfer.device}, {new Date(transfer.createdAt).toLocaleString()}</p>
          <button onClick={() => importDatabase(data!)}>Replace my data</button>
        </>
      )}
    </>
  )
}`

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
        lead="Send a snapshot or a file, read a code back, and an input that repairs the code as the user types it. Its whole dependency tree is the protocol package and nanoid, with React as a peer. The AWS SDK stays on your server."
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
        eyebrow="Sending"
        title="A button, a code."
        lead="Failures land in error rather than rejecting, because an event handler should not need a try/catch. The call returns null when it failed, for callers that want to branch."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={SEND} lang="tsx" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <code className="font-mono">send()</code> posts structured state as a snapshot;{' '}
              <code className="font-mono">sendFile()</code> takes a <code className="font-mono">File</code> straight off
              an <code className="font-mono">{'<input type="file">'}</code>, keeping its name and type.
            </p>
            <p>
              Reading IndexedDB out is your code, because only your app knows its object stores. The IndexedDB example
              has a complete export and import pair to start from.
            </p>
            <TextLink href="/examples">The examples</TextLink>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Receiving"
        title="Load, show, then apply."
        lead="Loading and applying are deliberately separate. The user should see what is about to replace their data before it does, and only your code knows how to write it back."
        className="bg-surface-muted/60"
      >
        <CodeBlock code={RECEIVE} lang="tsx" />
      </Section>

      <Section
        eyebrow="The code input"
        title="What the user typed stays untouched."
        lead="useSyncCodeInput does the repair in the browser, before any request. Rewriting the field under the cursor is the one thing that makes these inputs miserable, so it never does."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SyncCodeDemo />
          <div className="space-y-4 text-sm leading-relaxed">
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
        eyebrow="Guarantees"
        title="A user hammering a button gets one answer."
        lead="Every call aborts the one before it, a late reply from a superseded call is dropped rather than published, and nothing is written after unmount."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h3 className="font-semibold tracking-tight">Client hooks, App Router ready</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Every export is a client hook and the build carries{' '}
              <code className="font-mono">&apos;use client&apos;</code>, so it drops straight into the Next.js App
              Router. React 18 or later.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">Tokens and custom clients</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              Pass <code className="font-mono">headers</code> to the provider for a token, or{' '}
              <code className="font-mono">client</code> to bring your own, which is also how you drive it in tests with
              no network at all.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight">Status you can render</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              <code className="font-mono">status</code> is idle, pending, success or error, and{' '}
              <code className="font-mono">notFound</code> covers both an unknown and an expired code, the way the
              protocol does.
            </p>
          </Card>
        </div>
        <dl className="border-line divide-line mt-8 divide-y rounded-2xl border text-sm">
          {HOOKS.map(([hook, returns]) => (
            <div key={hook} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
              <dt className="font-mono text-xs leading-relaxed">{hook}</dt>
              <dd className="text-ink-muted font-mono text-xs leading-relaxed">{returns}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Cta />
    </>
  )
}
