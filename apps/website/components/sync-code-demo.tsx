'use client'

import { createSyncCodes, isS3ndError, syncCodeAlphabets } from '@s3nd/protocol'
import { useId, useMemo, useState } from 'react'

import { SplitFlap } from './split-flap'

const SAMPLES = ['k7-qp2m4x', 'K7QP 2M4X', 'OIL5 abcd', 'k7qp2m4']

export interface SyncCodeDemoLabels {
  typed: string
  lookedUpPrefix: string
  lookedUpSuffix: string
  placeholder: string
  typeACode: string
  complete: string
  completeBody: string
  /** `{have}` and `{need}` are replaced with the counts. */
  partial: string
  alphabet: string
  chars: string
  bits: string
  normalizedCode: string
}

/**
 * The real normalization, running in the browser: the same `createSyncCodes()`
 * an app configures on its server, from the package that never sees S3.
 */
export function SyncCodeDemo({ labels }: { labels: SyncCodeDemoLabels }) {
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
    <div className="border-line-strong bg-surface shadow-card rounded-xl border">
      <div className="border-line border-b px-5 py-5 sm:px-6">
        <label className="text-ink-faint block font-mono text-[10px] tracking-[0.22em] uppercase" htmlFor={id}>
          {labels.typed}
        </label>
        <input
          id={id}
          className="border-line-strong focus:border-accent focus:shadow-[0_0_0_3px_rgb(255_176_0_/_0.18)] mt-2 w-full rounded-md border bg-[#0d0d0c] px-3 py-3 font-mono text-lg tracking-[0.14em] transition-[border-color,box-shadow] duration-200 outline-none"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder={labels.placeholder}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setTyped(sample)}
              className={`rounded-sm border px-2 py-1 font-mono text-xs transition-[color,border-color,transform] duration-200 active:scale-95 ${
                sample === typed
                  ? 'border-accent text-accent'
                  : 'border-line-strong hover:border-accent hover:text-accent'
              }`}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">
          {labels.lookedUpPrefix} <span className="text-ink">codes.normalize()</span> {labels.lookedUpSuffix}
        </div>
        <div className="mt-3">
          <SplitFlap value={result.code ?? ''} size="md" label={labels.normalizedCode} />
        </div>
        <p className="text-ink-muted mt-4 min-h-10 text-sm leading-relaxed" aria-live="polite">
          {result.error ? (
            <span className="text-danger">{result.error}</span>
          ) : result.code == null ? (
            labels.typeACode
          ) : complete ? (
            <>
              <span className="text-ok font-semibold">{labels.complete}</span> {labels.completeBody}
            </>
          ) : (
            labels.partial.replace('{have}', String(result.code.length)).replace('{need}', String(codes.length))
          )}
        </p>
        <p className="text-ink-faint mt-4 font-mono text-[10px] tracking-wider uppercase">
          {labels.alphabet} {syncCodeAlphabets.crockford} · {codes.length} {labels.chars} · {codes.entropyBits}{' '}
          {labels.bits}
        </p>
      </div>
    </div>
  )
}
