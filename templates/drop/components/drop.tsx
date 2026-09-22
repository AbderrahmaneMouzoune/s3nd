'use client'

import type { CreatedTransfer } from '@s3nd/protocol'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react'

import { guessDevice } from '@/lib/device'
import { formatBytes, formatExpiry, groupCode } from '@/lib/format'
import {
  DROP_HEADERS,
  durationLabel,
  encodeHeaderValue,
  PASSPHRASE_MIN_LENGTH,
  type ExpiryChoice,
  type SendOptions,
} from '@/lib/options'
import { useUpload } from '@/lib/use-upload'

import { CodeBoard } from './code-board'
import { CopyButton } from './copy-button'
import { FilePreview } from './file-preview'
import { BurnButton } from './pickup-actions'
import { PickupForm } from './pickup-form'
import { QrCode } from './qr-code'
import { SendOptionsForm } from './send-options'

interface DropProps {
  /** Bytes. Shown as a hint and checked before anything is uploaded. */
  maxSize: number
  /** Seconds. The lifetime a transfer gets when the sender changes nothing. */
  expiresIn: number
  /** The lifetimes this deployment offers. */
  choices: ExpiryChoice[]
  /** Whether the pickup page will render what is behind the code. */
  preview: boolean
}

/**
 * The pickup page sends people back here with `?burned=<code>` once they have
 * burned a transfer. Read it once, say so, and take it off the URL.
 */
function useBurnedNotice(): string | null {
  const [burned, setBurned] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('burned')
    if (!code) return
    setBurned(code.toUpperCase())
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return burned
}

/** A `blob:` URL for the staged file, revoked as soon as it is not on screen. */
function useObjectUrl(file: File | null): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setUrl('')
      return
    }

    const created = URL.createObjectURL(file)
    setUrl(created)

    return () => URL.revokeObjectURL(created)
  }, [file])

  return url
}

/**
 * The front page. A file is staged first — shown, named, given a lifetime and
 * whatever else the sender wants — and only then uploaded, so nothing leaves
 * the machine before they have looked at it.
 */
