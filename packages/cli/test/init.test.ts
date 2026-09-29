import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveConfiguration, type Env } from '../src/config.js'
import { PROVIDERS, starter, writeStarter } from '../src/init.js'

let root: string
let env: Env

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 's3nd-init-'))
  env = { XDG_CONFIG_HOME: join(root, 'xdg') }
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('writeStarter', () => {
  it.each(PROVIDERS)('writes a %s config the loader accepts', (provider) => {
    const overrides = provider === 'other' ? { endpoint: 'https://s3.example.com' } : {}
    const { path } = writeStarter({ cwd: root, provider, bucket: 'transfers', overrides, force: false })

    // Every `${…}` a template can carry, so validation is what is under test
    // rather than this machine's environment.
    Object.assign(env, {
      R2_ACCOUNT_ID: 'abc123',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      SCW_ACCESS_KEY: 'key',
      SCW_SECRET_KEY: 'secret',
      WASABI_ACCESS_KEY: 'key',
      WASABI_SECRET_KEY: 'secret',
      S3ND_TOKEN: 'token',
      S3ND_ACCESS_KEY_ID: 'key',
      S3ND_SECRET_ACCESS_KEY: 'secret',
    })

    const { settings } = resolveConfiguration({ config: path }, { cwd: root, env })

    expect(settings.bucket ?? settings.remote).toBeTruthy()
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(starter(provider, 'transfers', overrides).config)
  })

  it('keeps the secrets out of the file it writes', () => {
    const { config } = starter('r2', 'transfers')

    expect(config.credentials?.accessKeyId).toBe('${R2_ACCESS_KEY_ID}')
    expect(config.envFile).toBe('.env')
  })

  it('lets flags pin the region and the endpoint', () => {
    const { config } = starter('wasabi', 'transfers', { region: 'us-east-1', endpoint: 'https://s3.wasabisys.com' })

    expect(config.region).toBe('us-east-1')
    expect(config.endpoint).toBe('https://s3.wasabisys.com')
  })

  it('will not guess the endpoint of an unnamed service', () => {
    expect(() => starter('other', 'transfers')).toThrow(/needs its endpoint/)
  })

  it('refuses to overwrite what is already there', () => {
    writeFileSync(join(root, 's3nd.config.json'), '{}', 'utf8')

    expect(() => writeStarter({ cwd: root, provider: 'aws', bucket: 'transfers', force: false })).toThrow(
      /already exists/,
    )

    expect(writeStarter({ cwd: root, provider: 'aws', bucket: 'transfers', force: true }).path).toBe(
      join(root, 's3nd.config.json'),
    )
  })

  it('writes where it is told to', () => {
    const { path } = writeStarter({
      cwd: root,
      provider: 'aws',
      bucket: 'transfers',
      path: 'config/s3nd.json',
      force: false,
    })

    expect(path).toBe(join(root, 'config', 's3nd.json'))
  })
})
