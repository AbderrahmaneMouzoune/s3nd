#!/usr/bin/env node
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve as resolvePath } from 'node:path'
import { parseArgs } from 'node:util'

import { createBucket, createTransferHandler, isS3ndError, type Bucket } from '@s3nd/core'
import { createTransferClient, isTransferError, type TransferClient } from '@s3nd/protocol'

import { didYouMean, findProjectConfig, machineConfigPath, resolveConfiguration, type Configuration } from './config.js'
import { runChecks, type Check } from './doctor.js'
import { CliError, isCliError } from './errors.js'
import { createStyle, formatBytes, formatDuration, tildify, type Style } from './format.js'
import { assertProvider, PROVIDERS, writeStarter, type Provider } from './init.js'
import { Cancelled, createPrompter } from './prompt.js'
import { askSetup, PROVIDER_CHOICES, render, writeSetup, type Target } from './setup.js'

declare const __VERSION__: string

/** Any absolute URL works: in local mode nothing is ever put on a socket. */
const LOCAL_BASE_URL = 'http://s3nd.local/api/transfers'

const USAGE = `s3nd — move a file between machines with a code, through your own bucket

Usage
  s3nd <command> [options]
  s3nd help <command>    What one command takes

Get started
  setup                Guided setup for this machine: storage, bucket, keys, then a live check
  init                 The same, for a project: ./s3nd.config.json to commit, keys in .env

Move files
  put <file>           Store a file and print the code to carry. "-" reads stdin
  get <code>           Fetch what a code points at
  rm <code>            Burn a code

Check
  doctor               Check this setup can actually store transfers
  config               Print the resolved configuration, and where each value came from

Options
  -c, --config <path>    Configuration file (default: the nearest s3nd.config.json, then ~/.config/s3nd/config.json)
  -p, --profile <name>   Profile to use inside that file
      --env-file <path>  Read KEY=value pairs from this file first
      --bucket <name>    Bucket name
      --prefix <prefix>  Key prefix inside the bucket
      --region <name>    Region
      --endpoint <url>   S3-compatible endpoint: R2, MinIO, Scaleway, Wasabi…
      --expires-in <d>   Transfer lifetime: 3600, 30m, 24h, 7d, or never
      --remote <url>     Talk to a s3nd server instead of S3 directly
      --token <token>    Bearer token sent with --remote
      --name <filename>  Filename to store the transfer under
  -o, --output <path>    Where get writes. "-" is stdout
      --json             Machine-readable output
  -y, --yes              Never ask: take flags and defaults, fail on what is missing
  -h, --help             This text
  -v, --version          Version

Configuration
  A flag beats an environment variable, which beats the configuration file:
  s3nd.config.json, .s3ndrc.json or .s3ndrc, looked for from here upwards, then
  ~/.config/s3nd/config.json. \`s3nd config\` prints what won.

  S3ND_BUCKET, S3ND_REGION, S3ND_ENDPOINT, S3ND_PREFIX, S3ND_PUBLIC_URL,
  S3ND_EXPIRES_IN, S3ND_REMOTE, S3ND_TOKEN, S3ND_CONFIG, S3ND_PROFILE,
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION

Examples
  s3nd setup
  s3nd put ./report.pdf
  s3nd get K7QP2M4X -o ./report.pdf
  tar cz ./project | s3nd put - --name project.tar.gz
  s3nd --remote https://drop.example.com/api/transfers put ./report.pdf
`

const SETUP_FLAGS = `Answers can be given as flags, and those questions are skipped:
  --provider <${PROVIDERS.join('|')}>
  --bucket <name>   --region <name>   --endpoint <url>   --remote <url>

  -c, --config <path>  Write here instead
      --force          Replace an existing file without asking
  -y, --yes            Ask nothing: write a starter from the flags (for scripts and CI)`

