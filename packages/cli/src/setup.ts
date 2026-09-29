import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import type { ConfigFile, ConfigValues, Env } from './config.js'
import type { Provider } from './init.js'
import type { Choice, Prompter } from './prompt.js'

/**
 * `machine` is `s3nd setup`: one file for this user, found from any directory,
 * holding its keys the way `~/.aws/credentials` does. `project` is `s3nd init`:
 * a file to commit next to the code, with the keys in a `.env` beside it.
 */
export type Target = 'machine' | 'project'

export interface Secret {
  field: 'accessKeyId' | 'secretAccessKey' | 'token'
  /** The variable it lives under in a project's `.env`. */
  name: string
  value: string
}

export interface Answers {
  provider: Provider
  /** Everything but the secrets. */
  values: ConfigValues
  secrets: Secret[]
  /** How credentials are found, in words, for the summary. */
  credentials: string
}

/** What a flag already answered: those questions are skipped. */
export interface Preset {
  provider?: Provider
  bucket?: string
  region?: string
  endpoint?: string
  remote?: string
}

export const PROVIDER_CHOICES: Choice<Provider>[] = [
  { value: 'aws', label: 'AWS S3' },
  { value: 'r2', label: 'Cloudflare R2', hint: 'no egress fees' },
  { value: 'scaleway', label: 'Scaleway' },
  { value: 'wasabi', label: 'Wasabi' },
  { value: 'minio', label: 'MinIO', hint: 'on this machine or self-hosted' },
  { value: 'other', label: 'Another S3-compatible service', hint: 'Backblaze B2, DigitalOcean Spaces, Hetzner…' },
  { value: 'remote', label: 'A s3nd server', hint: 'someone else runs it; you only need its URL' },
]

const KEY_NAMES: Record<Exclude<Provider, 'remote'>, [string, string]> = {
  aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  r2: ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
  scaleway: ['SCW_ACCESS_KEY', 'SCW_SECRET_KEY'],
  wasabi: ['WASABI_ACCESS_KEY', 'WASABI_SECRET_KEY'],
  minio: ['S3ND_ACCESS_KEY_ID', 'S3ND_SECRET_ACCESS_KEY'],
  other: ['S3ND_ACCESS_KEY_ID', 'S3ND_SECRET_ACCESS_KEY'],
}

const KEY_HINTS: Record<Exclude<Provider, 'remote' | 'aws'>, string> = {
  r2: 'R2 → Manage API tokens → Create API token, with Object Read & Write on this bucket.',
  scaleway: 'Console → IAM → API keys. The access key starts with SCW.',
  wasabi: 'Console → Access Keys → Create new access key.',
  minio: 'The root user and password work for a local MinIO; a dedicated user is better anywhere else.',
  other: 'The provider calls them an access key and a secret key, or a key ID and an application key.',
}

/**
 * The questions, one provider at a time. Nothing is written here: the answers
 * come back, and `render` turns them into a file for either target.
 */
