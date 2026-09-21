import type { Dictionary } from '@/lib/i18n'

import { SplitFlap } from './split-flap'
import { Stamp } from './ui'

/**
 * The hero's right-hand side: the whole product in one panel. A file goes in
 * on one machine, a code comes out, the file comes back on another.
 */
export function HeroBoard({ t, codeLabel }: { t: Dictionary['board']; codeLabel: string }) {
  return (
    <div className="border-line-strong bg-surface shadow-card relative rounded-xl border">
      <div className="border-line flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <span className="text-ink-faint min-w-0 truncate font-mono text-[10px] tracking-[0.22em] uppercase">
          <span className="text-accent">●</span> transfer · drop/K7QP2M4X
        </span>
        <span className="flex shrink-0 gap-2">
          <Stamp tone="accent">{t.yourBucket}</Stamp>
          <Stamp>{t.expires}</Stamp>
        </span>
      </div>

      <div className="px-5 py-5 font-mono text-[13px] leading-relaxed sm:px-6">
        <div>
          <span className="text-ink-faint select-none">you@s3nd.sh $ </span>
          s3nd put <span className="text-accent">./report.pdf</span>
        </div>
        <div className="text-ink-muted">report.pdf · 284 kB · expires in 1 hour</div>

        <div className="my-6 flex justify-center">
          <SplitFlap value="K7QP2M4X" label={codeLabel} />
        </div>

        <div className="perforation -mx-5 sm:-mx-6" aria-hidden="true" />

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span>
            <span className="text-ink-faint select-none">$ </span>
            s3nd get <span className="text-accent">k7qp-2m4x</span>
          </span>
          <span className="text-ink-faint text-[10px] tracking-[0.2em] uppercase">{t.anyOtherMachine}</span>
        </div>
        <div className="text-ink-muted">Wrote ./report.pdf · 284 kB</div>
        <div className="mt-3">
          <span className="text-ink-faint select-none">$ </span>
          s3nd rm k7qp-2m4x
        </div>
        <div className="text-ink-muted">
          Burned K7QP2M4X{' '}
          <Stamp tone="danger" className="ml-1 align-middle">
            {t.gone}
          </Stamp>
        </div>
        <div className="mt-3">
          <span className="text-ink-faint select-none">$ </span>
          <span className="caret" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
