import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'

import { createStyle } from '../src/format.js'
import { Cancelled, createPrompter } from '../src/prompt.js'
import { PROVIDER_CHOICES } from '../src/setup.js'

/** Two streams that say they are a terminal, which is all readline checks. */
function terminal() {
  const input = Object.assign(new PassThrough(), { isTTY: true })
  const output = Object.assign(new PassThrough(), { isTTY: true, columns: 80 })
  let printed = ''
  output.on('data', (chunk: Buffer) => (printed += chunk.toString()))

  const prompter = createPrompter({ input, output, style: createStyle({}, {}) })
  const type = (keys: string) => new Promise<void>((resolve) => setTimeout(() => (input.write(keys), resolve()), 5))

  return { prompter, type, printed: () => printed }
}

describe('choose, at a terminal', () => {
  it('moves with the arrows and picks with Enter', async () => {
    const { prompter, type, printed } = terminal()
    const answer = prompter.choose('Where should transfers be stored?', PROVIDER_CHOICES)

    await type('\u001B[B')
    await type('\u001B[B')
    await type('\u001B[A')
    await type('\r')

    expect(await answer).toBe('r2')
    expect(printed()).toContain('❯ Cloudflare R2')
    // Folded into one line once picked.
    expect(printed()).toContain('? Where should transfers be stored? Cloudflare R2\n')
    prompter.close()
  })

  it('jumps with a number, and the next question still gets its own answer', async () => {
    const { prompter, type } = terminal()
    const answer = prompter.choose('Where?', PROVIDER_CHOICES)

    await type('5')
    await type('\r')
    expect(await answer).toBe('minio')

    const next = prompter.text('Bucket name')
    await type('transfers\r')
    expect(await next).toBe('transfers')
    prompter.close()
  })

  it('cancels on Ctrl+C and gives the cursor back', async () => {
    const { prompter, type, printed } = terminal()
    const answer = prompter.choose('Where?', PROVIDER_CHOICES)

    await type('\u0003')

    await expect(answer).rejects.toBeInstanceOf(Cancelled)
    expect(printed()).toContain('\u001B[?25h')
  })
})
