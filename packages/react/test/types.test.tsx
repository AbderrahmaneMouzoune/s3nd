import { describe, expectTypeOf, it } from 'vitest'

import type { CreatedTransfer, TransferMetadata } from '@s3nd/protocol'

import { useReceiveTransfer, useSendTransfer, useSyncCodeInput, type ReceiveTransfer } from '../src/index.js'

// Checked by `tsc` (`bun run type-check` covers the test directory), never
// called: the hooks are only referenced through their types, so nothing here
// needs a provider or a DOM.

interface Dump {
  notes: string[]
}

describe('hook return types', () => {
  it('types the received snapshot by the generic, and defaults it to unknown', () => {
    expectTypeOf(useReceiveTransfer<Dump>).returns.toEqualTypeOf<ReceiveTransfer<Dump>>()
    expectTypeOf<ReturnType<typeof useReceiveTransfer<Dump>>['data']>().toEqualTypeOf<Dump | undefined>()
    expectTypeOf<ReturnType<typeof useReceiveTransfer>['data']>().toEqualTypeOf<unknown>()
    expectTypeOf<ReceiveTransfer['load']>().returns.resolves.toEqualTypeOf<TransferMetadata | null>()
    expectTypeOf<ReceiveTransfer['loadBytes']>().returns.resolves.toEqualTypeOf<Uint8Array | null>()
  })

  it('hands back the created transfer, or null on failure', () => {
    const send = expectTypeOf(useSendTransfer).returns
    send.toHaveProperty('send').returns.resolves.toEqualTypeOf<CreatedTransfer | null>()
    send.toHaveProperty('sendFile').returns.resolves.toEqualTypeOf<CreatedTransfer | null>()
    send.toHaveProperty('transfer').toEqualTypeOf<CreatedTransfer | null>()
  })

  it('gives a code only once what was typed can be one', () => {
    const input = expectTypeOf(useSyncCodeInput).returns
    input.toHaveProperty('code').toEqualTypeOf<string | null>()
    input.toHaveProperty('isComplete').toEqualTypeOf<boolean>()
  })
})
