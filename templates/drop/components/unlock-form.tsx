'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

/**
 * The password gate on a protected pickup. What is typed goes to
 * `/api/unlock/<code>`, which hands this browser a cookie for that one code
 * and nothing else; the page then reloads itself and behaves as any other
 * pickup page does.
 *
 * The password is never in a URL and never in this page's markup: a link
 * someone forwards carries the code, and the code alone is not enough.
 */
export function UnlockForm({ code }: { code: string }) {
  const router = useRouter()
  const inputId = useId()
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passphrase || checking) return

    setChecking(true)
    setError(null)

    try {
      const response = await fetch(`/api/unlock/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      })

      if (response.ok) {
        setPassphrase('')
        router.refresh()
        return
      }

      setError(response.status === 401 ? 'That password does not open this code.' : 'Something went wrong. Try again.')
    } catch {
      setError('That did not reach the server. Try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase" htmlFor={inputId}>
        The password the sender gave you
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={inputId}
          type="password"
          autoComplete="off"
          autoFocus
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="border-line-strong focus:border-accent min-w-0 flex-1 rounded-md border bg-[#0d0d0c] px-4 py-3 font-mono text-lg outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!passphrase || checking}
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {checking ? 'Opening…' : 'Unlock'} <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="min-h-5 font-mono text-[11px]" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : (
          <span className="text-ink-faint">
            It came from the sender, not from this page. There is no way to reset it.
          </span>
        )}
      </p>
    </form>
  )
}