const COMMAND_HELP: Record<Command, string> = {
  setup: `s3nd setup — set s3nd up for this machine

Asks where transfers are stored, the bucket and the keys, writes
~/.config/s3nd/config.json (readable by you only), then checks it live.
Every directory on this machine uses it, unless a project has its own file.

${SETUP_FLAGS}`,
  init: `s3nd init — set s3nd up for the project in this directory

The same questions as setup. Writes ./s3nd.config.json, which is meant to be
committed, and puts the keys in ./.env beside it, which is not.

${SETUP_FLAGS}`,
  put: `s3nd put <file> — store a file and print the code to carry

The code goes to stdout and everything else to stderr: CODE=$(s3nd put ./f).
"-" reads stdin: tar cz ./project | s3nd put - --name project.tar.gz

  --name <filename>   Filename to store it under
  --expires-in <d>    How long the code works: 30m, 24h, 7d, or never
  --json              The whole transfer, as JSON`,
  get: `s3nd get <code> — fetch what a code points at

Writes the file under its stored name in this directory. Codes ignore case
and dashes: k7qp-2m4x is K7QP2M4X.

  -o, --output <path>   Write here instead. "-" is stdout
  --json                The transfer, as JSON, after writing it`,
  rm: `s3nd rm <code> — burn a code

The transfer is deleted; the code stops working everywhere.`,
  doctor: `s3nd doctor — check this setup can actually store transfers

Writes, reads and deletes a probe object, and checks a lifecycle rule
cleans up expired transfers. Exits non-zero when a check fails.

  --json   The checks, as JSON`,
  config: `s3nd config — print the resolved configuration

Every value, and where it came from: a flag, a variable, which file.

  --json   The same, as JSON, with secrets masked`,
}

const options = {
  config: { type: 'string', short: 'c' },
  profile: { type: 'string', short: 'p' },
  'env-file': { type: 'string' },
  bucket: { type: 'string' },
  prefix: { type: 'string' },
  region: { type: 'string' },
  endpoint: { type: 'string' },
  'expires-in': { type: 'string' },
  remote: { type: 'string' },
  token: { type: 'string' },
  name: { type: 'string' },
  output: { type: 'string', short: 'o' },
  provider: { type: 'string' },
  force: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  yes: { type: 'boolean', short: 'y', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  version: { type: 'boolean', short: 'v', default: false },
} as const

type Flags = {
  config?: string
  profile?: string
  'env-file'?: string
  bucket?: string
  prefix?: string
  region?: string
  endpoint?: string
  'expires-in'?: string
  remote?: string
  token?: string
  name?: string
  output?: string
  provider?: string
  force: boolean
  json: boolean
  yes: boolean
  help: boolean
  version: boolean
}

const COMMANDS = ['setup', 'init', 'put', 'get', 'rm', 'doctor', 'config'] as const

type Command = (typeof COMMANDS)[number]

const styleOut = createStyle(process.stdout, process.env)
const styleErr = createStyle(process.stderr, process.env)

// `s3nd config | head` closes the pipe as soon as it has enough. That is the
// reader's business, not an error, and certainly not a stack trace.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0)

    throw error
  })
}

function out(line: string): void {
  process.stdout.write(`${line}\n`)
}

function note(line: string): void {
  process.stderr.write(`${line}\n`)
}

function emit(json: boolean, payload: unknown, human: () => void): void {
  if (json) out(JSON.stringify(payload, null, 2))
  else human()
}

function configure(flags: Flags): Configuration {
  return resolveConfiguration(flags, { cwd: process.cwd(), env: process.env })
}

/**
 * Questions only when someone can answer them: a terminal on both ends, and
 * nobody having asked for silence. CI sets \`CI\`, and a pipe is not a person.
 */
function interactive(flags: Flags): boolean {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY) && !flags.yes && !flags.json && !process.env.CI
}

function isConfigured(configuration: Configuration): boolean {
  return Boolean(configuration.settings.bucket || configuration.settings.remote)
}

/** The one error worth spelling out: without a bucket, nothing else can run. */
function noBucket(configuration: Configuration): CliError {
  const message = configuration.file
    ? `${tildify(configuration.file.path)} names no bucket and no server.`
    : 's3nd is not set up yet: no bucket and no server configured.'

  return new CliError(
    message,
    [
      '  s3nd setup                   guided, for this machine — then it works from any directory',
      '  s3nd init                    guided, for this project, in ./s3nd.config.json',
      '  s3nd --bucket <name> …       for this one command',
      '  export S3ND_BUCKET=<name>    for this shell',
    ].join('\n'),
  )
}

/**
 * Run before any command that needs storage. Unconfigured, at a terminal, the
 * answer to "no bucket" is to offer to fix it on the spot, then carry on with
 * what was asked — not to print instructions and quit.
 */
