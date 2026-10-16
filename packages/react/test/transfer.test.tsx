import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { TransferError, type CreatedTransfer, type TransferClient, type TransferMetadata } from '@s3nd/protocol'

import { S3ndProvider, useReceiveTransfer, useSendTransfer, useTransferClient } from '../src/index.js'

function created(code = 'K7QP2M4X', kind: 'snapshot' | 'file' = 'snapshot'): CreatedTransfer {
  return { code, kind, createdAt: '2026-01-01T00:00:00.000Z' }
}

function metadata(overrides: Partial<TransferMetadata> = {}): TransferMetadata {
  return { code: 'K7QP2M4X', kind: 'snapshot', createdAt: '2026-01-01T00:00:00.000Z', ...overrides }
}

function fakeClient(overrides: Partial<TransferClient> = {}): TransferClient {
  return {
    createSnapshot: vi.fn(async () => created()),
    createFile: vi.fn(async () => created('ABCD1234', 'file')),
    read: vi.fn(async () => metadata()),
    readBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
    remove: vi.fn(async () => {}),
    ...overrides,
  }
}

function wrap(client: TransferClient) {
  return ({ children }: { children: ReactNode }) => <S3ndProvider client={client}>{children}</S3ndProvider>
}

describe('useTransferClient', () => {
  it('says what is missing when there is no provider', () => {
    // React logs the thrown error; the assertion is what matters.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useTransferClient())).toThrow(/S3ndProvider/)

    quiet.mockRestore()
  })

  it('hands back the client the provider was given', () => {
    const client = fakeClient()
    const { result } = renderHook(() => useTransferClient(), { wrapper: wrap(client) })

    expect(result.current).toBe(client)
  })
})

describe('useSendTransfer', () => {
  it('sends state and exposes the code', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.send({ notes: ['one'] }, { version: 3, device: 'Pixel 8' })
    })

    expect(result.current.status).toBe('success')
    expect(result.current.transfer?.code).toBe('K7QP2M4X')
    expect(client.createSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ data: { notes: ['one'] }, version: 3, device: 'Pixel 8' }),
    )
  })

  it('takes a File and keeps its name and type', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
    await act(async () => {
      await result.current.sendFile(file)
    })

    expect(client.createFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'report.pdf', contentType: 'application/pdf' }),
    )
    expect(result.current.transfer?.kind).toBe('file')
  })

  it('names a Blob, which has no name of its own', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.sendFile(new Blob(['x']), 'chosen.txt')
    })

    expect(client.createFile).toHaveBeenCalledWith(expect.objectContaining({ filename: 'chosen.txt' }))
  })

  it('surfaces a failure as state rather than a rejection', async () => {
    const client = fakeClient({
      createSnapshot: vi.fn(async () => {
        throw new TransferError('TOO_LARGE', 'That database is too large.', { status: 413 })
      }),
    })
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    let returned: unknown = 'unset'
    await act(async () => {
      // No try/catch: an event handler should not need one.
      returned = await result.current.send({})
    })

    expect(returned).toBeNull()
    expect(result.current.status).toBe('error')
    expect((result.current.error as TransferError).code).toBe('TOO_LARGE')
  })

  it('goes back to idle on reset', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.send({})
    })
    act(() => result.current.reset())

    expect(result.current.status).toBe('idle')
    expect(result.current.transfer).toBeNull()
  })

  it('lets the newest send win, whatever order the replies arrive in', async () => {
    const resolvers: ((value: CreatedTransfer) => void)[] = []
    const client = fakeClient({
      createSnapshot: vi.fn(
        () => new Promise<CreatedTransfer>((resolve) => resolvers.push(resolve)),
      ) as TransferClient['createSnapshot'],
    })
    const { result } = renderHook(() => useSendTransfer(), { wrapper: wrap(client) })

    act(() => {
      void result.current.send({ which: 'first' })
    })
    act(() => {
      void result.current.send({ which: 'second' })
    })

    // The first request answers last — the stale reply must not overwrite.
    await act(async () => {
      resolvers[1]!(created('SECOND01'))
      resolvers[0]!(created('FIRST001'))
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.transfer?.code).toBe('SECOND01')
  })
})