export async function askSetup(
  prompter: Prompter,
  options: { env: Env; preset?: Preset; home?: string },
): Promise<Answers> {
  const { env, preset = {} } = options
  const home = options.home ?? homedir()

  const provider = preset.provider ?? (await prompter.choose('Where should transfers be stored?', PROVIDER_CHOICES))
  const common = { prefix: 'transfers', expiresIn: '24h' }

  if (provider === 'remote') {
    const remote =
      preset.remote ??
      (await prompter.text('URL of the transfer routes', {
        hint: 'Where the server mounted createTransferHandler(), e.g. https://drop.example.com/api/transfers',
        validate: urlProblem,
      }))
    const token = await prompter.secret('Token', { optional: true, hint: 'Leave it empty if the server takes none.' })

    return {
      provider,
      values: { remote },
      secrets: token ? [{ field: 'token', name: 'S3ND_TOKEN', value: token }] : [],
      credentials: 'none on this machine: the server holds them',
    }
  }

  const values: ConfigValues = {}

  switch (provider) {
    case 'aws':
      values.region =
        preset.region ??
        (await prompter.text('Region', {
          default: env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? 'eu-west-3',
          validate: (value) => (/^[a-z]{2}(-[a-z]+)+-\d$/.test(value) ? undefined : 'A region looks like eu-west-3.'),
        }))
      break

    case 'r2': {
      const account = preset.endpoint
        ? undefined
        : await prompter.text('Cloudflare account ID', {
            hint: 'Dashboard → R2 → Overview, "Account ID" in the side panel. The S3 API URL works too.',
            validate: (value) => (r2Account(value) ? undefined : 'That is 32 hexadecimal characters.'),
          })
      values.region = 'auto'
      values.endpoint = preset.endpoint ?? `https://${r2Account(account!)}.r2.cloudflarestorage.com`
      break
    }

    case 'scaleway': {
      const region =
        preset.region ??
        (await prompter.choose(
          'Region',
          [
            { value: 'fr-par', label: 'Paris', hint: 'fr-par' },
            { value: 'nl-ams', label: 'Amsterdam', hint: 'nl-ams' },
            { value: 'pl-waw', label: 'Warsaw', hint: 'pl-waw' },
          ],
          'fr-par',
        ))
      values.region = region
      values.endpoint = preset.endpoint ?? `https://s3.${region}.scw.cloud`
      break
    }

    case 'wasabi': {
      const region = preset.region ?? (await prompter.text('Region', { default: 'eu-central-1' }))
      values.region = region
      values.endpoint = preset.endpoint ?? `https://s3.${region}.wasabisys.com`
      break
    }

    case 'minio':
      values.endpoint =
        preset.endpoint ??
        (await prompter.text('MinIO URL', { default: 'http://localhost:9000', validate: urlProblem }))
      values.forcePathStyle = true
      break

    case 'other':
      values.endpoint =
        preset.endpoint ??
        (await prompter.text('S3 endpoint URL', {
          hint: 'The provider lists it as the S3 API or S3-compatible endpoint.',
          validate: urlProblem,
        }))
      values.region = preset.region ?? (await prompter.text('Region', { default: 'auto' }))
      if (await prompter.confirm('Does it need path-style URLs? (MinIO, Ceph and some self-hosted do)', false)) {
        values.forcePathStyle = true
      }
      break
  }

  values.bucket =
    preset.bucket ??
    (await prompter.text('Bucket name', {
      hint: 'An existing bucket. The check at the end tells you if it is not reachable.',
      validate: bucketProblem,
    }))

  Object.assign(values, common)

  const [idName, secretName] = KEY_NAMES[provider]

  if (provider === 'aws') {
    const found = awsCredentialsOnMachine(env, home)

    if (found && (await prompter.confirm(`Use the AWS credentials this machine already has (${found})?`, true))) {
      return { provider, values, secrets: [], credentials: `the AWS provider chain (${found})` }
    }
  }

  const hint = provider === 'aws' ? 'IAM → Users → Security credentials → Create access key.' : KEY_HINTS[provider]
  const minio = provider === 'minio' ? 'minioadmin' : undefined

  const accessKeyId = await prompter.text('Access key ID', { hint, default: minio })
  const secretAccessKey = await prompter.secret('Secret access key', { default: minio })

  return {
    provider,
    values,
    secrets: [
      { field: 'accessKeyId', name: idName, value: accessKeyId },
      { field: 'secretAccessKey', name: secretName, value: secretAccessKey },
    ],
    credentials: `key ${maskKey(accessKeyId)}`,
  }
}

export interface Rendered {
  config: ConfigFile
  /** Variables for the project's `.env`. Empty for the machine target, which keeps them in the file. */
  env: Record<string, string>
}

/**
 * The machine file holds its secrets directly — it is never committed, and it
 * is written readable by its owner only. A project file holds `${…}`
 * references, and the values go to the `.env` beside it.
 */