async function ensureConfigured(
  flags: Flags,
  /** A command runs right after: put, get, rm. Doctor has nothing left to do once setup has checked. */
  thenRun: boolean,
): Promise<{ configuration: Configuration; ranSetup: boolean }> {
  const configuration = configure(flags)
  if (isConfigured(configuration)) return { configuration, ranSetup: false }

  // A file that exists but says nothing useful is someone's to edit, not ours to replace unasked.
  if (!interactive(flags) || configuration.file) throw noBucket(configuration)

  note(styleErr.yellow('s3nd is not set up on this machine yet.'))

  const prompter = createPrompter({ input: process.stdin, output: process.stderr, style: styleErr })
  let proceed: boolean
  try {
    proceed = await prompter.confirm('Set it up now? It takes a minute', true)
  } finally {
    prompter.close()
  }

  if (!proceed) throw noBucket(configuration)

  note('')
  await commandSetup(flags, 'machine', thenRun)
  note('')

  if (!thenRun) return { configuration: configure(flags), ranSetup: true }

  // Checks that failed at the end of setup would only fail again, less clearly, in the command.
  if (process.exitCode === 1) throw new CliError('Stopped before running it: the setup is not working yet.')

  return { configuration: configure(flags), ranSetup: true }
}

function bucketFor(configuration: Configuration): Bucket {
  const { settings } = configuration

  if (!settings.bucket) throw noBucket(configuration)

  return createBucket({
    bucket: settings.bucket,
    region: settings.region,
    endpoint: settings.endpoint,
    forcePathStyle: settings.forcePathStyle,
    prefix: settings.prefix,
    publicUrl: settings.publicUrl,
    credentials: settings.credentials,
  })
}

/**
 * The CLI has exactly one implementation of every command: the protocol client.
 * `--remote` puts it on the network; without it, the same client is wired
 * straight into the handler in this process. The two modes cannot drift apart,
 * because there is only one of them.
 */
function buildClient(configuration: Configuration): TransferClient {
  const { settings } = configuration

  if (settings.remote) {
    return createTransferClient({
      baseUrl: settings.remote,
      headers: settings.token ? { authorization: `Bearer ${settings.token}` } : undefined,
    })
  }

  const handler = createTransferHandler({
    bucket: bucketFor(configuration),
    expiresIn: settings.expiresIn,
  })

  return createTransferClient({
    baseUrl: LOCAL_BASE_URL,
    fetch: (input, init) => handler(new Request(input as string, init as RequestInit)),
  })
}

async function readSource(flags: Flags, file: string): Promise<{ bytes: Uint8Array; filename: string }> {
  if (file === '-') {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer)

    const bytes = Buffer.concat(chunks)

    if (bytes.byteLength === 0) {
      throw new CliError(
        'Nothing arrived on stdin.',
        'Pipe something in: `tar cz ./project | s3nd put - --name project.tar.gz`.',
      )
    }

    return { bytes, filename: flags.name ?? 'stdin' }
  }

  const path = resolvePath(file)

  try {
    return { bytes: await readFile(path), filename: flags.name ?? basename(path) }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CliError(`No such file: ${file}`, 'Pass "-" to read the transfer from stdin instead.')
    }

    throw error
  }
}

async function commandPut(client: TransferClient, flags: Flags, file: string): Promise<void> {
  const { bytes, filename } = await readSource(flags, file)
  const created = await client.createFile({ body: bytes, filename })

  emit(flags.json, created, () => {
    const parts = [filename, formatBytes(created.size ?? bytes.byteLength)]

    if (created.expiresAt) {
      const seconds = Math.round((new Date(created.expiresAt).getTime() - Date.now()) / 1000)
      parts.push(`expires in ${formatDuration(Math.max(seconds, 1))}`)
    } else {
      parts.push('no expiry')
    }

    note(styleErr.dim(parts.join(' · ')))
    out(styleOut.bold(created.code))

    // Only for a human at a terminal: in a pipeline this is noise, and the
    // code on stdout is the whole point.
    if (process.stderr.isTTY) note(styleErr.dim(`On the other machine: s3nd get ${created.code}`))
  })
}

