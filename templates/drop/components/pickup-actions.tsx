'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CopyButton } from './copy-button'

/** The buttons under a transfer: download it, share it, burn it. */
export function PickupActions({ code, filename, isFile }: { code: string; filename?: string; isFile: boolean }) {
  const router = useRouter()
  const [burning, setBurning] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function burn() {
    setBurning(true)
    try {
      await fetch(`/api/transfers/${encodeURIComponent(code)}`, { method: 'DELETE' })
    } finally {
      router.replace('/')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isFile ? (
        <a
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
          href={`/api/transfers/${encodeURIComponent(code)}/raw`}
          download={filename}
        >
          Download <span aria-hidden="true">↓</span>
        </a>
      ) : null}
      <CopyButton text={() => `${window.location.origin}/${code}`} label="Copy the link" className="py-3.5" />
      {confirm ? (
        <button
          type="button"
          onClick={() => void burn()}
          disabled={burning}
          className="btn border-danger text-danger inline-flex items-center gap-2 rounded-md border px-4 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {burning ? 'Burning…' : 'Yes, burn it'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="text-ink-faint hover:text-danger inline-flex items-center gap-2 rounded-md px-3 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase transition-colors"
        >
          Burn this code
        </button>
      )}
    </div>
  )
}
