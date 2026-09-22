import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { CodeBoard } from '@/components/code-board'
import { Countdown } from '@/components/countdown'
import { PickupActions } from '@/components/pickup-actions'
import { PickupPreview } from '@/components/pickup-preview'
import { QrCode } from '@/components/qr-code'
import { UnlockForm } from '@/components/unlock-form'
import { dropConfig } from '@/lib/config'
import { formatBytes, formatCountdown, formatExpiry, formatMoment, groupCode } from '@/lib/format'
import { matchesUnlockToken, readGuard, unlockCookieName } from '@/lib/guard'
import { lookupTransfer, normalizeCode, withGuard } from '@/lib/transfers'

/** A code is looked up on every visit: never cached, never indexed. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/[code]'>): Promise<Metadata> {
  const { code } = await params

  const title = groupCode(code.toUpperCase())

  // The card a chat shows for this link: the code, and that something waits
  // under it. Whoever holds the link already holds the code.
  return {
    title,
    description: 'A transfer is waiting under this code, until it expires.',
    robots: { index: false, follow: false },
    openGraph: { title: `${title} · a transfer is waiting`, description: 'Open it to download, then burn the code.' },
  }
}

/** Where this deployment is being reached, for the link and the CLI line. */
async function origin(): Promise<string> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'drop.s3nd.sh'
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export default async function PickupPage({ params }: PageProps<'/[code]'>) {
  const raw = (await params).code
  const code = normalizeCode(raw)
  if (code === null) notFound()

  const guard = await readGuard(code)

  // A password on the transfer is checked before the bucket is asked
  // anything: a locked code gives up its filename as readily as its bytes.
  if (guard?.password) {
    const cookie = (await cookies()).get(unlockCookieName(code))?.value
    if (!matchesUnlockToken(guard.password, cookie)) return <Locked code={code} />
  }

  const meta = await lookupTransfer(code)
  if (!meta) notFound()

  const transfer = withGuard(meta, guard)
  const isFile = transfer.kind === 'file'
  const filename = transfer.filename ?? 'file'
  const here = await origin()
  const pageUrl = `${here}/${transfer.code}`

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-12 pb-16 sm:pt-20">
      <p className="rise text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        {isFile ? 'A file is waiting for you' : 'Application state is waiting for you'} ·{' '}
        <span className="text-ink-muted">
          <Countdown expiresAt={transfer.expiresAt} initial={formatCountdown(transfer.expiresAt)} /> left
        </span>
      </p>
      <h1 className="rise rise-1 mt-4 text-4xl font-extrabold tracking-[-0.04em] break-all sm:text-6xl">
        {isFile ? filename : (transfer.app ?? 'snapshot')}
      </h1>

      <ul className="rise rise-2 text-ink-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
        <li>{formatBytes(transfer.size)}</li>
        {isFile && transfer.contentType ? <li className="text-ink-faint">{transfer.contentType}</li> : null}
        {!isFile && transfer.version != null ? <li className="text-ink-faint">schema v{transfer.version}</li> : null}
        {transfer.device ? <li className="text-ink-faint">from {transfer.device}</li> : null}
        {transfer.protected ? <li className="text-ok">✓ unlocked</li> : null}
        {transfer.oneTime ? <li className="text-danger">one download</li> : null}
      </ul>

      {transfer.note ? (
        <blockquote className="border-accent bg-surface rise rise-2 mt-6 border-l-2 px-5 py-4 text-pretty">
          <p className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">
            {transfer.device ? `${transfer.device} wrote` : 'The sender wrote'}
          </p>
          <p className="mt-2 text-lg">{transfer.note}</p>
        </blockquote>
      ) : null}

      {isFile && dropConfig.preview ? (
        <div className="rise rise-2 mt-6">
          <PickupPreview
            code={transfer.code}
            filename={filename}
            contentType={transfer.contentType}
            size={transfer.size}
            oneTime={transfer.oneTime}
            maxSize={dropConfig.previewMaxSize}
          />
        </div>
      ) : null}

      <div className="rise rise-2 border-line-strong bg-surface mt-8 rounded-xl border shadow-[0_1px_0_rgb(0_0_0/0.6),0_12px_32px_-16px_rgb(0_0_0/0.8)]">
        <div className="hazard h-2 rounded-t-xl" aria-hidden="true" />
        <div className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8">
          <CodeBoard code={transfer.code} size="md" />
          <PickupActions code={transfer.code} filename={transfer.filename} isFile={isFile} oneTime={transfer.oneTime} />
        </div>
        <div className="perforation" aria-hidden="true" />
        <dl className="grid gap-x-8 gap-y-3 px-5 py-5 font-mono text-xs sm:grid-cols-2 sm:px-8">
          <Detail term="Name">{isFile ? filename : (transfer.app ?? 'snapshot')}</Detail>
          <Detail term="Size">{formatBytes(transfer.size) || 'unknown'}</Detail>
          <Detail term="Type">{isFile ? (transfer.contentType ?? 'unknown') : 'application state'}</Detail>
          <Detail term="Dropped">
            {/* The server has its own clock and zone; the reader's browser has
                theirs, and theirs is the one that should win. */}
            <time dateTime={transfer.createdAt} suppressHydrationWarning>
              {formatMoment(transfer.createdAt)}
            </time>
          </Detail>
          <Detail term="Expires">
            {transfer.expiresAt ? (
              <>
                <span suppressHydrationWarning>{formatMoment(transfer.expiresAt)}</span>{' '}
                <span className="text-ink-faint">({formatExpiry(transfer.expiresAt)})</span>
              </>
            ) : (
              'never'
            )}
          </Detail>
          <Detail term="Sent from">{transfer.device ?? 'not said'}</Detail>
          <Detail term="Password">{transfer.protected ? 'yes · you have typed it' : 'none'}</Detail>
          <Detail term="After a download">{transfer.oneTime ? 'the code burns' : 'it stays until it expires'}</Detail>
        </dl>
        <div className="perforation" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-5 px-5 py-5 sm:px-8">
          <QrCode value={pageUrl} label="This page, as a QR code" size={104} className="shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 text-sm leading-relaxed">
            <p className="font-bold tracking-tight">Want it on another device?</p>
            <p className="text-ink-muted mt-1 text-pretty">
              Point its camera at this code and the same page opens there.{' '}
              {transfer.protected
                ? 'It will ask for the password again: the code travels, the password does not.'
                : 'Download, then burn the code from either device.'}
            </p>
          </div>
        </div>
        {!isFile ? (
          <>
            <div className="perforation" aria-hidden="true" />
            <pre className="text-ink-muted max-h-96 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed sm:px-8">
              {JSON.stringify(transfer.data, null, 2)}
            </pre>
          </>
        ) : null}
      </div>

      <p className="rise rise-3 text-ink-faint mt-6 font-mono text-[10px] tracking-[0.22em] uppercase">
        or, from a terminal: s3nd get {transfer.code.toLowerCase()} --remote {here}/api/transfers
        {transfer.protected ? ' --token <password>' : ''}
      </p>
    </div>
  )
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-line flex flex-wrap items-baseline justify-between gap-3 border-b pb-2 last:border-b-0">
      <dt className="text-ink-faint text-[10px] tracking-[0.22em] uppercase">{term}</dt>
      <dd className="text-ink-muted min-w-0 text-right break-all">{children}</dd>
    </div>
  )
}

/**
 * A code that exists and is not giving anything up yet. It says the code back
 * — whoever is here typed it or followed a link holding it — and nothing else
 * about what is behind it.
 */
function Locked({ code }: { code: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-12 pb-16 sm:pt-20">
      <p className="rise text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        This one is locked
      </p>
      <h1 className="rise rise-1 mt-4 text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-5xl">
        The sender put a password on it.
      </h1>
      <p className="rise rise-2 text-ink-muted mt-4 text-lg text-pretty">
        The code got you this far. The password is the other half, and it was meant to reach you some other way than
        this link did.
      </p>

      <div className="rise rise-2 border-line-strong bg-surface mt-8 rounded-xl border">
        <div className="hazard h-2 rounded-t-xl" aria-hidden="true" />
        <div className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8">
          <CodeBoard code={code} size="md" />
          <div className="w-full">
            <UnlockForm code={code} />
          </div>
        </div>
      </div>

      <p className="rise rise-3 text-ink-faint mt-6 font-mono text-[10px] tracking-[0.22em] uppercase">
        or, from a terminal: s3nd get {code.toLowerCase()} --token &lt;password&gt;
      </p>
    </div>
  )
}
