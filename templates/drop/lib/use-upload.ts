'use client'

import { FILENAME_HEADER, parseTransferErrorBody, type CreatedTransfer } from '@s3nd/protocol'
import { useCallback, useRef, useState } from 'react'

import { sendOptionHeaders, type SendOptions } from './options'

/**
 * The upload, as this template needs it: the protocol's `POST /`, plus the
 * sender's options, plus a progress bar.
 *
 * `useSendTransfer()` from `@s3nd/react` is the shorter way to do the first
 * two — it is what a local-first app should reach for — but it sends with
 * `fetch`, and `fetch` cannot say how far a request body has gone. A drop box
 * is the one place where that number is the interface, so this one is an
 * `XMLHttpRequest`. Everything on the wire is the same.
 */

export type UploadStatus = 'idle' | 'sending' | 'done' | 'error'

export interface UploadInput {
  file: File
  /** What it should be called on the other side. Defaults to the file's name. */
  filename?: string
  options: SendOptions
  /** The deployment's upload password, when it asks for one. */
  password?: string
}

export interface Upload {
  send: (input: UploadInput) => Promise<CreatedTransfer | null>
  /** 0 to 100 while sending. */
  progress: number
  status: UploadStatus
  isPending: boolean
  transfer: CreatedTransfer | null
  error: string | null
  /** True when the deployment refused the upload for want of its password. */
  unauthorized: boolean
  cancel: () => void
  reset: () => void
}

/** The message a server that speaks the protocol put in its answer. */
function errorFrom(xhr: XMLHttpRequest): { message: string; unauthorized: boolean } {
  let payload: unknown

  try {
    payload = JSON.parse(xhr.responseText) as unknown
  } catch {
    payload = undefined
  }

  const parsed = parseTransferErrorBody(payload)
  const unauthorized = parsed?.code === 'UNAUTHORIZED' || xhr.status === 401

  if (parsed) return { message: parsed.message, unauthorized }
  if (xhr.status === 0) return { message: 'The upload did not reach the server.', unauthorized: false }
  if (xhr.status === 413) {
    return { message: 'The server refused the file: it is larger than this drop accepts.', unauthorized }
  }

  return { message: `The server answered ${xhr.status}.`, unauthorized }
}

export function useUpload(): Upload {
  const request = useRef<XMLHttpRequest | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [transfer, setTransfer] = useState<CreatedTransfer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  const reset = useCallback(() => {
    request.current?.abort()
    request.current = null
    setProgress(0)
    setStatus('idle')
    setTransfer(null)
    setError(null)
    setUnauthorized(false)
  }, [])

  const cancel = useCallback(() => {
    request.current?.abort()
    request.current = null
    setStatus('idle')
    setProgress(0)
  }, [])

  const send = useCallback(({ file, filename, options, password }: UploadInput) => {
    request.current?.abort()

    setStatus('sending')
    setProgress(0)
    setError(null)
    setUnauthorized(false)

    return new Promise<CreatedTransfer | null>((resolve) => {
      const xhr = new XMLHttpRequest()
      request.current = xhr

      xhr.open('POST', '/api/transfers')
      xhr.responseType = 'text'
      xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
      xhr.setRequestHeader(FILENAME_HEADER, encodeURIComponent(filename?.trim() || file.name))
      if (password) xhr.setRequestHeader('authorization', `Bearer ${password}`)
      for (const [name, value] of Object.entries(sendOptionHeaders(options))) {
        xhr.setRequestHeader(name, value)
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100))
      })

      xhr.addEventListener('load', () => {
        request.current = null

        if (xhr.status !== 201) {
          const failure = errorFrom(xhr)
          setStatus('error')
          setError(failure.message)
          setUnauthorized(failure.unauthorized)
          resolve(null)

          return
        }

        // The bytes are in; the bar should say so before the code appears.
        setProgress(100)
        const created = JSON.parse(xhr.responseText) as CreatedTransfer
        setTransfer(created)
        setStatus('done')
        resolve(created)
      })

      xhr.addEventListener('error', () => {
        request.current = null
        setStatus('error')
        setError('The upload did not reach the server.')
        resolve(null)
      })

      xhr.addEventListener('abort', () => resolve(null))

      xhr.send(file)
    })
  }, [])

  return {
    send,
    progress,
    status,
    isPending: status === 'sending',
    transfer,
    error,
    unauthorized,
    cancel,
    reset,
  }
}