export function Drop({ maxSize, expiresIn, choices, preview }: DropProps) {
  const inputId = useId()
  const passwordId = useId()
  const input = useRef<HTMLInputElement>(null)
  const upload = useUpload()

  const [file, setFile] = useState<File | null>(null)
  const [filename, setFilename] = useState('')
  const [options, setOptions] = useState<SendOptions>({ expiresIn, oneTime: false })
  const [dragging, setDragging] = useState(false)
  const [tooLarge, setTooLarge] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const previewUrl = useObjectUrl(preview ? file : null)
  const burned = useBurnedNotice()

  // The machine's own name, filled in once and the sender's to overwrite.
  useEffect(() => {
    setOptions((current) => (current.device == null ? { ...current, device: guessDevice() } : current))
  }, [])

  const stage = useCallback(
    (candidate: File) => {
      upload.reset()
      setTooLarge(null)

      if (candidate.size > maxSize) {
        setTooLarge(candidate)
        setFile(null)
        return
      }

      setFile(candidate)
      setFilename(candidate.name)
    },
    [maxSize, upload],
  )

  // A screenshot in the clipboard is a file like any other, and pasting it is
  // faster than saving it first.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (file || upload.isPending) return
      const pasted = event.clipboardData?.files?.[0]
      if (pasted) stage(pasted)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [file, stage, upload.isPending])

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) stage(dropped)
  }

  // The server refuses a password too short to be one; the button should not
  // spend an upload finding that out.
  const unsendable = (options.passphrase?.length ?? 0) > 0 && (options.passphrase?.length ?? 0) < PASSPHRASE_MIN_LENGTH

  const send = () => {
    if (!file || unsendable) return
    void upload.send({ file, filename, options, password: password || undefined })
  }

  const startOver = () => {
    upload.reset()
    setFile(null)
    setFilename('')
    setTooLarge(null)
    setOptions({ expiresIn, oneTime: false, device: guessDevice() })
    if (input.current) input.current.value = ''
  }

  if (upload.transfer) {
    return (
      <Result
        transfer={upload.transfer}
        filename={filename}
        options={options}
        preview={preview ? previewUrl : ''}
        contentType={file?.type}
        onReset={startOver}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-12 pb-16 sm:pt-20">
      <p className="rise text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        Your bucket · A code · No account
      </p>
      <h1 className="rise rise-1 mt-4 text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
        Drop a file. Hand over the code.
      </h1>
      <p className="rise rise-2 text-ink-muted mt-4 max-w-xl text-lg text-pretty">
        It lands in a bucket you own, under eight characters anyone can read out loud. Pick it up on any device, until
        it expires.
      </p>

      {burned ? (
        <p className="rise rise-2 mt-5 flex flex-wrap items-center gap-2 font-mono text-sm" role="status">
          <span className="border-danger text-danger inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.2em] uppercase">
            gone
          </span>
          <span className="text-ink-muted">{groupCode(burned)} is burned. Nothing is left in the bucket under it.</span>
        </p>
      ) : null}

      <input
        id={inputId}
        ref={input}
        type="file"
        className="sr-only"
        disabled={upload.isPending}
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (picked) stage(picked)
        }}
      />

      {file ? (
        <div className="rise mt-10 flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            {preview ? (
              <FilePreview src={previewUrl} filename={filename || file.name} contentType={file.type} size={file.size} />
            ) : null}
            <div className={preview ? '' : 'md:col-span-2'}>
              <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
                Ready to go up
              </p>
              <p className="mt-2 font-mono text-sm break-all">
                {filename || file.name} <span className="text-ink-faint">· {formatBytes(file.size)}</span>
              </p>
              <p className="text-ink-faint mt-1 font-mono text-[10px] tracking-[0.22em] uppercase">
                {file.type || 'unknown type'} · expires after {durationLabel(options.expiresIn)}
                {options.oneTime ? ' · one download' : ''}
                {options.passphrase ? ' · password' : ''}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={send}
                  disabled={upload.isPending || unsendable}
                  className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
                >
                  {upload.isPending ? `Sending ${upload.progress}%` : 'Send it'} <span aria-hidden="true">→</span>
                </button>
                {upload.isPending ? (
                  <button
                    type="button"
                    onClick={upload.cancel}
                    className="text-ink-faint hover:text-danger px-2 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase transition-colors"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startOver}
                    className="text-ink-faint hover:text-ink px-2 py-3.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase transition-colors"
                  >
                    Choose another
                  </button>
                )}
              </div>

              {upload.isPending ? (
                <div className="mt-5">
                  <div
                    className="bg-surface h-2 w-full overflow-hidden rounded-sm"
                    role="progressbar"
                    aria-valuenow={upload.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Upload progress"
                  >
                    <span
                      className="hazard hazard-moving block h-full transition-[width] duration-200"
                      style={{ width: `${Math.max(upload.progress, 4)}%` }}
                    />
                  </div>
                  <p
                    className="text-ink-faint mt-2 font-mono text-[10px] tracking-[0.22em] uppercase"
                    aria-live="polite"
                  >
                    {upload.progress < 100 ? 'uploading to your bucket' : 'in the bucket · claiming a code'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <SendOptionsForm
            value={options}
            onChange={setOptions}
            filename={filename}
            onFilename={setFilename}
            choices={choices}
            defaultExpiresIn={expiresIn}
            disabled={upload.isPending}
          />
        </div>
      ) : (
        <label
          htmlFor={inputId}
          data-dragging={dragging || undefined}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="dropzone rise rise-3 bg-surface mt-10 flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-8 text-center"
        >
          <span className="text-accent font-mono text-3xl" aria-hidden="true">
            ↓
          </span>
          <span className="text-2xl font-bold tracking-tight">Drop a file here</span>
          <span className="text-ink-muted text-sm">
            or <span className="text-accent underline decoration-dotted underline-offset-4">choose one</span>, or paste
            it
          </span>
          <span className="text-ink-faint mt-2 font-mono text-[10px] tracking-[0.22em] uppercase">
            up to {formatBytes(maxSize)} · you pick the rest before it goes
          </span>
        </label>
      )}

      {tooLarge ? (
        <p className="text-danger mt-4 text-sm" role="alert">
          {tooLarge.name} is {formatBytes(tooLarge.size)}; this drop takes files up to {formatBytes(maxSize)}.
        </p>
      ) : null}

      {upload.unauthorized ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          className="border-line bg-surface mt-6 flex flex-wrap items-end gap-3 rounded-lg border p-4"
        >
          <div className="min-w-0 flex-1">
            <label
              className="text-ink-faint block font-mono text-[10px] tracking-[0.22em] uppercase"
              htmlFor={passwordId}
            >
              This drop asks for a password before an upload
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-line-strong focus:border-accent mt-2 w-full rounded-md border bg-[#0d0d0c] px-3 py-2.5 font-mono text-sm outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!password || !file || upload.isPending || unsendable}
            className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
          >
            Send it <span aria-hidden="true">→</span>
          </button>
        </form>
      ) : null}

      {upload.error && !upload.unauthorized ? (
        <p className="text-danger mt-4 text-sm" role="alert">
          {upload.error}
        </p>
      ) : null}

      <Pickup />
    </div>
  )
}

