'use client'

import { useId, useState } from 'react'

import {
  NOTE_MAX_LENGTH,
  PASSPHRASE_MAX_LENGTH,
  PASSPHRASE_MIN_LENGTH,
  type ExpiryChoice,
  type SendOptions,
} from '@/lib/options'

/** No I, L, O or U, like the codes: a password gets read out loud too. */
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789'

function generatePassphrase(length = 14): string {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('')
}

const FIELD =
  'border-line-strong focus:border-accent placeholder:text-line-strong w-full rounded-md border bg-[#0d0d0c] px-3 py-2.5 font-mono text-sm outline-none transition-colors'
const LABEL = 'text-ink-faint block font-mono text-[10px] tracking-[0.22em] uppercase'

export interface SendOptionsFormProps {
  value: SendOptions
  onChange: (next: SendOptions) => void
  /** What the file will be called on the other side. */
  filename: string
  onFilename: (next: string) => void
  /** The lifetimes this deployment offers, and which of them is its default. */
  choices: ExpiryChoice[]
  defaultExpiresIn: number
  disabled?: boolean
}

/**
 * Everything the sender decides before the file leaves: how long it lives,
 * whether it takes a password, whether the first download burns it, what it
 * is called, who it is from and what it is about.
 *
 * All of it is optional, and the defaults are the old behaviour — drop a file,
 * get a code — so the form never stands between someone and a transfer.
 */
export function SendOptionsForm({
  value,
  onChange,
  filename,
  onFilename,
  choices,
  defaultExpiresIn,
  disabled = false,
}: SendOptionsFormProps) {
  const ids = {
    filename: useId(),
    passphrase: useId(),
    device: useId(),
    note: useId(),
    once: useId(),
  }
  const [revealed, setRevealed] = useState(false)
  const set = (patch: Partial<SendOptions>) => onChange({ ...value, ...patch })

  const tooShort =
    value.passphrase != null && value.passphrase.length > 0 && value.passphrase.length < PASSPHRASE_MIN_LENGTH

  return (
    <fieldset disabled={disabled} className="border-line bg-surface rounded-lg border p-5 disabled:opacity-60">
      <legend className="text-accent px-2 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        Before it goes
      </legend>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className={LABEL} id={`${ids.filename}-expiry`}>
            How long it lives
          </span>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${ids.filename}-expiry`}>
            {choices.map((choice) => (
              <label
                key={choice.seconds}
                className="has-[:checked]:border-accent has-[:checked]:text-accent has-[:checked]:bg-accent-soft border-line-strong text-ink-muted hover:border-accent cursor-pointer rounded-md border px-3 py-2 font-mono text-[11px] font-bold tracking-[0.14em] uppercase transition-colors"
              >
                <input
                  type="radio"
                  name="expires-in"
                  className="sr-only"
                  checked={value.expiresIn === choice.seconds}
                  onChange={() => set({ expiresIn: choice.seconds })}
                />
                {choice.label}
                {choice.seconds === defaultExpiresIn ? <span className="text-ink-faint"> ·</span> : null}
              </label>
            ))}
          </div>
          <p className="text-ink-faint mt-2 text-xs">
            The bucket hands nothing over past that point. The one marked · is this drop’s default.
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor={ids.passphrase}>
            Password on this transfer
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={ids.passphrase}
              type={revealed ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={PASSPHRASE_MAX_LENGTH}
              placeholder="none"
              value={value.passphrase ?? ''}
              onChange={(event) => set({ passphrase: event.target.value })}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => setRevealed((shown) => !shown)}
              className="border-line-strong text-ink-faint hover:border-accent hover:text-accent shrink-0 rounded-md border px-3 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition-colors"
              aria-pressed={revealed}
            >
              {revealed ? 'hide' : 'show'}
            </button>
            <button
              type="button"
              onClick={() => {
                set({ passphrase: generatePassphrase() })
                setRevealed(true)
              }}
              className="border-line-strong text-ink-faint hover:border-accent hover:text-accent shrink-0 rounded-md border px-3 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition-colors"
            >
              draw one
            </button>
          </div>
          <p className={`mt-2 text-xs ${tooShort ? 'text-danger' : 'text-ink-faint'}`}>
            {tooShort
              ? `At least ${PASSPHRASE_MIN_LENGTH} characters, or none at all.`
              : 'Asked for before the file can be seen. Send it by another route than the code.'}
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor={ids.filename}>
            Call it something else
          </label>
          <input
            id={ids.filename}
            type="text"
            value={filename}
            onChange={(event) => onFilename(event.target.value)}
            className={`${FIELD} mt-2`}
          />
          <p className="text-ink-faint mt-2 text-xs">The name it downloads under on the other side.</p>
        </div>

        <div>
          <label className={LABEL} htmlFor={ids.device}>
            Sent from
          </label>
          <input
            id={ids.device}
            type="text"
            maxLength={60}
            placeholder="this machine"
            value={value.device ?? ''}
            onChange={(event) => set({ device: event.target.value })}
            className={`${FIELD} mt-2`}
          />
          <p className="text-ink-faint mt-2 text-xs">Shown beside the file, so the other end knows who dropped it.</p>
        </div>

        <div>
          <label className={LABEL} htmlFor={ids.note}>
            A line with it
          </label>
          <textarea
            id={ids.note}
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="optional"
            value={value.note ?? ''}
            onChange={(event) => set({ note: event.target.value })}
            className={`${FIELD} mt-2 resize-none`}
          />
          <p className="text-ink-faint mt-2 text-xs">
            {value.note ? `${value.note.length} of ${NOTE_MAX_LENGTH}` : 'Shown on the pickup page, above the file.'}
          </p>
        </div>

        <label
          htmlFor={ids.once}
          className="border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors"
        >
          <input
            id={ids.once}
            type="checkbox"
            checked={value.oneTime}
            onChange={(event) => set({ oneTime: event.target.checked })}
            className="accent-accent mt-0.5 size-4"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight">Burn it after the first download</span>
            <span className="text-ink-faint mt-1 block text-xs text-pretty">
              The code stops working the moment the file has gone out once. Looking at the preview does not spend it —
              downloading does, and only the first download gets the bytes.
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  )
}
