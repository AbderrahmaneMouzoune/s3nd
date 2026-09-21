import { docs } from './site'

export interface UseCase {
  slug: string
  title: string
  /** One line, for cards. */
  summary: string
  /** Search intent this page answers. */
  keywords: string[]
  /** The situation, in a paragraph. */
  problem: string
  /** What s3nd does about it, in a paragraph. */
  approach: string
  /** A short, real snippet. */
  code: { lang: string; title?: string; source: string }
  /** The things that are easy to get wrong. */
  watch: { title: string; body: string }[]
  /** Which package does the work. */
  packages: ('s3nd' | '@s3nd/react' | '@s3nd/cli' | '@s3nd/protocol')[]
  /** The full guide. */
  guide: { label: string; href: string }
}

export const useCases: UseCase[] = [
  {
    slug: 'new-device',
    title: 'Move to a new device',
    summary: 'A code on the old phone, typed into the new one. The whole database follows.',
    keywords: ['indexeddb sync between devices', 'local-first app new device', 'transfer indexeddb to another browser'],
    problem:
      'The user has a new phone. The app on the old one holds everything, in IndexedDB, and there is no account to sign into because the app never needed one. IndexedDB does not leave the browser it was written in.',
    approach:
      'The old device dumps its object stores, posts them to your API, and gets an eight-character code back. The new device types the code, sees what it is about to restore, and replaces its empty database in one transaction. The snapshot expires within the hour and the code is burned on success.',
    code: {
      lang: 'ts',
      title: 'app/api/sync/route.ts',
      source: `import { store, SCHEMA_VERSION } from '@/lib/store'

export async function POST(request: Request) {
  const state = await request.json()
  const code = store.codes.create()

  await store.putSnapshot(code, state, {
    app: 'notes',
    version: SCHEMA_VERSION,
    device: request.headers.get('user-agent') ?? undefined,
    expiresIn: 60 * 60,
    ifAbsent: true,
  })

  return Response.json({ code })
}`,
    },
    watch: [
      {
        title: 'Confirm before replacing',
        body: 'Return createdAt and device from the lookup, and show them. The most common mistake is restoring onto the device that already had the data.',
      },
      {
        title: 'Version the snapshot',
        body: 'Pass maxVersion on read. A snapshot from a newer build of the app fails with a clear error instead of landing in a version that will misread it.',
      },
      {
        title: 'Burn the code',
        body: 'A DELETE after a successful import is the tidy path; the expiry is the backstop. Both are one line.',
      },
    ],
    packages: ['s3nd', '@s3nd/react'],
    guide: { label: 'Move to a new device, in full', href: docs('/use-cases/new-device') },
  },
  {
    slug: 'continuous-backup',
    title: 'Continuous backup',
    summary: 'One snapshot per account, rewritten as the local database changes.',
    keywords: ['indexeddb backup to s3', 'local-first backup', 'browser database backup'],
    problem:
      'Once the app has accounts, a transfer code is the wrong shape. There is a session, so the server already knows who is asking. What the user wants is for their data to survive losing the laptop, without doing anything.',
    approach:
      'Key the snapshot by user id instead of by a code, and rewrite it whenever the local database changes. Pass the ETag you last read as ifMatch: a second device that wrote in the meantime makes the write fail with PRECONDITION_FAILED instead of silently discarding its work, and your app reads again and merges.',
    code: {
      lang: 'ts',
      source: `const current = await store.getSnapshot(\`user-\${userId}\`)

try {
  await store.putSnapshot(\`user-\${userId}\`, merged, { ifMatch: current?.etag })
} catch (error) {
  if (isS3ndError(error) && error.code === 'PRECONDITION_FAILED') {
    // Another device won. Read again, merge again.
  }

  throw error
}`,
    },
    watch: [
      {
        title: 'A different lifecycle rule',
        body: 'Backups must not expire. Keep them under their own prefix so the rule that cleans up transfers cannot reach them.',
      },
      {
        title: 'Debounce the writes',
        body: 'A snapshot per keystroke is a bill. Write on a timer, on visibility change, and before unload.',
      },
      {
        title: 'Merging is yours',
        body: 's3nd tells you that you lost the race. Deciding what a merge means for your data is application code, which is why it is not hidden.',
      },
    ],
    packages: ['s3nd'],
    guide: { label: 'Continuous backup, in full', href: docs('/use-cases/continuous-backup') },
  },
  {
    slug: 'encrypted-sync',
    title: 'End-to-end encrypted sync',
    summary: 'Encrypt in the browser with a passphrase. Your server stores bytes it cannot read.',
    keywords: ['end-to-end encrypted sync', 'zero-knowledge backup s3', 'encrypted indexeddb transfer'],
    problem:
      'By default your server can read every snapshot it stores. For a journal, a password manager or health data, that is the wrong default, and a liability you may not want to hold.',
    approach:
      's3nd stores whatever you hand it. Derive a key from a passphrase with WebCrypto, encrypt the dump in the browser, and send the ciphertext. The bucket, your server and anyone who guesses the code see bytes they cannot use; the passphrase travels with the person, not over the wire.',
    code: {
      lang: 'ts',
      source: `const key = await deriveKey(passphrase, salt) // PBKDF2 or Argon2, in the browser
const iv = crypto.getRandomValues(new Uint8Array(12))
const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

// The snapshot holds the salt, the IV and the ciphertext. Nothing else.
await transfers.createSnapshot({
  data: { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(ciphertext) },
  version: 3,
})`,
    },
    watch: [
      {
        title: 'Compression happens after encryption',
        body: 'Ciphertext does not compress. Expect the stored size to match the raw size, and set maxSize accordingly.',
      },
      {
        title: 'Two secrets, two channels',
        body: 'The code goes over one channel and the passphrase over another, or in the person’s head. A code alone is now worth nothing to a guesser.',
      },
      {
        title: 'A lost passphrase is lost data',
        body: 'That is what end-to-end means. Say so in the interface before the user relies on it.',
      },
    ],
    packages: ['@s3nd/protocol', 's3nd'],
    guide: { label: 'End-to-end encrypted sync, in full', href: docs('/use-cases/encrypted-sync') },
  },
  {
    slug: 'attachments',
    title: 'Attachments beside the data',
    summary: 'The blobs an IndexedDB app holds, carried across with the records that point at them.',
    keywords: ['indexeddb blobs s3', 'local-first attachments sync', 'upload blob s3 nodejs'],
    problem:
      'IndexedDB stores Blobs natively, so local-first apps end up holding images, recordings and PDFs next to their records. Base64 inside a JSON snapshot inflates them by a third and defeats gzip: three ways to hit the size ceiling at once.',
    approach:
      'Use the file API underneath the snapshots. Upload each blob as an object, keep its key in the record, and let the snapshot carry references. The receiving device fetches what it needs, when it needs it, through a presigned URL if you prefer the bytes never transit your server.',
    code: {
      lang: 'ts',
      source: `// Each blob becomes an object; the record keeps the key.
const stored = await store.upload(blob, { filename: 'scan.pdf', prefix: \`attachments/\${code}\` })
record.attachmentKey = stored.key

// The snapshot carries the records, not the bytes.
await store.putSnapshot(code, { records }, { expiresIn: 3600 })

// On the other device, fetch on demand.
const url = await store.getUrl(record.attachmentKey, { expiresIn: 600 })`,
    },
    watch: [
      {
        title: 'Same prefix, same lifecycle',
        body: 'Put attachments under a prefix that shares the transfer’s expiry rule, or they outlive the snapshot they belonged to.',
      },
      {
        title: 'Streams need a length',
        body: 'A single PutObject cannot use chunked encoding. Pass contentLength for a stream; buffers and Blobs already know their size.',
      },
    ],
    packages: ['s3nd'],
    guide: { label: 'Attachments beside the data, in full', href: docs('/use-cases/attachments') },
  },
  {
    slug: 'file-between-machines',
    title: 'A file between two machines',
    summary: 'A laptop, a desktop, a code. No server, no account, through the bucket you already have.',
    keywords: ['send file between computers cli', 'transfer file with code terminal', 'cli file transfer s3 bucket'],
    problem:
      'You have a file here and need it there. Email chokes on it, a chat app recompresses it, a USB stick is in another room, and the hosted services want an account and keep a copy.',
    approach:
      'Both machines hold credentials for a bucket you own. s3nd put uploads the file and prints a code; s3nd get on the other side downloads it; s3nd rm burns it. The bytes go from one machine to the bucket and from the bucket to the other, and nothing streams through a service in between.',
    code: {
      lang: 'sh',
      source: `$ s3nd put ./contract.pdf
contract.pdf · 284 kB · expires in 1 day
K7QP2M4X

# on the other machine
$ s3nd get k7qp-2m4x
Wrote /home/you/contract.pdf · 284 kB

$ s3nd rm K7QP2M4X
Burned K7QP2M4X`,
    },
    watch: [
      {
        title: 'Run doctor first',
        body: 'It performs the operations s3nd needs and reports what happened, including whether a lifecycle rule will delete expired transfers, the thing nobody discovers until a bill arrives.',
      },
      {
        title: 'Every machine holds the keys',
        body: 'Fine for two or three machines you own. For a team, put a server in front and hand out tokens instead of S3 credentials.',
      },
      {
        title: 'Directories travel as archives',
        body: 'tar cz ./project | s3nd put - --name project.tar.gz. The code goes to stdout and everything else to stderr, so it composes.',
      },
    ],
    packages: ['@s3nd/cli'],
    guide: { label: 'Without a server, in full', href: docs('/no-server') },
  },
  {
    slug: 'ci-backups',
    title: 'Backups from CI',
    summary: 'A nightly archive to your bucket from a workflow, with secrets from the runner and no file to check in.',
    keywords: ['github actions backup to s3', 'ci upload to r2', 'nightly backup cli s3'],
    problem:
      'A workflow produces something worth keeping: a database dump, a build, a generated report. It needs to land in your bucket every night, without a config file in the repository and without a client library in the workflow.',
    approach:
      'npx @s3nd/cli put, with the bucket and credentials in environment variables from the runner’s secret store. Two flags turn a transfer into a backup: --expires-in never, and a prefix of its own so the lifecycle rule on transfers cannot reach it.',
    code: {
      lang: 'yaml',
      title: '.github/workflows/nightly.yml',
      source: `- run: tar cz ./data | npx @s3nd/cli put - --name backup.tar.gz --expires-in never
  env:
    S3ND_BUCKET: transfers
    S3ND_PREFIX: backups
    S3ND_ENDPOINT: https://\${{ secrets.R2_ACCOUNT_ID }}.r2.cloudflarestorage.com
    S3ND_REGION: auto
    AWS_ACCESS_KEY_ID: \${{ secrets.R2_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: \${{ secrets.R2_SECRET_ACCESS_KEY }}`,
    },
    watch: [
      {
        title: '--json for the logs',
        body: 'Machine-readable output, and s3nd doctor --json exits non-zero when a check fails, so it doubles as a deployment smoke test.',
      },
      {
        title: 'A prefix per policy',
        body: 'Transfers expire, backups do not. Keeping them under different prefixes is what lets one bucket hold both.',
      },
    ],
    packages: ['@s3nd/cli'],
    guide: { label: 'The CLI reference', href: docs('/cli') },
  },
]

export function findUseCase(slug: string): UseCase | undefined {
  return useCases.find((useCase) => useCase.slug === slug)
}
