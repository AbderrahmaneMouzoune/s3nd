import type { Locale } from './i18n/config'
import { providersFr } from './providers.fr'
import { docs } from './site'

export type ProviderSlug = 'cloudflare-r2' | 'aws-s3' | 'minio' | 'scaleway' | 'wasabi'

/** The part of a provider page that is the same in every language. */
interface ProviderBase {
  slug: ProviderSlug
  name: string
  /** Short name for chips and tables. */
  short: string
  /** `s3nd init --provider …` */
  initName: 'aws' | 'r2' | 'minio' | 'scaleway' | 'wasabi'
  /** `createBucket()` for this provider. */
  library: string
  /** The file `s3nd init` writes. */
  config: string
  docsHref: string
}

/** The words, per language. */
export interface ProviderCopy {
  tagline: string
  description: string
  /** What still has to happen before `s3nd doctor` passes. */
  next: string[]
  notes: { title: string; body: string }[]
  keywords: string[]
}

export type Provider = ProviderBase & ProviderCopy

const base: ProviderBase[] = [
  {
    slug: 'cloudflare-r2',
    name: 'Cloudflare R2',
    short: 'R2',
    initName: 'r2',
    library: `import { createBucket } from 's3nd'

const store = createBucket({
  bucket: 'transfers',
  endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  publicUrl: 'https://cdn.example.com', // optional: your R2 custom domain
})`,
    config: `{
  "bucket": "transfers",
  "region": "auto",
  "endpoint": "https://\${R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
  "prefix": "transfers",
  "expiresIn": "24h",
  "envFile": ".env",
  "credentials": {
    "accessKeyId": "\${R2_ACCESS_KEY_ID}",
    "secretAccessKey": "\${R2_SECRET_ACCESS_KEY}"
  }
}`,
    docsHref: docs('/no-server'),
  },
  {
    slug: 'aws-s3',
    name: 'AWS S3',
    short: 'S3',
    initName: 'aws',
    library: `import { createBucket } from 's3nd'

// Credentials from the AWS provider chain: env, shared config, or the role.
const store = createBucket({
  bucket: process.env.S3_BUCKET,
  region: 'eu-west-3',
  prefix: 'transfers',
  maxSize: 4 * 1024 * 1024,
})`,
    config: `{
  "bucket": "transfers",
  "region": "eu-west-3",
  "prefix": "transfers",
  "expiresIn": "24h"
}`,
    docsHref: docs('/providers'),
  },
  {
    slug: 'minio',
    name: 'MinIO',
    short: 'MinIO',
    initName: 'minio',
    library: `import { createBucket } from 's3nd'

const store = createBucket({
  bucket: 'transfers',
  endpoint: 'http://localhost:9000',
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
})`,
    config: `{
  "bucket": "transfers",
  "endpoint": "http://localhost:9000",
  "forcePathStyle": true,
  "prefix": "transfers",
  "expiresIn": "1h",
  "credentials": { "accessKeyId": "minioadmin", "secretAccessKey": "minioadmin" }
}`,
    docsHref: docs('/providers'),
  },
  {
    slug: 'scaleway',
    name: 'Scaleway Object Storage',
    short: 'Scaleway',
    initName: 'scaleway',
    library: `import { createBucket } from 's3nd'

const store = createBucket({
  bucket: 'transfers',
  region: 'fr-par',
  endpoint: 'https://s3.fr-par.scw.cloud',
  credentials: {
    accessKeyId: process.env.SCW_ACCESS_KEY!,
    secretAccessKey: process.env.SCW_SECRET_KEY!,
  },
})`,
    config: `{
  "bucket": "transfers",
  "region": "fr-par",
  "endpoint": "https://s3.fr-par.scw.cloud",
  "prefix": "transfers",
  "expiresIn": "24h",
  "envFile": ".env",
  "credentials": {
    "accessKeyId": "\${SCW_ACCESS_KEY}",
    "secretAccessKey": "\${SCW_SECRET_KEY}"
  }
}`,
    docsHref: docs('/providers'),
  },
  {
    slug: 'wasabi',
    name: 'Wasabi',
    short: 'Wasabi',
    initName: 'wasabi',
    library: `import { createBucket } from 's3nd'

const store = createBucket({
  bucket: 'transfers',
  region: 'eu-central-1',
  endpoint: 'https://s3.eu-central-1.wasabisys.com',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY!,
    secretAccessKey: process.env.WASABI_SECRET_KEY!,
  },
})`,
    config: `{
  "bucket": "transfers",
  "region": "eu-central-1",
  "endpoint": "https://s3.eu-central-1.wasabisys.com",
  "prefix": "transfers",
  "expiresIn": "24h",
  "envFile": ".env",
  "credentials": {
    "accessKeyId": "\${WASABI_ACCESS_KEY}",
    "secretAccessKey": "\${WASABI_SECRET_KEY}"
  }
}`,
    docsHref: docs('/providers'),
  },
]

const LIFECYCLE =
  'expiresIn stops a transfer being handed over; only a lifecycle rule deletes the object. Give the prefix a rule that expires objects after a day or two, and s3nd doctor turns green.'