async function commandGet(client: TransferClient, flags: Flags, code: string): Promise<void> {
  const metadata = await client.read(code)
  if (!metadata) throw unknownCode(code)

  if (metadata.kind === 'snapshot') {
    const json = JSON.stringify(metadata.data, null, 2)

    if (flags.output && flags.output !== '-') {
      const destination = resolvePath(flags.output)
      await writeFile(destination, json)

      emit(flags.json, { ...metadata, writtenTo: destination }, () => note(styleErr.dim(`Wrote ${destination}`)))
      return
    }

    out(json)
    return
  }

  const bytes = await client.readBytes(code)
  if (!bytes) throw unknownCode(code)

  if (flags.output === '-') {
    process.stdout.write(bytes)
    return
  }

  const destination = resolvePath(flags.output ?? flags.name ?? metadata.filename ?? code)
  await writeFile(destination, bytes)

  emit(flags.json, { ...metadata, writtenTo: destination }, () =>
    note(styleErr.dim(`Wrote ${tildify(destination)} · ${formatBytes(bytes.byteLength)}`)),
  )
}

function unknownCode(code: string): CliError {
  return new CliError(
    `No transfer behind "${code}" — unknown, or expired.`,
    'Codes are case-insensitive and ignore dashes, so a typo is the likelier half of that.',
  )
}

async function commandRm(client: TransferClient, flags: Flags, code: string): Promise<void> {
  await client.remove(code)

  emit(flags.json, { code, removed: true }, () => note(styleErr.dim(`Burned ${code}`)))
}

const SYMBOL: Record<Check['status'], (style: Style) => string> = {
  ok: (style) => style.green('✓'),
  warn: (style) => style.yellow('!'),
  fail: (style) => style.red('✗'),
}

async function checksFor(configuration: Configuration): Promise<Check[]> {
  return configuration.settings.remote
    ? remoteChecks(configuration)
    : runChecks(bucketFor(configuration), configuration.settings.prefix)
}

function printChecks(checks: Check[], write: (line: string) => void, style: Style): void {
  for (const check of checks) {
    write(`${SYMBOL[check.status](style)} ${check.name}: ${check.detail}`)
    if (check.fix) write(style.dim(`  → ${check.fix}`))
  }
}

async function commandDoctor(flags: Flags): Promise<void> {
  const { configuration, ranSetup } = await ensureConfigured(flags, false)
  // Setup ends by running these very checks; twice in a row is noise.
  if (ranSetup) return

  const checks = await checksFor(configuration)
  const failed = checks.filter((check) => check.status === 'fail')

  emit(flags.json, { config: configuration.file ?? null, checks, ok: failed.length === 0 }, () => {
    if (configuration.file) note(styleErr.dim(`Using ${describeFile(configuration)}`))

    printChecks(checks, out, styleOut)

    out('')
    out(
      failed.length === 0
        ? styleOut.green('Ready to store transfers.')
        : styleOut.red(`${failed.length} check(s) failed.`),
    )
  })

  if (failed.length > 0) process.exitCode = 1
}

/** Against a server, the only meaningful check is a real round trip. */
async function remoteChecks(configuration: Configuration): Promise<Check[]> {
  const client = buildClient(configuration)
  const probe = { s3nd: 'doctor', at: new Date().toISOString() }

  try {
    const created = await client.createSnapshot({ data: probe, device: 's3nd doctor' })
    const readBack = await client.read(created.code)
    await client.remove(created.code)

    const intact = JSON.stringify(readBack?.data) === JSON.stringify(probe)

    return [
      { name: 'Server', status: 'ok', detail: `${configuration.settings.remote} answered` },
      {
        name: 'Create, read, delete',
        status: intact ? 'ok' : 'fail',
        detail: intact ? `round-tripped code ${created.code}` : 'the probe did not read back intact',
      },
    ]
  } catch (error) {
    return [
      {
        name: 'Server',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
        fix: 'Check --remote points at the transfer routes, and --token if the server requires one.',
      },
    ]
  }
}

function describeFile(configuration: Configuration): string {
  const { file } = configuration
  if (!file) return 'no configuration file'

  return `${tildify(file.path)}${file.profile ? ` (profile "${file.profile}")` : ''}`
}

function setupPath(flags: Flags, target: Target): string {
  if (flags.config) return resolvePath(flags.config)

  return target === 'machine' ? machineConfigPath(process.env) : resolvePath('s3nd.config.json')
}

