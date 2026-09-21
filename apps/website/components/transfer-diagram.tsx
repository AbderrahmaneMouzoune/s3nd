import { CodeChip } from './ui'

function Step({ title, lines, accent = false }: { title: string; lines: string[]; accent?: boolean }) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
      <div className="flex justify-center pt-4" aria-hidden="true">
        <span className={`block size-2.5 rounded-full ${accent ? 'bg-accent' : 'bg-line-strong'}`} />
      </div>
      <div
        className={`min-w-0 rounded-xl border px-4 py-3 ${
          accent ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface-muted'
        }`}
      >
        <div className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{title}</div>
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
          <path d="M6 0v26" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
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
 * The whole story in one figure: the old device writes a snapshot under a code,
 * the bucket keeps it briefly, the new device reads it back with the code. A
 * vertical timeline, so it fits beside a heading as well as on a phone.
 */
export function TransferDiagram() {
  return (
    <figure className="border-line bg-surface shadow-card rounded-2xl border p-5 sm:p-6">
      <ol>
        <Step title="Old device" lines={['export IndexedDB', 'POST /api/transfers', '→ 201 { code: "K7QP2M4X" }']} />
        <Connector label="putSnapshot() · envelope, gzip, expiry" />
        <Step accent title="Your bucket" lines={['snapshots/K7QP2M4X', 'gzip · 41 kB', 'expires in 1 h']} />
        <Connector label="getSnapshot() · normalized code, maxVersion" />
        <Step title="New device" lines={['type K7QP 2M4X', 'GET /api/transfers/:code', '→ show, confirm, import']} />
      </ol>
      <figcaption className="border-line mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-5">
        <CodeChip code="K7QP2M4X" size="lg" />
        <span className="text-ink-muted min-w-[14rem] flex-1 text-sm text-pretty">
          Eight characters the user reads off one screen and types into the other.
        </span>
      </figcaption>
    </figure>
  )
}
