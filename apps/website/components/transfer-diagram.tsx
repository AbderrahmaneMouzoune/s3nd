import type { Dictionary } from '@/lib/i18n'

import { SplitFlap } from './split-flap'
import { Stamp } from './ui'

function Step({ title, lines, accent = false }: { title: string; lines: string[]; accent?: boolean }) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
      <div className="flex justify-center pt-4" aria-hidden="true">
        <span className={`block size-2.5 rounded-full ${accent ? 'bg-accent pulse-dot' : 'bg-line-strong'}`} />
      </div>
      <div
        className={`min-w-0 rounded-md border px-4 py-3 ${
          accent ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface-muted'
        }`}
      >
        <div className="text-ink-faint font-mono text-[10px] tracking-[0.2em] uppercase">{title}</div>
        <ul className="mt-1.5 space-y-0.5 font-mono text-[13px] leading-relaxed">
          {lines.map((line) => (
            <li key={line} className="truncate">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

function Connector({ label }: { label: string }) {
  return (
    <li className="grid h-9 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3" aria-hidden="true">
      <div className="flex h-full justify-center">
        <svg className="text-line-strong h-full w-3" viewBox="0 0 12 36" fill="none">
          <path className="dash-flow" d="M6 0v26" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <path
            d="M1.5 27 6 33l4.5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-ink-faint font-mono text-[11px]">{label}</span>
    </li>
  )
}

/**
 * The whole story in one figure: one machine puts something in the bucket
 * under a code, the bucket keeps it briefly, another machine gets it back with
 * the code. A vertical timeline, so it fits beside a heading as well as on a phone.
 */
export function TransferDiagram({ t, codeLabel }: { t: Dictionary['diagram']; codeLabel: string }) {
  return (
    <figure className="border-line-strong bg-surface shadow-card rounded-xl border p-5 sm:p-6">
      <ol>
        <Step title={t.machineA} lines={t.putLines} />
        <Connector label={t.connectorUp} />
        <Step accent title={t.bucket} lines={t.bucketLines} />
        <Connector label={t.connectorDown} />
        <Step title={t.machineB} lines={t.getLines} />
      </ol>
      <figcaption className="border-line mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-5">
        <SplitFlap value="K7QP2M4X" size="md" label={codeLabel} />
        <span className="text-ink-muted min-w-[12rem] flex-1 text-sm text-pretty">
          {t.caption} <Stamp>{t.bits}</Stamp>
        </span>
      </figcaption>
    </figure>
  )
}
