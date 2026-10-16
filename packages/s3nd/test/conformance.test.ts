import { describe, expect, it } from 'vitest'

import { createTransferHandler, type TransferHandlerConfig } from '../src/handler.js'
import { runConformance, type ConformanceResult, type ConformanceServer } from '@s3nd/protocol/conformance'
import { bucketPut, memoryBucket, MEMORY_ENDPOINT } from './helpers.js'

/**
 * `createTransferHandler()` held to `PROTOCOL.md` by the suite any other
 * server is held to, in the configurations that change what the protocol
 * asks of it. The same run goes against MinIO in test/integration.
 */
const BASE = 'http://drop.test/api/transfers'
const ORIGIN = 'https://app.test'

function serve(config: Partial<TransferHandlerConfig> = {}, maxSize?: number) {
  const { memory, bucket } = memoryBucket({ maxSize })
  const handler = createTransferHandler({ bucket, ...config })

  // The server and the bucket's HTTP side, behind one fetch.
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    return new URL(request.url).origin === MEMORY_ENDPOINT ? bucketPut(memory, request) : handler(request)
  }

  return { handler, fetch: fetch as typeof globalThis.fetch }
}

function failures(report: ConformanceResult[]): string[] {
  return report.filter((result) => result.status === 'fail').map((result) => `${result.name}: ${result.detail}`)
}

function statuses(report: ConformanceResult[]): Record<string, string> {
  return Object.fromEntries(report.map((result) => [result.name, result.status]))
}

describe('runConformance against createTransferHandler', () => {
  it('passes with the defaults', async () => {
    const { fetch } = serve()
    const server: ConformanceServer = { expiresIn: 3600, upload: 'proxy', protectDelete: false }

    const report = await runConformance({ baseUrl: BASE, fetch, server })

    expect(failures(report)).toEqual([])
    expect(statuses(report)).toMatchObject({
      Server: 'pass',
      Snapshots: 'pass',
      Files: 'pass',
      'A .json file stays a file': 'pass',
      Codes: 'pass',
      'Delete tokens': 'pass',
      'Presigned uploads': 'skip',
      'Cross-origin requests': 'skip',
    })
  })

  it('passes with every option that changes the contract', { timeout: 30_000 }, async () => {
    // Per code, so the other checks stay well under it.
    const seen = new Map<string, number>()
    const { fetch } = serve(
      {
        expiresIn: 2,
        maxRequestSize: 4096,
        upload: 'both',
        protectDelete: true,
        cors: { origin: [ORIGIN] },
        rateLimit: (_request, { code }) => {
          if (!code) return true
          const count = (seen.get(code) ?? 0) + 1
          seen.set(code, count)
          return count <= 20
        },
      },
      4096,
    )
    const server: ConformanceServer = {
      expiresIn: 2,
      maxSize: 4096,
      upload: 'both',
      protectDelete: true,
      cors: { origin: ORIGIN },
      rateLimit: { requests: 20 },
    }

    const report = await runConformance({ baseUrl: BASE, fetch, server })

    expect(failures(report)).toEqual([])
    expect(report.filter((result) => result.status === 'skip')).toEqual([])
  })

  it('passes a server that takes files only as presigned uploads', async () => {
    const { fetch } = serve({ upload: 'presign' }, 4096)

    const report = await runConformance({ baseUrl: BASE, fetch, server: { upload: 'presign', maxSize: 4096 } })

    expect(failures(report)).toEqual([])
    expect(statuses(report)).toMatchObject({ 'Presigned uploads': 'pass', Files: 'skip', 'Size limit': 'pass' })
  })

  it('passes behind credentials, sent to the server and never to the bucket', async () => {
    const { fetch } = serve({
      upload: 'both',
      authorize: (request) => request.headers.get('authorization') === 'Bearer secret',
    })
    const sent: string[] = []
    const spy: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init)
      if (request.headers.has('authorization')) sent.push(new URL(request.url).host)
      return fetch(request)
    }

    const report = await runConformance({ baseUrl: BASE, fetch: spy, headers: { authorization: 'Bearer secret' } })

    expect(failures(report)).toEqual([])
    expect(new Set(sent)).toEqual(new Set(['drop.test']))
  })

  it('reports a server that drops the version header, and checks nothing else', async () => {
    const { fetch } = serve()
    const stripped: typeof globalThis.fetch = async (input, init) => {
      const response = await fetch(input, init)
      const headers = new Headers(response.headers)
      headers.delete('s3nd-protocol')
      return new Response(response.body, { status: response.status, headers })
    }

    const report = await runConformance({ baseUrl: BASE, fetch: stripped })

    expect(report[0]).toMatchObject({ name: 'Server', status: 'fail' })
    expect(report[0]!.detail).toMatch(/s3nd-protocol/)
    expect(report.slice(1).every((result) => result.status === 'skip')).toBe(true)
  })

  it('reports an error that is not the { error } shape', async () => {
    const { fetch } = serve()
    const plain: typeof globalThis.fetch = async (input, init) => {
      const response = await fetch(input, init)
      if (response.status !== 404) return response
      return new Response('Not here', { status: 404, headers: { 's3nd-protocol': '1', 'content-type': 'text/plain' } })
    }

    const report = await runConformance({ baseUrl: BASE, fetch: plain })

    expect(statuses(report)).toMatchObject({ Server: 'pass', Snapshots: 'fail', Codes: 'fail' })
    expect(report.find((result) => result.name === 'Snapshots')!.detail).toMatch(/section 6\.1/)
  })

  it('reports a server that is configured differently from what it was told', async () => {
    const { fetch } = serve({ protectDelete: true })

    const report = await runConformance({ baseUrl: BASE, fetch, server: { protectDelete: false } })

    expect(report[0]).toMatchObject({ name: 'Server', status: 'fail' })
    expect(report[0]!.detail).toMatch(/requires a delete token/)
  })

  it('fails every check, without throwing, when nothing answers', async () => {
    const refused: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed')
    }

    const report = await runConformance({ baseUrl: BASE, fetch: refused })

    expect(report[0]).toMatchObject({ name: 'Server', status: 'fail', detail: 'a request failed: fetch failed' })
  })
})