/** The other half of the front page: someone with a code, here to collect. */
function Pickup() {
  return (
    <section className="rise rise-3 mt-12" aria-labelledby="pickup-title">
      <div className="perforation mb-10" aria-hidden="true" />
      <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <div>
          <p className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
            Already have a code?
          </p>
          <h2 id="pickup-title" className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-balance sm:text-3xl">
            Type it in, and pick the file up here.
          </h2>
          <div className="mt-6">
            <PickupForm />
          </div>
        </div>
        <div className="border-line bg-surface rounded-lg border p-5 text-sm leading-relaxed">
          <p className="font-bold tracking-tight">From a laptop to your phone</p>
          <p className="text-ink-muted mt-2">
            Point the phone’s camera at the QR code shown next to the code on the other screen. The pickup page opens
            straight away, download the file there, and burn the code once you have it.
          </p>
          <p className="text-ink-faint mt-3 font-mono text-[10px] tracking-[0.22em] uppercase">
            or, from a terminal: s3nd get k7qp-2m4x
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * While the result is on screen, ask the bucket now and then whether the
 * transfer is still there. It stops being there when the other device burned
 * it, or when it expired; either way, the sender should know.
 */
function useStillThere(code: string, active: boolean, passphrase?: string): boolean {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!active) return
    let polls = 0
    let cancelled = false

    const interval = setInterval(async () => {
      // Ten minutes of watching, then the tab stops asking.
      if (++polls > 120) {
        clearInterval(interval)
        return
      }
      try {
        // The sender knows their own password, so a protected transfer
        // answers them too rather than looking gone.
        const response = await fetch(`/api/transfers/${encodeURIComponent(code)}`, {
          cache: 'no-store',
          headers: passphrase ? { [DROP_HEADERS.passphrase]: encodeHeaderValue(passphrase) } : undefined,
        })
        if (!cancelled && (response.status === 404 || response.status === 410)) {
          setGone(true)
          clearInterval(interval)
        }
      } catch {
        // Offline for a moment: ask again next time.
      }
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [code, active, passphrase])

  return gone
}

function Result({
  transfer,
  filename,
  options,
  preview,
  contentType,
  onReset,
}: {
  transfer: CreatedTransfer
  filename: string
  options: SendOptions
  /** The staged file's `blob:` URL, still alive while this page is on screen. */
  preview: string
  contentType?: string
  onReset: () => void
}) {
  const [origin, setOrigin] = useState('')
  const [burned, setBurned] = useState(false)
  useEffect(() => setOrigin(window.location.origin), [])

  const link = `${origin}/${transfer.code}`
  const gone = useStillThere(transfer.code, !burned, options.passphrase)
  const over = burned || gone

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-12 pb-16 sm:pt-20">
      {over ? (
        <p className="rise text-danger font-mono text-[11px] font-semibold tracking-[0.22em] uppercase" role="status">
          ✕ {burned ? 'Burned · nothing left in the bucket' : 'Gone · picked up and burned, or expired'}
        </p>
      ) : (
        <p className="rise text-ok font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
          ✓ In your bucket · expires {formatExpiry(transfer.expiresAt)}
        </p>
      )}
      <h1 className="rise rise-1 mt-4 text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
        {over ? 'That code is spent.' : 'Read this out, or show it.'}
      </h1>
      <p className="rise rise-2 text-ink-muted mt-3 font-mono text-sm break-all">
        {filename} · {formatBytes(transfer.size)}
      </p>
      <ul className="rise rise-2 text-ink-faint mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.22em] uppercase">
        <li>expires after {durationLabel(options.expiresIn)}</li>
        {options.passphrase ? <li className="text-accent">password set</li> : null}
        {options.oneTime ? <li className="text-accent">burns after one download</li> : null}
        {options.device ? <li>from {options.device}</li> : null}
        {options.note ? <li>with a note</li> : null}
      </ul>

      <div
        className={`rise rise-2 border-line-strong bg-surface mt-8 rounded-xl border shadow-[0_1px_0_rgb(0_0_0/0.6),0_12px_32px_-16px_rgb(0_0_0/0.8)] ${
          over ? 'opacity-60' : ''
        }`}
      >
        <div className="hazard h-2 rounded-t-xl" aria-hidden="true" />
        <div className="grid gap-8 px-5 py-8 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex flex-col items-center gap-6">
            <CodeBoard code={transfer.code} />
            {!over ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <CopyButton text={transfer.code} label={`Copy ${groupCode(transfer.code)}`} />
                <CopyButton text={link} label="Copy the link" />
                {options.passphrase ? <CopyButton text={options.passphrase} label="Copy the password" /> : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-3 md:border-l md:border-[var(--color-line)] md:pl-8">
            {origin ? (
              <QrCode
                value={link}
                label={`The pickup page for ${groupCode(transfer.code)}, as a QR code`}
                size={168}
                className={`rounded-md ${over ? 'grayscale' : ''}`}
              />
            ) : (
              <div className="size-[168px] rounded-md bg-[#f3efe4]/10" aria-hidden="true" />
            )}
            <p className="text-ink-faint max-w-[12rem] text-center font-mono text-[10px] leading-relaxed tracking-[0.18em] uppercase">
              scan it with a phone: the pickup page opens there
            </p>
          </div>
        </div>
        <div className="perforation" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link className="text-accent min-w-0 truncate font-mono text-sm hover:underline" href={`/${transfer.code}`}>
            {link || `/${transfer.code}`}
          </Link>
          <span className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase">
            or: s3nd get {transfer.code.toLowerCase()}
          </span>
        </div>
      </div>

      {options.passphrase && !over ? (
        <p className="border-accent/50 bg-accent-soft text-ink-muted mt-6 rounded-lg border px-5 py-4 text-sm text-pretty">
          <span className="text-accent font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
            The password is not stored anywhere readable.
          </span>{' '}
          Nothing can recover it, and this page is the last place it appears in the clear. Send it by a different route
          from the code — the point of two secrets is that they do not travel together.
        </p>
      ) : null}

      {preview && !over ? (
        <FilePreview
          src={preview}
          filename={filename}
          contentType={contentType}
          size={transfer.size}
          className="mt-6"
        />
      ) : null}

      <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
        >
          Send another <span aria-hidden="true">→</span>
        </button>
        {!over ? (
          <>
            <Link
              className="btn border-ink/30 bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-md border px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
              href={`/${transfer.code}`}
            >
              Open the pickup page
            </Link>
            <BurnButton code={transfer.code} passphrase={options.passphrase} onBurned={() => setBurned(true)} />
          </>
        ) : null}
      </div>
      {!over ? (
        <p className="rise rise-3 text-ink-faint mt-4 max-w-xl text-sm text-pretty">
          Once the other device has the file, burn the code from either side: this page notices when it is gone.
        </p>
      ) : null}
    </div>
  )
}
