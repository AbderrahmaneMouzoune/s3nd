import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveConfiguration, type Env } from '../src/config.js'
import { createStyle } from '../src/format.js'
import { createPrompter, type Prompter } from '../src/prompt.js'
import { askSetup, bucketProblem, mergeEnv, r2Account, render, writeSetup } from '../src/setup.js'

let root: string
let env: Env

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 's3nd-setup-'))
  env = { XDG_CONFIG_HOME: join(root, 'xdg') }
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/** A prompter fed with these answers, one per line, and the transcript it printed. */
function scripted(answers: string[]): { prompter: Prompter; transcript: () => string } {
  const input = new PassThrough()
  const output = new PassThrough()
  let printed = ''
  output.on('data', (chunk: Buffer) => (printed += chunk.toString()))

  const prompter = createPrompter({ input, output, style: createStyle({}, {}) })
  input.end(answers.map((answer) => `${answer}\n`).join(''))

  return { prompter, transcript: () => printed }
}

const R2_ACCOUNT = '0123456789abcdef0123456789abcdef'

describe('askSetup', () => {
  it('walks an R2 setup from the provider to the keys', async () => {
    const { prompter } = scripted(['2', R2_ACCOUNT, 'transfers', 'key-id-1234', 'secret'])

    const answers = await askSetup(prompter, { env, home: root })
    prompter.close()

    expect(answers.provider).toBe('r2')
    expect(answers.values).toMatchObject({
      bucket: 'transfers',
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
    })
    expect(answers.secrets.map((secret) => secret.name)).toEqual(['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'])
    expect(answers.credentials).toBe('key …1234')
  })

  it('asks again until an answer is valid, and says why', async () => {
    const { prompter, transcript } = scripted(['r2', 'nope', R2_ACCOUNT, 'My_Bucket', 'transfers', 'id', 'secret'])

    const answers = await askSetup(prompter, { env, home: root })
    prompter.close()

    expect(answers.values.bucket).toBe('transfers')
    expect(transcript()).toMatch(/32 hexadecimal characters/)
    expect(transcript()).toMatch(/Lowercase letters, digits/)
  })

  it('skips what the flags already answered', async () => {
    const { prompter } = scripted(['eu-central-1', 'id', 'secret'])

    const answers = await askSetup(prompter, {
      env,
      home: root,
      preset: { provider: 'wasabi', bucket: 'transfers' },
    })
    prompter.close()

    expect(answers.values).toMatchObject({ bucket: 'transfers', endpoint: 'https://s3.eu-central-1.wasabisys.com' })
  })

  it('offers the AWS credentials a machine already has, rather than asking for keys', async () => {
    mkdirSync(join(root, '.aws'))
    writeFileSync(join(root, '.aws', 'credentials'), '[default]\n')
    const { prompter, transcript } = scripted(['aws', '', 'transfers', ''])

    const answers = await askSetup(prompter, { env, home: root })
    prompter.close()

    expect(answers.values.region).toBe('eu-west-3')
    expect(answers.secrets).toEqual([])
    expect(transcript()).toMatch(/~\/\.aws\/credentials/)
  })

  it('takes a server URL and an optional token for remote', async () => {
    const { prompter } = scripted(['remote', 'https://drop.example.com/api/transfers', ''])

    const answers = await askSetup(prompter, { env, home: root })
    prompter.close()

    expect(answers.values).toEqual({ remote: 'https://drop.example.com/api/transfers' })
    expect(answers.secrets).toEqual([])
  })

  it('fails cleanly when the input runs out halfway', async () => {
    const { prompter } = scripted(['r2'])

    await expect(askSetup(prompter, { env, home: root })).rejects.toThrow(/Input ended/)
    prompter.close()
  })
})

describe('render and writeSetup', () => {
  const answers = {
    provider: 'r2' as const,
    values: { bucket: 'transfers', region: 'auto', prefix: 'transfers', expiresIn: '24h' },
    secrets: [
      { field: 'accessKeyId' as const, name: 'R2_ACCESS_KEY_ID', value: 'id' },
      { field: 'secretAccessKey' as const, name: 'R2_SECRET_ACCESS_KEY', value: 'se cret' },
    ],
    credentials: 'key …id',
  }

  it('keeps the keys in the machine file, readable by its owner only', () => {
    const path = join(root, 'xdg', 's3nd', 'config.json')
    const written = writeSetup(path, render(answers, 'machine'), 'machine')

    expect(written.envPath).toBeUndefined()
    expect(statSync(path).mode & 0o777).toBe(0o600)

    // Found from any directory, which is the point of it.
    const elsewhere = join(root, 'somewhere', 'else')
    mkdirSync(elsewhere, { recursive: true })
    const { settings } = resolveConfiguration({}, { cwd: elsewhere, env })

    expect(settings.bucket).toBe('transfers')
    expect(settings.credentials).toEqual({ accessKeyId: 'id', secretAccessKey: 'se cret' })
  })

  it('puts a project’s keys in .env, and the file only references them', () => {
    const path = join(root, 'project', 's3nd.config.json')
    const written = writeSetup(path, render(answers, 'project'), 'project')

    const config = JSON.parse(readFileSync(path, 'utf8'))
    expect(config.credentials).toEqual({
      accessKeyId: '${R2_ACCESS_KEY_ID}',
      secretAccessKey: '${R2_SECRET_ACCESS_KEY}',
    })
    expect(readFileSync(written.envPath!, 'utf8')).toBe('R2_ACCESS_KEY_ID=id\nR2_SECRET_ACCESS_KEY="se cret"\n')
    expect(written.envUnignored).toBe(true)

    const { settings } = resolveConfiguration({ config: path }, { cwd: root, env })
    expect(settings.credentials?.secretAccessKey).toBe('se cret')
  })

  it('notices a .gitignore that already keeps .env out', () => {
    mkdirSync(join(root, 'project'))
    writeFileSync(join(root, 'project', '.gitignore'), 'node_modules\n.env\n')

    const written = writeSetup(join(root, 'project', 's3nd.config.json'), render(answers, 'project'), 'project')

    expect(written.envUnignored).toBe(false)
  })
})

describe('mergeEnv', () => {
  it('replaces what is there, appends the rest, and leaves everything else alone', () => {
    const merged = mergeEnv('# keys\nOTHER=1\nR2_ACCESS_KEY_ID=old\n', {
      R2_ACCESS_KEY_ID: 'new',
      R2_SECRET_ACCESS_KEY: 's',
    })

    expect(merged).toBe('# keys\nOTHER=1\nR2_ACCESS_KEY_ID=new\nR2_SECRET_ACCESS_KEY=s\n')
  })
})

describe('validation', () => {
  it('reads an R2 account from the ID or from the S3 API URL', () => {
    expect(r2Account(R2_ACCOUNT)).toBe(R2_ACCOUNT)
    expect(r2Account(`https://${R2_ACCOUNT}.r2.cloudflarestorage.com/transfers`)).toBe(R2_ACCOUNT)
    expect(r2Account('abc')).toBeUndefined()
  })

  it('says what is wrong with a bucket name', () => {
    expect(bucketProblem('transfers')).toBeUndefined()
    expect(bucketProblem('ab')).toMatch(/3 to 63/)
    expect(bucketProblem('Transfers')).toMatch(/Lowercase/)
  })
})
