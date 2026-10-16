'use client'

import type { CreatedTransfer } from '@s3nd/protocol'
import { useCallback, useRef, useState } from 'react'

import { useAsyncTask, type AsyncStatus } from './async-task.js'
import { useTransferClient } from './provider.js'

export interface SendSnapshotOptions {
  /** Your schema version, so a restoring device can refuse data it cannot read. */
  version?: number
  /** Free label for this device, e.g. "Pixel 8". */
  device?: string
}

export interface SendTransfer {
  /** Stores application state and returns the transfer, or `null` on failure. */
  send: (data: unknown, options?: SendSnapshotOptions) => Promise<CreatedTransfer | null>
  /** Stores a file — a `File` straight off an `<input type="file">` works. */
  sendFile: (file: File | Blob, filename?: string) => Promise<CreatedTransfer | null>
  /** The created transfer: `transfer.code` is what the user carries across. */
  transfer: CreatedTransfer | null
  /**
   * How much of the current send has gone out, from 0 to 1. Moves with the
   * bytes for a file; a snapshot, posted in one request, goes from 0 to 1.
   */
  progress: number
  status: AsyncStatus
  isPending: boolean
  error: Error | null
  reset: () => void
}

/**
 * The sending device: hand it state or a file, get back the code to show.
 *
 * ```tsx
 * const { send, transfer, isPending } = useSendTransfer()
 *
 * <button onClick={() => send(await exportDatabase(), { version: 3 })} disabled={isPending}>
 *   Move to another device
 * </button>
 * {transfer && <Code value={transfer.code} />}
 * ```
 */
export function useSendTransfer(): SendTransfer {
  const client = useTransferClient()
  const { data, status, error, run, reset: resetTask } = useAsyncTask<CreatedTransfer>()
  const [progress, setProgress] = useState(0)
  const latest = useRef(0)

  /**
   * Runs a send, and moves `progress` to 1 once it has succeeded. A send that
   * was superseded meanwhile leaves the bar to the one that replaced it.
   */
  const tracked = useCallback(
    async (task: (signal: AbortSignal, report: (value: number) => void) => Promise<CreatedTransfer>) => {
      const id = (latest.current += 1)
      const report = (value: number) => {
        if (id === latest.current) setProgress(value)
      }

      report(0)
      const result = await run((signal) => task(signal, report))
      if (result) report(1)

      return result
    },
    [run],
  )

  const send = useCallback(
    (data: unknown, options: SendSnapshotOptions = {}) =>
      tracked((signal) => client.createSnapshot({ data, version: options.version, device: options.device, signal })),
    [client, tracked],
  )

  const sendFile = useCallback(
    (file: File | Blob, filename?: string) =>
      tracked((signal, report) =>
        client.createFile({
          body: file,
          // A Blob has no name; a File does. Fall back to something rather than
          // storing a transfer nobody can identify.
          filename: filename ?? (file instanceof File ? file.name : 'file'),
          contentType: file.type || undefined,
          signal,
          // The last byte out is not the end: the server still has to answer.
          // So the bar stops just short of 1 until it has.
          onProgress: ({ loaded, total }) => {
            if (total) report(Math.min(loaded / total, 0.99))
          },
        }),
      ),
    [client, tracked],
  )

  const reset = useCallback(() => {
    latest.current += 1
    setProgress(0)
    resetTask()
  }, [resetTask])

  return { send, sendFile, transfer: data, progress, status, isPending: status === 'pending', error, reset }
}
