import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCE = join(import.meta.dirname, '..', 'src')

describe('runtime portability', () => {
  it('imports no node:* module at runtime, only types', () => {
    const offenders: string[] = []

    for (const file of readdirSync(SOURCE)) {
      const text = readFileSync(join(SOURCE, file), 'utf8')
      for (const line of text.split('\n')) {
        if (/^\s*import\s+(?!type\b).*['"]node:/.test(line)) offenders.push(`${file}: ${line.trim()}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('reads no global Buffer or process without a guard', () => {
    const offenders: string[] = []

    for (const file of readdirSync(SOURCE)) {
      const text = readFileSync(join(SOURCE, file), 'utf8')
      text.split('\n').forEach((line, index) => {
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
        if (/\bBuffer\.|\bprocess\.env\b/.test(code)) offenders.push(`${file}:${index + 1}: ${line.trim()}`)
      })
    }

    expect(offenders).toEqual([])
  })
})
