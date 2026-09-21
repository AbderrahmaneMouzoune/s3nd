import { docs, github } from './site'

export interface Example {
  slug: string
  title: string
  summary: string
  /** What the reader learns from it. */
  shows: string[]
  run: string
  source: string
  stack: string[]
}

export const examples: Example[] = [
  {
    slug: 'indexeddb-sync',
    title: 'IndexedDB sync',
    summary:
      'A notes app that keeps everything in IndexedDB and moves it to another device with a code. Open it in two browsers: the second one is empty until the code carries the database across.',
    shows: [
      'A complete exportDatabase / importDatabase pair against a real object store',
      'The code shown grouped in fours, and normalized on the server with or without the spaces',
      'Nothing imported before the user confirms what they are about to restore',
      'ifAbsent on write, a one-hour expiry, and the DELETE after a successful import',
      'A single transaction on import, so a failure halfway leaves the previous data intact',
    ],
    run: 'cp .env.example .env.local\nbun install\nbun run dev   # localhost:3200, in two different browsers',
    source: github('examples/indexeddb-sync'),
    stack: ['Next.js', 'IndexedDB', 's3nd', 'MinIO'],
  },
  {
    slug: 'node-script',
    title: 'Node round trip',
    summary:
      'A whole transfer in one file: write a snapshot under a code, read it back through a sloppily typed version of that code, prove the conditional writes work, then burn it. A smoke test for a new bucket or provider.',
    shows: [
      'The compression ratio on a realistic dump, printed as the headline',
      'A code typed in lowercase with a dash, resolved by codes.normalize()',
      'ifAbsent rejecting a second claim, ifMatch rejecting a stale write',
      'destroy() in a finally, so the script exits without waiting on keep-alive sockets',
    ],
    run: 'cp .env.example .env\nbun install\nnode --env-file=.env --import tsx src/round-trip.ts',
    source: github('examples/node-script'),
    stack: ['Node', 'TypeScript', 's3nd'],
  },
]

/** Worked, copy-pasteable guides that live in the documentation. */
export const guides = [
  {
    title: 'Move to a new device',
    href: docs('/use-cases/new-device'),
    summary: 'Two routes, two calls, a confirmation step.',
  },
  {
    title: 'Continuous backup',
    href: docs('/use-cases/continuous-backup'),
    summary: 'One snapshot per account, conditional writes.',
  },
  {
    title: 'End-to-end encrypted sync',
    href: docs('/use-cases/encrypted-sync'),
    summary: 'WebCrypto in the browser, ciphertext in the bucket.',
  },
  {
    title: 'Attachments beside the data',
    href: docs('/use-cases/attachments'),
    summary: 'Blobs as objects, references in the snapshot.',
  },
  { title: 'Without a server', href: docs('/no-server'), summary: 'The CLI straight to Cloudflare R2, end to end.' },
  { title: 'Setting up a server', href: docs('/server'), summary: 'Routes, authorization, expiry, CORS, smoke test.' },
  { title: 'Testing', href: docs('/testing'), summary: 'A bucket in memory: no credentials, no network.' },
]
