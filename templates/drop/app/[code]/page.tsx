import type { TransferMetadata } from '@s3nd/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CodeBoard } from '@/components/code-board'
import { PickupActions } from '@/components/pickup-actions'
import { formatBytes, formatExpiry, groupCode } from '@/lib/format'
import { transfers } from '@/lib/transfers'

/** A code is looked up on every visit: never cached, never indexed. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/[code]'>): Promise<Metadata> {
  const { code } = await params

  return { title: groupCode(code.toUpperCase()), robots: { index: false, follow: false } }
}

/** Asks the transfer handler, in-process, what a code holds. */
async function lookup(code: string): Promise<TransferMetadata | null> {
  const response = await transfers()(new Request(`http://drop.internal/api/transfers/${encodeURIComponent(code)}`))

  if (response.status === 404 || response.status === 400) return null
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `The bucket answered ${response.status}.`)
  }

  return (await response.json()) as TransferMetadata
}

export default async function PickupPage({ params }: PageProps<'/[code]'>) {
  const { code } = await params
  const meta = await lookup(code)
  if (!meta) notFound()

  const isFile = meta.kind === 'file'

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
        or, from a terminal: s3nd get {meta.code.toLowerCase()} --remote {'<this domain>'}/api/transfers
      </p>
    </div>
  )
}