/** `setup` and `init`: the same questions, written for this machine or for this project. */
async function commandSetup(
  flags: Flags,
  target: Target,
  /** Set when a command is waiting on this setup and will run the moment it is done. */
  continuing = false,
): Promise<void> {
  const path = setupPath(flags, target)
  const provider = flags.provider ? assertProvider(flags.provider) : undefined

  if (!interactive(flags)) return writeFromFlags(flags, target, path, provider)

  const prompter = createPrompter({ input: process.stdin, output: process.stderr, style: styleErr })

  let answers
  try {
    note(styleErr.bold(target === 'machine' ? 'Set up s3nd on this machine' : 'Set up s3nd for this project'))
    note(
      styleErr.dim(
        target === 'machine'
          ? `Saved to ${tildify(path)}, used from any directory. Ctrl+C leaves without writing.`
          : `Saved to ${tildify(path)} to commit, keys to .env beside it. Ctrl+C leaves without writing.`,
      ),
    )
    note('')

    if (existsSync(path) && !flags.force) {
      const replace = await prompter.confirm(`${tildify(path)} already exists${summarize(path)}. Replace it?`, false)
      if (!replace) {
        note(styleErr.dim('Kept it. `s3nd config` shows what it resolves to.'))
        return
      }
    }

    answers = await askSetup(prompter, {
      env: process.env,
      preset: {
        provider,
        bucket: flags.bucket,
        region: flags.region,
        endpoint: flags.endpoint,
        remote: flags.remote,
      },
    })
  } finally {
    prompter.close()
  }

  const written = writeSetup(path, render(answers, target), target)

  note('')
  note(
    `${styleErr.green('✓')} Saved ${tildify(written.path)}` +
      (target === 'machine' && answers.secrets.length > 0 ? styleErr.dim(' (readable by you only)') : '') +
      (written.envPath ? `, keys in ${tildify(written.envPath)}` : ''),
  )
  note(styleErr.dim(`  ${label(answers.provider)} · ${where(answers)} · credentials: ${answers.credentials}`))

  if (written.envUnignored) {
    note(`${styleErr.yellow('!')} No .gitignore here lists .env. Add it before your next commit: the keys are in it.`)
  }

  // The file just written only counts if discovery finds it. From inside a
  // project with its own file, that one wins, and a check against the new
  // file would pass while every real command used the other.
  const shadow = target === 'machine' && !flags.config ? findProjectConfig(process.cwd()) : undefined
  let shadowed = Boolean(shadow)

  if (shadow) {
    note(`${styleErr.yellow('!')} In this directory ${tildify(shadow)} still wins over it.`)

    // "my-bucket" is what \`s3nd init\` used to write when it was given nothing:
    // a leftover, never a setup anyone meant to keep.
    if (summarize(shadow) === ' (bucket "my-bucket")') {
      const again = createPrompter({ input: process.stdin, output: process.stderr, style: styleErr })
      try {
        if (await again.confirm('It only holds the placeholder "my-bucket". Delete it?', true)) {
          unlinkSync(shadow)
          shadowed = false
          note(styleErr.dim(`  Deleted ${tildify(shadow)}.`))
        }
      } finally {
        again.close()
      }
    } else {
      note(styleErr.dim('  Delete it if it was not meant to be there; `s3nd config` shows which file is used.'))
    }
  }

  note('')
  note(styleErr.dim('Checking it works…'))

  const checks = await checksFor(resolveConfiguration({ config: path }, { cwd: process.cwd(), env: process.env }))
  printChecks(checks, note, styleErr)
  note('')

  if (checks.some((check) => check.status === 'fail')) {
    note(
      styleErr.red('Not ready yet.') +
        ' Fix what is marked ✗, then `s3nd doctor`. `s3nd setup` again changes an answer.',
    )
    process.exitCode = 1
    return
  }

  if (continuing) {
    note(styleErr.green('Ready.') + styleErr.dim(' Now what you asked for:'))
    return
  }

  if (shadowed) {
    note(styleErr.green('Ready') + ' everywhere but under ' + tildify(dirname(shadow!)) + ', which keeps its own file.')
    return
  }

  note(styleErr.green('Ready.') + ' Send something:')
  note(`  ${styleErr.bold('s3nd put ./a-file')}`)
  note(styleErr.dim('The other machine needs the same setup, then `s3nd get <code>`.'))
}