export function render(answers: Answers, target: Target): Rendered {
  // The bucket first: it is the line anyone opening the file is looking for.
  const { bucket, ...rest } = answers.values
  const config: ConfigFile = bucket ? { bucket, ...rest } : { ...rest }
  const env: Record<string, string> = {}

  const secret = (field: Secret['field']) => answers.secrets.find((entry) => entry.field === field)
  const value = (entry: Secret) => {
    if (target === 'machine') return entry.value

    env[entry.name] = entry.value
    return `\${${entry.name}}`
  }

  const accessKeyId = secret('accessKeyId')
  const secretAccessKey = secret('secretAccessKey')
  const token = secret('token')

  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId: value(accessKeyId), secretAccessKey: value(secretAccessKey) }
  }
  if (token) config.token = value(token)
  if (Object.keys(env).length > 0) config.envFile = '.env'

  return { config, env }
}

export interface Written {
  path: string
  /** The `.env` that received the secrets, for a project. */
  envPath?: string
  /** A project `.env` that git would pick up: no `.gitignore` beside it mentions it. */
  envUnignored?: boolean
}

export function writeSetup(path: string, rendered: Rendered, target: Target): Written {
  mkdirSync(dirname(path), { recursive: true, ...(target === 'machine' ? { mode: 0o700 } : {}) })

  const secrets = target === 'machine' && (rendered.config.credentials || rendered.config.token)
  writeFileSync(path, `${JSON.stringify(rendered.config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  // `mode` only applies to a file being created; one being replaced keeps its own.
  if (secrets) chmodSync(path, 0o600)

  if (Object.keys(rendered.env).length === 0) return { path }

  const envPath = join(dirname(path), '.env')
  writeFileSync(envPath, mergeEnv(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '', rendered.env), {
    encoding: 'utf8',
    mode: 0o600,
  })

  return { path, envPath, envUnignored: !ignoresEnv(dirname(path)) }
}

/** Replaces the variables already in the file, appends the rest, and leaves every other line alone. */
export function mergeEnv(existing: string, values: Record<string, string>): string {
  const pending = new Map(Object.entries(values))
  const lines = existing.length > 0 ? existing.replace(/\n$/, '').split('\n') : []

  const merged = lines.map((line) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)
    if (!match || !pending.has(match[1]!)) return line

    const value = pending.get(match[1]!)!
    pending.delete(match[1]!)
    return `${match[1]}=${quote(value)}`
  })

  for (const [name, value] of pending) merged.push(`${name}=${quote(value)}`)

  return `${merged.join('\n')}\n`
}

function quote(value: string): string {
  return /^[A-Za-z0-9_./:@+-]*$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`
}

function ignoresEnv(directory: string): boolean {
  const gitignore = join(directory, '.gitignore')
  if (!existsSync(gitignore)) return false

  return readFileSync(gitignore, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => ['.env', '.env*', '/.env', '*.env', '.env.*'].includes(line))
}

/** Where the default AWS chain would find credentials, if it would. */
export function awsCredentialsOnMachine(env: Env, home: string): string | undefined {
  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)
    return `$AWS_ACCESS_KEY_ID, key ${maskKey(env.AWS_ACCESS_KEY_ID)}`
  if (env.AWS_PROFILE) return `profile "${env.AWS_PROFILE}"`
  if (existsSync(join(home, '.aws', 'credentials'))) return '~/.aws/credentials'
  if (existsSync(join(home, '.aws', 'config'))) return '~/.aws/config'

  return undefined
}

/** The account ID, from the ID itself or from the S3 API URL the dashboard shows beside it. */
export function r2Account(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase()
  const fromUrl = /^(?:https?:\/\/)?([a-f0-9]{32})\.r2\.cloudflarestorage\.com/.exec(trimmed)
  if (fromUrl) return fromUrl[1]

  return /^[a-f0-9]{32}$/.test(trimmed) ? trimmed : undefined
}

export function bucketProblem(name: string): string | undefined {
  if (name.length < 3 || name.length > 63) return 'A bucket name is 3 to 63 characters long.'
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) {
    return 'Lowercase letters, digits, dots and hyphens only, starting and ending with a letter or digit.'
  }

  return undefined
}

export function urlProblem(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Only http:// and https:// URLs.'
  } catch {
    return 'That is not a URL. It starts with https://'
  }
}

export function maskKey(accessKeyId: string): string {
  return `…${accessKeyId.slice(-4)}`
}
