'use client'

import { S3ndProvider, isTransferError, useSendTransfer, type CreatedTransfer } from '@s3nd/react'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react'

import { formatBytes, formatExpiry, groupCode } from '@/lib/format'

import { CodeBoard } from './code-board'
import { CopyButton } from './copy-button'
import { BurnButton } from './pickup-actions'
import { PickupForm } from './pickup-form'
import { QrCode } from './qr-code'

interface DropProps {
  /** Bytes. Shown as a hint and checked before anything is uploaded. */
  maxSize: number
  /** Seconds. Shown as a hint; the server stamps the real expiry. */
  expiresIn: number
}

/**
 * The front page. The provider sends the password, when one is needed, as
 * a bearer token on every request; the first upload finds out whether it is.
 */
export function Drop(props: DropProps) {
  const [password, setPassword] = useState('')

  return (
    <S3ndProvider baseUrl="/api/transfers" headers={password ? { authorization: `Bearer ${password}` } : undefined}>
      <DropZone {...props} password={password} onPassword={setPassword} />
    </S3ndProvider>
  )
}

function humanDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  if (seconds < 48 * 3600) return `${Math.round(seconds / 3600)} h`

  return `${Math.round(seconds / 86400)} days`
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

function DropZone({
  maxSize,
  expiresIn,
  password,
  onPassword,
}: DropProps & { password: string; onPassword: (value: string) => void }) {
  const inputId = useId()
  const passwordId = useId()
  const input = useRef<HTMLInputElement>(null)
  const pending = useRef<File | null>(null)
  const { sendFile, transfer, isPending, error, reset } = useSendTransfer()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [tooLarge, setTooLarge] = useState<File | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const burned = useBurnedNotice()

  const unauthorized = isTransferError(error) && error.code === 'UNAUTHORIZED'

  // The first upload without a password answers 401: ask, and keep the file.
  useEffect(() => {
    if (unauthorized) setNeedsPassword(true)
  }, [unauthorized])

  const send = useCallback(
    (candidate: File) => {
      setTooLarge(null)
      if (candidate.size > maxSize) {
        setTooLarge(candidate)
        return
      }
      setFile(candidate)
      pending.current = candidate
      void sendFile(candidate)
    },
    [maxSize, sendFile],
  )

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) send(dropped)
  }

  const retry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) void sendFile(pending.current)
  }

  const startOver = () => {
    reset()
    setFile(null)
    pending.current = null
    setTooLarge(null)
    if (input.current) input.current.value = ''
  }

  if (transfer) {
    return <Result transfer={transfer} file={file} onReset={startOver} />
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
        <input
          id={inputId}
          ref={input}
          type="file"
          className="sr-only"
          disabled={isPending}
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked) send(picked)
          }}
        />
        {isPending && file ? (
          <>
            <span className="font-mono text-sm">
              {file.name} <span className="text-ink-faint">· {formatBytes(file.size)}</span>
            </span>
            <span className="hazard hazard-moving mt-2 h-2 w-48 rounded-sm" aria-hidden="true" />
            <span className="text-ink-faint font-mono text-[10px] tracking-[0.22em] uppercase" aria-live="polite">
              uploading to your bucket
            </span>
          </>
        ) : (
          <>
            <span className="text-accent font-mono text-3xl" aria-hidden="true">
              ↓
            </span>
            <span className="text-2xl font-bold tracking-tight">Drop a file here</span>
            <span className="text-ink-muted text-sm">
              or <span className="text-accent underline decoration-dotted underline-offset-4">choose one</span>
            </span>
            <span className="text-ink-faint mt-2 font-mono text-[10px] tracking-[0.22em] uppercase">
              up to {formatBytes(maxSize)} · expires after {humanDuration(expiresIn)}
            </span>
          </>
        )}
      </label>

      {tooLarge ? (
        <p className="text-danger mt-4 text-sm" role="alert">
          {tooLarge.name} is {formatBytes(tooLarge.size)}; this drop takes files up to {formatBytes(maxSize)}.
        </p>
      ) : null}

      {needsPassword ? (
        <form
          onSubmit={retry}
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
              onChange={(event) => onPassword(event.target.value)}
              className="border-line-strong focus:border-accent mt-2 w-full rounded-md border bg-[#0d0d0c] px-3 py-2.5 font-mono text-sm outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!password || !pending.current || isPending}
            className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-50"
          >
            Upload {pending.current ? pending.current.name : ''} <span aria-hidden="true">→</span>
          </button>
        </form>
      ) : null}

      {error && !unauthorized ? (
        <p className="text-danger mt-4 text-sm" role="alert">
          {error.message}
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
function useStillThere(code: string, active: boolean): boolean {
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
        const response = await fetch(`/api/transfers/${encodeURIComponent(code)}`, { cache: 'no-store' })
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
  }, [code, active])

  return gone
}

function Result({ transfer, file, onReset }: { transfer: CreatedTransfer; file: File | null; onReset: () => void }) {
  const [origin, setOrigin] = useState('')
  const [burned, setBurned] = useState(false)
  useEffect(() => setOrigin(window.location.origin), [])

  const link = `${origin}/${transfer.code}`
  const gone = useStillThere(transfer.code, !burned)
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
      {file ? (
        <p className="rise rise-2 text-ink-muted mt-3 font-mono text-sm">
          {file.name} · {formatBytes(transfer.size ?? file.size)}
        </p>
      ) : null}

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
            <BurnButton code={transfer.code} onBurned={() => setBurned(true)} />
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
