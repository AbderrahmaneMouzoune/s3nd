import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { CodeBoard } from '@/components/code-board'
import { PickupActions } from '@/components/pickup-actions'
import { QrCode } from '@/components/qr-code'
import { formatBytes, formatExpiry, groupCode } from '@/lib/format'
import { lookupTransfer } from '@/lib/transfers'

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

export default async function PickupPage({ params }: PageProps<'/[code]'>) {
  const { code } = await params
  const meta = await lookupTransfer(code)
  if (!meta) notFound()

  const isFile = meta.kind === 'file'
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'drop.s3nd.sh'
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const remote = `${protocol}://${host}/api/transfers`
  const pageUrl = `${protocol}://${host}/${meta.code}`

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-12 pb-16 sm:pt-20">
      <p className="rise text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        {isFile ? 'A file is waiting for you' : 'Application state is waiting for you'} · expires{' '}
        {formatExpiry(meta.expiresAt)}
      </p>
      <h1 className="rise rise-1 mt-4 truncate text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
        {isFile ? (meta.filename ?? 'file') : (meta.app ?? 'snapshot')}
      </h1>
      <p className="rise rise-2 text-ink-muted mt-3 font-mono text-sm">
        {formatBytes(meta.size)}
        {isFile && meta.contentType ? ` · ${meta.contentType}` : ''}
        {!isFile && meta.version != null ? ` · schema v${meta.version}` : ''}
        {meta.device ? ` · from ${meta.device}` : ''}
      </p>

      <div className="rise rise-2 border-line-strong bg-surface mt-8 rounded-xl border shadow-[0_1px_0_rgb(0_0_0/0.6),0_12px_32px_-16px_rgb(0_0_0/0.8)]">
        <div className="hazard h-2 rounded-t-xl" aria-hidden="true" />
        <div className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8">
          <CodeBoard code={meta.code} size="md" />
          <PickupActions code={meta.code} filename={meta.filename} isFile={isFile} />
        </div>
        <div className="perforation" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-5 px-5 py-5 sm:px-8">
          <QrCode value={pageUrl} label="This page, as a QR code" size={104} className="shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 text-sm leading-relaxed">
            <p className="font-bold tracking-tight">Want it on another device?</p>
            <p className="text-ink-muted mt-1 text-pretty">
              Point its camera at this code and the same page opens there. Download, then burn the code from either
              device.
            </p>
          </div>
        </div>
        {!isFile ? (
          <>
            <div className="perforation" aria-hidden="true" />
            <pre className="text-ink-muted max-h-96 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed sm:px-8">
              {JSON.stringify(meta.data, null, 2)}
            </pre>
          </>
        ) : null}
      </div>

      <p className="rise rise-3 text-ink-faint mt-6 font-mono text-[10px] tracking-[0.22em] uppercase">
        or, from a terminal: s3nd get {meta.code.toLowerCase()} --remote {remote}
      </p>
    </div>
  )
}
