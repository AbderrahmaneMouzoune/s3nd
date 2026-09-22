'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CopyButton } from './copy-button'

/**
 * A two-step burn: one click to ask, one to do it. `prominent` is the state
 * after a download, when burning is the obvious next thing.
 */
export function BurnButton({
  code,
  prominent = false,
  onBurned,
}: {
  code: string
  prominent?: boolean
  /** Where to go once the object is gone. */
  onBurned: (code: string) => void
}) {
  const [burning, setBurning] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function burn() {
    setBurning(true)
    try {
      await fetch(`/api/transfers/${encodeURIComponent(code)}`, { method: 'DELETE' })
    } finally {
      onBurned(code)
    }
  }

  if (confirm) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void burn()}
          disabled={burning}
          className="btn border-danger text-danger hover:bg-danger/10 inline-flex items-center gap-2 rounded-md border px-4 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {burning ? 'Burning…' : 'Yes, burn it'}
        </button>
        {!burning ? (
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="text-ink-faint hover:text-ink px-2 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase transition-colors"
          >
            Keep it
          </button>
        ) : null}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className={
        prominent
          ? 'btn border-danger text-danger hover:bg-danger hover:text-accent-ink inline-flex items-center gap-2 rounded-md border px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase'
          : 'text-ink-faint hover:text-danger inline-flex items-center gap-2 rounded-md px-3 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase transition-colors'
      }
    >
      {prominent ? 'Burn it now' : 'Burn this code'} {prominent ? <span aria-hidden="true">✕</span> : null}
    </button>
  )
}

/**
 * The buttons under a transfer: download it, share it, burn it. Once the
 * download has started, burning steps forward: the file is on this device,
 * and nothing needs to stay in the bucket.
 */
export function PickupActions({ code, filename, isFile }: { code: string; filename?: string; isFile: boolean }) {
  const router = useRouter()
  const [downloaded, setDownloaded] = useState(false)

  const burned = (gone: string) => router.replace(`/?burned=${encodeURIComponent(gone)}`)

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isFile ? (
          <a
            className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
            href={`/api/transfers/${encodeURIComponent(code)}/raw`}
            download={filename}
            onClick={() => setDownloaded(true)}
          >
            {downloaded ? 'Download again' : 'Download'} <span aria-hidden="true">↓</span>
          </a>
        ) : null}
        <CopyButton text={() => `${window.location.origin}/${code}`} label="Copy the link" className="py-3.5" />
        {!downloaded ? <BurnButton code={code} onBurned={burned} /> : null}
      </div>

      {downloaded ? (
        <div
          className="border-accent/50 bg-accent-soft rise flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4"
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
              Got it? Burn the code.
            </p>
            <p className="text-ink-muted mt-1 text-sm text-pretty">
              Nobody else can pick it up, and nothing is left in the bucket. Leave it, and it expires on its own.
            </p>
          </div>
          <BurnButton code={code} prominent onBurned={burned} />
        </div>
      ) : null}
    </div>
  )
}
