'use client'

import { createSyncCodes, isS3ndError, syncCodeAlphabets } from '@s3nd/protocol'
import { useId, useMemo, useState } from 'react'

const SAMPLES = ['k7-qp2m4x', 'K7QP 2M4X', 'OIL5 abcd', 'k7qp2m4']

/**
 * The real normalization, running in the browser: the same `createSyncCodes()`
 * an app configures on its server, from the package that never sees S3.
 */
export function SyncCodeDemo() {
  const id = useId()
  const [typed, setTyped] = useState(SAMPLES[0])
  const codes = useMemo(() => createSyncCodes(), [])

  const result = useMemo(() => {
    if (typed.trim().length === 0) return { code: null, error: null }

    try {
      return { code: codes.normalize(typed), error: null }
    } catch (error) {
      if (isS3ndError(error) && error.code === 'INVALID_SYNC_CODE') return { code: null, error: error.message }

      throw error
    }
  }, [codes, typed])

  const complete = result.code != null && result.code.length === codes.length

  return (
    <div className="border-line bg-surface shadow-card rounded-2xl border p-6">
      <label className="text-ink-faint block font-mono text-[11px] tracking-wider uppercase" htmlFor={id}>
        What the user typed
      </label>
      <input
        id={id}
        className="border-line-strong bg-canvas mt-2 w-full rounded-lg border px-3 py-2.5 font-mono text-lg tracking-[0.12em] outline-none focus:border-accent"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        placeholder="K7QP 2M4X"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setTyped(sample)}
            className="border-line hover:border-line-strong bg-surface-muted rounded-md border px-2 py-1 font-mono text-xs transition-colors"
          >
            {sample}
          </button>
        ))}
      </div>

      <div className="border-line mt-5 border-t pt-5">
        <div className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">
          What <span className="text-ink">codes.normalize()</span> looks up
        </div>
        <output className="mt-2 block font-mono text-2xl tracking-[0.18em]" htmlFor={id} aria-live="polite">
          {result.code ?? <span className="text-ink-faint">—</span>}
        </output>
        <p className="text-ink-muted mt-2 min-h-10 text-sm leading-relaxed">
          {result.error ? (
            <span className="text-accent">{result.error}</span>
          ) : result.code == null ? (
            'Type a code.'
          ) : complete ? (
            <>
              <span className="text-ok font-medium">Complete.</span> Separators dropped, case folded, and O, I and L
              read as 0, 1 and 1, because Crockford base32 has no O, I or L to confuse them with.
            </>
          ) : (
            `${result.code.length} of ${codes.length} characters. The input stays exactly as typed; only the lookup is repaired.`
          )}
        </p>
      </div>

      <p className="text-ink-faint mt-4 font-mono text-[11px]">
        Default alphabet: {syncCodeAlphabets.crockford} · {codes.length} characters · {codes.entropyBits} bits
      </p>
    </div>
  )
}