/** No one to ask: the starter for a provider, from flags alone, and a clear error for what is missing. */
function writeFromFlags(flags: Flags, target: Target, path: string, provider: Provider = 'aws'): void {
  const command = target === 'machine' ? 'setup' : 'init'

  if (provider === 'remote' ? !flags.remote : !flags.bucket) {
    const missing = provider === 'remote' ? '--remote <url>' : '--bucket <name>'

    throw new CliError(
      `${command} needs ${missing} when it cannot ask.`,
      `For example: s3nd ${command} --provider r2 --bucket transfers. In a terminal, without --yes, it asks instead.`,
    )
  }

  const { next } = writeStarter({
    cwd: process.cwd(),
    provider,
    bucket: flags.bucket ?? '',
    overrides: { region: flags.region, endpoint: flags.endpoint, remote: flags.remote },
    path,
    force: flags.force,
  })

  if (flags.json) return out(JSON.stringify({ path, provider, next }, null, 2))

  note(styleErr.dim(`Wrote ${tildify(path)}`))
  note('')
  for (const line of next) note(line)

  // The path on stdout, the prose on stderr: `cat $(s3nd init --yes …)` works.
  // At a terminal both land on the screen, and once is enough.
  if (!process.stdout.isTTY) out(path)
}

function label(provider: string): string {
  return PROVIDER_CHOICES.find((choice) => choice.value === provider)?.label ?? provider
}

function where(answers: { values: { bucket?: string; remote?: string; endpoint?: string } }): string {
  const { bucket, remote } = answers.values
  return remote ? remote : `bucket "${bucket}"`
}

/** One line on what an existing file points at, so replacing it is an informed yes. */
function summarize(path: string): string {
  try {
    const file = JSON.parse(readFileSync(path, 'utf8')) as { bucket?: string; remote?: string }
    if (file.remote) return ` (server ${file.remote})`
    if (file.bucket) return ` (bucket "${file.bucket}")`
  } catch {
    // A broken file is exactly the one somebody wants replaced.
  }

  return ''
}

/**
 * Where every value came from, which is the question that makes a
 * misconfiguration obvious: not "what is the bucket" but "why is it that one".
 */
function commandConfig(flags: Flags): void {
  const configuration = configure(flags)
  const { settings, origins } = configuration

  if (flags.json) {
    out(
      JSON.stringify(
        {
          file: configuration.file ?? null,
          settings: {
            ...settings,
            // A configuration dump lands in issues and in CI logs.
            credentials: settings.credentials ? { accessKeyId: mask(settings.credentials.accessKeyId) } : null,
            token: settings.token ? 'set' : null,
          },
          origins,
        },
        null,
        2,
      ),
    )

    return
  }

  const rows: [string, string, string][] = []
  const add = (label: string, value: string | undefined, origin?: string) => {
    if (value == null) return
    rows.push([label, value, origin ?? ''])
  }

  add('file', describeFile(configuration))
  if (configuration.file && configuration.file.profiles.length > 0) {
    add('profiles', configuration.file.profiles.join(', '))
  }
  add('mode', settings.remote ? `${settings.remote} (over HTTP)` : 'straight to S3')

  rows.push(['', '', ''])

  add('bucket', settings.bucket ?? '— not set —', origins.bucket)
  add('region', settings.region, origins.region)
  add('endpoint', settings.endpoint, origins.endpoint)
  add(
    'path style',
    settings.forcePathStyle == null ? undefined : String(settings.forcePathStyle),
    origins.forcePathStyle,
  )
  add('prefix', settings.prefix, origins.prefix)
  add('public URL', settings.publicUrl, origins.publicUrl)
  add(
    'credentials',
    settings.credentials ? mask(settings.credentials.accessKeyId) : 'resolved at call time',
    origins.credentials,
  )
  add('expires in', settings.expiresIn == null ? 'never' : formatDuration(settings.expiresIn), origins.expiresIn)
  add('token', settings.token ? 'set' : undefined, origins.token)

  const width = Math.max(...rows.map(([label]) => label.length))
  // Only the rows that carry an origin share a column, so a long path in the
  // header does not push every origin off the right of the terminal.
  const valueWidth = Math.max(...rows.filter(([, , origin]) => origin).map(([, value]) => value.length))

  for (const [label, value, origin] of rows) {
    if (label === '') {
      out('')
      continue
    }

    const line = `${label.padEnd(width)}  ${origin ? value.padEnd(valueWidth) : value}`
    out(origin ? `${line}  ${styleOut.dim(origin)}` : line)
  }

  if (!settings.bucket && !settings.remote) {
    note('')
    note(styleErr.dim('Not set up yet: `s3nd setup` asks a few questions and writes the file for this machine.'))
  }
}

