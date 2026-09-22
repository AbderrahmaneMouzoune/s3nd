'use client'

import { useSyncCodeInput } from '@s3nd/react'
import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

/**
 * "I already have a code." The field keeps what is typed; the hook repairs it
 * underneath (separators dropped, case folded, O read as zero) and says when it
 * is complete, which is the moment to go to the pickup page.
 */
export function PickupForm() {
  const router = useRouter()
  const inputId = useId()
  const { code, isComplete, error, inputProps } = useSyncCodeInput()
  const [going, setGoing] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || !code) return
    setGoing(true)
    router.push(`/${code}`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase" htmlFor={inputId}>
        The eight characters from the other screen
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={inputId}
          {...inputProps}
          placeholder="K7QP 2M4X"
          aria-invalid={error ? true : undefined}
          className="border-line-strong focus:border-accent placeholder:text-line-strong min-w-0 flex-1 rounded-md border bg-[#0d0d0c] px-4 py-3 font-mono text-lg tracking-[0.2em] uppercase outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!isComplete || going}
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {going ? 'Opening…' : 'Pick it up'} <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="min-h-5 font-mono text-[11px]" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : code && !isComplete ? (
          <span className="text-ink-faint">
            {code.length} of 8 · reads as {code}
          </span>
        ) : code ? (
          <span className="text-ok">✓ reads as {code}</span>
        ) : (
          <span className="text-ink-faint">Dashes, spaces and lowercase are fine; O reads as zero.</span>
        )}
      </p>
    </form>
  )
}
