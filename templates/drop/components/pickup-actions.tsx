'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DROP_HEADERS, encodeHeaderValue } from '@/lib/options'

import { CopyButton } from './copy-button'

/**
 * A two-step burn: one click to ask, one to do it. `prominent` is the state
 * after a download, when burning is the obvious next thing.
 */
export function BurnButton({
  code,
  passphrase,
  prominent = false,
  onBurned,
}: {
  code: string
  /**
   * The password on this transfer, when the page holding this button knows it
   * without having unlocked in this browser — the sender's result page does.
   */
  passphrase?: string
  prominent?: boolean
  /** Where to go once the object is gone. */
  onBurned: (code: string) => void
}) {
  const [burning, setBurning] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function burn() {
    setBurning(true)
    try {
      await fetch(`/api/transfers/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: passphrase ? { [DROP_HEADERS.passphrase]: encodeHeaderValue(passphrase) } : undefined,
      })
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
 *
 * A one-time code needs none of that — the download burns it on the way out —
 * so it says so before the click rather than offering the choice after.
 */
export function PickupActions({
  code,
  filename,
  isFile,
  oneTime = false,
}: {
  code: string
  filename?: string
  isFile: boolean
  oneTime?: boolean
}) {
  const router = useRouter()
  const [downloaded, setDownloaded] = useState(false)

  const burned = (gone: string) => router.replace(`/?burned=${encodeURIComponent(gone)}`)

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {oneTime && !downloaded ? (
        <p
          className="border-danger/50 text-ink-muted w-full rounded-lg border px-5 py-4 text-sm text-pretty"
          role="status"
        >
          <span className="text-danger font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
            One download only.
          </span>{' '}
          The code burns as the file goes out: whatever lands on this device is all there is. Looking at the preview
          costs nothing.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isFile ? (
          <a
            className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
            href={`/api/transfers/${encodeURIComponent(code)}/raw`}
            download={filename}
            onClick={() => setDownloaded(true)}
          >
            {downloaded && !oneTime ? 'Download again' : 'Download'} <span aria-hidden="true">↓</span>
          </a>
        ) : null}
        <CopyButton text={() => `${window.location.origin}/${code}`} label="Copy the link" className="py-3.5" />
        {!downloaded && !oneTime ? <BurnButton code={code} onBurned={burned} /> : null}
      </div>

      {downloaded ? (
        <div
          className="border-accent/50 bg-accent-soft rise flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4"
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
              {oneTime ? 'That was the one pickup.' : 'Got it? Burn the code.'}
            </p>
            <p className="text-ink-muted mt-1 text-sm text-pretty">
              {oneTime
                ? 'The code is spent and nothing is left in the bucket under it. Check the file arrived before you leave this page.'
                : 'Nobody else can pick it up, and nothing is left in the bucket. Leave it, and it expires on its own.'}
            </p>
          </div>
          {!oneTime ? <BurnButton code={code} prominent onBurned={burned} /> : null}
        </div>
      ) : null}
    </div>
  )
}