describe('useReceiveTransfer', () => {
  it('loads a snapshot and types its data', async () => {
    const client = fakeClient({
      read: vi.fn(async () => metadata({ data: { notes: ['one'] }, device: 'Pixel 8', version: 3 })),
    })
    const { result } = renderHook(() => useReceiveTransfer<{ notes: string[] }>(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.load('K7QP2M4X')
    })

    expect(result.current.transfer?.device).toBe('Pixel 8')
    expect(result.current.data?.notes).toEqual(['one'])
    expect(result.current.notFound).toBe(false)
  })

  it('reports an unknown code as a fact, not a failure', async () => {
    const client = fakeClient({ read: vi.fn(async () => null) })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.load('K7QP2M4X')
    })

    expect(result.current.notFound).toBe(true)
    expect(result.current.status).toBe('success')
    expect(result.current.error).toBeNull()
  })

  it('does not claim not-found when the request itself failed', async () => {
    const client = fakeClient({
      read: vi.fn(async () => {
        throw new TransferError('INTERNAL', 'The server answered 500.', { status: 500 })
      }),
    })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.load('K7QP2M4X')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.notFound).toBe(false)
  })

  it('clears not-found when a later load succeeds', async () => {
    const read = vi.fn<TransferClient['read']>()
    read.mockResolvedValueOnce(null).mockResolvedValueOnce(metadata())
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(fakeClient({ read })) })

    await act(async () => {
      await result.current.load('BADCODE1')
    })
    expect(result.current.notFound).toBe(true)

    await act(async () => {
      await result.current.load('K7QP2M4X')
    })
    expect(result.current.notFound).toBe(false)
  })

  it('fetches the bytes behind a file into state', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    let bytes: Uint8Array | null = null
    await act(async () => {
      bytes = await result.current.loadBytes('ABCD1234')
    })

    expect(bytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(result.current.bytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(result.current.status).toBe('success')
    expect(client.readBytes).toHaveBeenCalledWith('ABCD1234', { signal: expect.any(AbortSignal) })
  })

  it('shows a download in progress, the long operation of the hook', async () => {
    let finish: (bytes: Uint8Array) => void = () => {}
    const client = fakeClient({
      readBytes: vi.fn(() => new Promise<Uint8Array>((resolve) => (finish = resolve))) as TransferClient['readBytes'],
    })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    act(() => {
      void result.current.loadBytes('ABCD1234')
    })

    expect(result.current.status).toBe('pending')
    expect(result.current.isPending).toBe(true)

    await act(async () => finish(new Uint8Array([9])))

    expect(result.current.isPending).toBe(false)
    expect(result.current.bytes).toEqual(new Uint8Array([9]))
  })

  it('leaves what load found alone when it fetches the bytes', async () => {
    const client = fakeClient({ read: vi.fn(async () => metadata({ kind: 'file', filename: 'report.pdf' })) })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.load('ABCD1234')
    })
    await act(async () => {
      await result.current.loadBytes('ABCD1234')
    })

    expect(result.current.transfer?.filename).toBe('report.pdf')
    expect(result.current.bytes).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('exposes a failed download as error, without dropping the transfer', async () => {
    const client = fakeClient({
      readBytes: vi.fn(async () => {
        throw new TransferError('INTERNAL', 'The server answered 500.', { status: 500 })
      }),
    })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.load('ABCD1234')
    })

    let returned: unknown = 'unset'
    await act(async () => {
      returned = await result.current.loadBytes('ABCD1234')
    })

    expect(returned).toBeNull()
    expect(result.current.status).toBe('error')
    expect((result.current.error as TransferError).code).toBe('INTERNAL')
    expect(result.current.notFound).toBe(false)
    expect(result.current.transfer).not.toBeNull()
  })

  it('reports a file that is gone as not found', async () => {
    const client = fakeClient({ readBytes: vi.fn(async () => null) })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.loadBytes('ABCD1234')
    })

    expect(result.current.notFound).toBe(true)
    expect(result.current.bytes).toBeNull()
  })

  it('burns a code', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.burn('K7QP2M4X')
    })

    expect(client.remove).toHaveBeenCalledWith('K7QP2M4X', { signal: expect.any(AbortSignal) })
    expect(result.current.status).toBe('success')
  })

  it('exposes a failed burn as error rather than a rejection', async () => {
    const client = fakeClient({
      remove: vi.fn(async () => {
        throw new TransferError('UNAUTHORIZED', 'Not allowed.', { status: 401 })
      }),
    })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      // No try/catch: an event handler should not need one.
      await result.current.burn('K7QP2M4X')
    })

    expect(result.current.status).toBe('error')
    expect((result.current.error as TransferError).code).toBe('UNAUTHORIZED')
  })

  it('aborts a download on unmount', async () => {
    let seen: AbortSignal | undefined
    const client = fakeClient({
      readBytes: vi.fn((_code: string, options?: { signal?: AbortSignal }) => {
        seen = options?.signal
        return new Promise<Uint8Array | null>(() => {})
      }),
    })
    const { result, unmount } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    act(() => {
      void result.current.loadBytes('ABCD1234')
    })
    unmount()

    expect(seen?.aborted).toBe(true)
  })

  it('aborts a running load when a burn starts', async () => {
    let seen: AbortSignal | undefined
    const client = fakeClient({
      read: vi.fn((_code: string, options?: { signal?: AbortSignal }) => {
        seen = options?.signal
        return new Promise<TransferMetadata | null>(() => {})
      }),
    })
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    act(() => {
      void result.current.load('K7QP2M4X')
    })
    await act(async () => {
      await result.current.burn('K7QP2M4X')
    })

    expect(seen?.aborted).toBe(true)
    expect(result.current.status).toBe('success')
  })

  it('drops the bytes on reset and on the next load', async () => {
    const client = fakeClient()
    const { result } = renderHook(() => useReceiveTransfer(), { wrapper: wrap(client) })

    await act(async () => {
      await result.current.loadBytes('ABCD1234')
    })
    act(() => result.current.reset())
    expect(result.current.bytes).toBeNull()

    await act(async () => {
      await result.current.loadBytes('ABCD1234')
    })
    await act(async () => {
      await result.current.load('K7QP2M4X')
    })
    expect(result.current.bytes).toBeNull()
  })
})