export const providersEn: Record<ProviderSlug, ProviderCopy> = {
  'cloudflare-r2': {
    tagline: 'No egress fees, which is exactly what moving a 2 GB file between two laptops wants.',
    description:
      'R2 speaks the S3 API, ignores the region, and charges nothing for egress. That makes it the provider the "without a server" guide is written against: a bucket, a token scoped to it, one configuration file, and a code carried between two machines for a bill of nothing.',
    next: [
      'Put R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env, and keep it out of git.',
      'The API token needs Object Read & Write on this bucket, and nothing else.',
      'Add a lifecycle rule that deletes objects under transfers/ after a day or two.',
    ],
    notes: [
      {
        title: 'region: "auto"',
        body: 'R2 ignores the region and the SDK insists on one. Setting an endpoint makes s3nd default to "auto", so there is nothing to write.',
      },
      {
        title: 'Conditional writes work',
        body: 'R2 implements If-None-Match and If-Match on PutObject, which is what keeps two simultaneous transfers from overwriting each other.',
      },
      { title: 'Expiry cleanup', body: LIFECYCLE },
    ],
    keywords: ['cloudflare r2 file transfer', 'r2 cli', 'cloudflare r2 sync', 's3nd r2'],
  },
  'aws-s3': {
    tagline: 'The original. Credentials come from the provider chain, so a Lambda or an ECS task needs no keys at all.',
    description:
      'On AWS, s3nd is the AWS SDK v3 with the transfer semantics on top. Omit credentials and the default provider chain applies: environment variables, the shared config file, or the role attached to the instance, task or function. Nothing to store, nothing to rotate.',
    next: [
      'Give the machine credentials the usual way: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, a profile, or a role.',
      'Add a lifecycle rule on the transfers/ prefix that expires objects after a day or two.',
    ],
    notes: [
      {
        title: 'Virtual-hosted addressing',
        body: 'Without an endpoint, s3nd leaves path-style addressing off, which is what S3 proper expects. Set forcePathStyle yourself only if a gateway in front demands it.',
      },
      {
        title: 'ACLs are off by default',
        body: 'Buckets created after 2023 have "bucket owner enforced" on. Make objects public with a bucket policy or a CDN, and leave the acl option alone.',
      },
      { title: 'Expiry cleanup', body: LIFECYCLE },
    ],
    keywords: ['aws s3 file transfer code', 's3 transfer cli', 's3 sync code', 's3nd aws'],
  },
  minio: {
    tagline: 'One Docker command, and the real code path runs on your laptop and in CI.',
    description:
      'A local MinIO is the cheapest way to exercise s3nd for real: the same PutObject with the same conditional headers, no credentials to create and no network to wait on. The examples in the repository point at it by default.',
    next: [
      'docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin quay.io/minio/minio server /data --console-address ":9001"',
      'Create the transfers bucket from the console on http://localhost:9001.',
    ],
    notes: [
      {
        title: 'Path-style addressing',
        body: 'Self-hosted gateways require https://endpoint/bucket/key. Setting an endpoint turns it on; the starter configuration writes it explicitly so the intent is visible.',
      },
      {
        title: 'Self-hosted in production too',
        body: 'The same configuration, with real credentials and TLS, runs against a MinIO cluster or any Ceph, Garage or SeaweedFS gateway that implements conditional PutObject.',
      },
      { title: 'Expiry cleanup', body: LIFECYCLE },
    ],
    keywords: ['minio file transfer', 'minio sync code', 'self-hosted file transfer s3', 's3nd minio'],
  },
  scaleway: {
    tagline: 'European regions, S3-compatible, and the region actually means something.',
    description:
      'Scaleway\'s Object Storage is S3-compatible with one difference worth knowing: it uses the region. Pass fr-par, nl-ams or pl-waw explicitly rather than letting the endpoint default it to "auto".',
    next: ['Put SCW_ACCESS_KEY and SCW_SECRET_KEY in .env.', 'Add a lifecycle rule on the transfers/ prefix.'],
    notes: [
      {
        title: 'The region is real',
        body: 'The endpoint carries the region and the signature has to agree with it. Write both, in the same region.',
      },
      { title: 'Expiry cleanup', body: LIFECYCLE },
    ],
    keywords: ['scaleway object storage transfer', 'scaleway s3 cli', 's3nd scaleway'],
  },
  wasabi: {
    tagline: 'Flat-rate storage with no egress charge, on a regional endpoint.',
    description:
      'Wasabi is S3-compatible, priced per stored terabyte with no egress or request fees, and reached through a regional endpoint. It works with s3nd like any other endpoint-based provider: set the endpoint and the region, and hand it a key pair.',
    next: ['Put WASABI_ACCESS_KEY and WASABI_SECRET_KEY in .env.', 'Add a lifecycle rule on the transfers/ prefix.'],
    notes: [
      {
        title: 'Minimum storage duration',
        body: 'Wasabi bills deleted objects for a minimum retention period. Transfers are small, so it rarely matters, but it is the one line on the invoice that surprises people.',
      },
      { title: 'Expiry cleanup', body: LIFECYCLE },
    ],
    keywords: ['wasabi file transfer', 'wasabi s3 cli', 's3nd wasabi'],
  },
}

const copy: Record<Locale, Record<ProviderSlug, ProviderCopy>> = { en: providersEn, fr: providersFr }

/** The five provider pages, in one language. */
export function providers(locale: Locale): Provider[] {
  return base.map((entry) => ({ ...entry, ...copy[locale][entry.slug] }))
}

export function findProvider(locale: Locale, slug: string): Provider | undefined {
  return providers(locale).find((provider) => provider.slug === slug)
}

export const providerSlugs: ProviderSlug[] = base.map((entry) => entry.slug)
