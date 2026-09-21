'use client'

import { S3ndProvider, isTransferError, useSendTransfer, type CreatedTransfer } from '@s3nd/react'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react'

import { formatBytes, formatExpiry, groupCode } from '@/lib/format'

import { CodeBoard } from './code-board'
import { CopyButton } from './copy-button'

interface DropProps {
  /** Bytes. Shown as a hint and checked before anything is uploaded. */
  maxSize: number
  /** Seconds. Shown as a hint; the server stamps the real expiry. */
  expiresIn: number
}

/**
 * The upload page. The provider sends the password, when one is needed, as
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
    </div>
  )
}

function Result({ transfer, file, onReset }: { transfer: CreatedTransfer; file: File | null; onReset: () => void }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const link = `${origin}/${transfer.code}`

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-12 pb-16 sm:pt-20">
      <p className="rise text-ok font-mono text-[11px] font-semibold tracking-[0.22em] uppercase">
        ✓ In your bucket · expires {formatExpiry(transfer.expiresAt)}
      </p>
      <h1 className="rise rise-1 mt-4 text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
        Read this out to them.
      </h1>
      {file ? (
        <p className="rise rise-2 text-ink-muted mt-3 font-mono text-sm">
          {file.name} · {formatBytes(transfer.size ?? file.size)}
        </p>
      ) : null}

      <div className="rise rise-2 border-line-strong bg-surface mt-8 rounded-xl border shadow-[0_1px_0_rgb(0_0_0/0.6),0_12px_32px_-16px_rgb(0_0_0/0.8)]">
        <div className="hazard h-2 rounded-t-xl" aria-hidden="true" />
        <div className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8">
          <CodeBoard code={transfer.code} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CopyButton text={transfer.code} label={`Copy ${groupCode(transfer.code)}`} />
            <CopyButton text={link} label="Copy the link" />
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

      <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
        >
          Send another <span aria-hidden="true">→</span>
        </button>
        <Link
          className="btn border-ink/30 bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-md border px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
          href={`/${transfer.code}`}
        >
          Open the pickup page
        </Link>
      </div>
    </div>
  )
}