function mask(accessKeyId: string): string {
  return `…${accessKeyId.slice(-4)}`
}

function parse(argv: string[]): { values: Flags; positionals: string[] } {
  try {
    const { values, positionals } = parseArgs({ args: argv, options, allowPositionals: true })

    return { values: values as Flags, positionals }
  } catch (error) {
    // Node's message names the offending option, which is the useful half; the
    // sentence it appends about `--option=value` is not.
    const message = error instanceof Error ? error.message : String(error)

    throw new CliError(message.split('. ')[0]!.trim() + '.', 'Run `s3nd --help` to see what this takes.')
  }
}

/** Bare \`s3nd\`: what it does, whether it is ready, and the one next step. */
function commandWelcome(flags: Flags): void {
  let status: string

  try {
    const configuration = configure(flags)
    const { settings, origins } = configuration
    const source = configuration.file ? describeFile(configuration) : (origins.bucket ?? origins.remote)

    status = settings.remote
      ? styleOut.dim(`Ready · server ${settings.remote} · from ${source}`)
      : settings.bucket
        ? styleOut.dim(`Ready · bucket "${settings.bucket}" · from ${source}`)
        : `${styleOut.yellow('Not set up on this machine yet.')} Start with: ${styleOut.bold('s3nd setup')}`
  } catch (error) {
    status = styleOut.red(`The configuration does not load: ${error instanceof Error ? error.message : String(error)}`)
  }

  out(`s3nd — move a file between machines with a code

  s3nd put ./report.pdf     prints a code, like K7QP2M4X
  s3nd get K7QP2M4X         on the other machine

${status}

${styleOut.dim('s3nd --help lists every command and option.')}`)
}

async function main(argv: string[]): Promise<void> {
  const { values: flags, positionals } = parse(argv)

  if (flags.version) return out(__VERSION__)

  let [command, argument] = positionals

  if (command === 'help') {
    if (!argument) return out(USAGE)
    ;[command, argument] = [argument, undefined]
    flags.help = true
  }

  if (command === undefined) return flags.help ? out(USAGE) : commandWelcome(flags)

  // Everything the caller got wrong is reported before any bucket is resolved:
  // a typo should not come back as "no bucket configured".
  if (!(COMMANDS as readonly string[]).includes(command)) {
    throw new CliError(
      `Unknown command "${command}".${didYouMean(command, [...COMMANDS])}`,
      `Commands: ${COMMANDS.join(', ')}. Run \`s3nd --help\`.`,
    )
  }

  if (flags.help) return out(COMMAND_HELP[command as Command])

  if (command === 'setup') return commandSetup(flags, 'machine')
  if (command === 'init') return commandSetup(flags, 'project')
  if (command === 'config') return commandConfig(flags)
  if (command === 'doctor') return commandDoctor(flags)

  if (!argument) {
    throw new CliError(
      command === 'put' ? 'put needs a file.' : `${command} needs a code.`,
      command === 'put' ? 'For example: s3nd put ./report.pdf' : `For example: s3nd ${command} K7QP2M4X`,
    )
  }

  const { configuration } = await ensureConfigured(flags, true)
  const client = buildClient(configuration)

  switch (command) {
    case 'put':
      return commandPut(client, flags, argument)
    case 'get':
      return commandGet(client, flags, argument)
    case 'rm':
      return commandRm(client, flags, argument)
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  // Four kinds of failure, four different things the reader should do about
  // them — so they do not all print the same way.
  if (error instanceof Cancelled) {
    note(styleErr.dim(error.message))
    process.exitCode = 130
    return
  }

  if (isCliError(error)) {
    note(styleErr.red(error.message))
    if (error.hint) note(styleErr.dim(error.hint))
  } else if (isTransferError(error)) {
    note(`${styleErr.red(error.code)}: ${error.message}`)
  } else if (isS3ndError(error)) {
    note(`${styleErr.red(error.code)}: ${error.message}`)
    if (error.code === 'INVALID_CONFIG') note(styleErr.dim('`s3nd config` prints what this setup resolves to.'))
  } else {
    note(styleErr.red(error instanceof Error ? error.message : String(error)))
  }

  process.exitCode = 1
})
