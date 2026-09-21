import { SplitFlap } from './split-flap'
import { Stamp } from './ui'

function Step({ title, lines, accent = false }: { title: string; lines: string[]; accent?: boolean }) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
      <div className="flex justify-center pt-4" aria-hidden="true">
        <span className={`block size-2.5 rounded-full ${accent ? 'bg-accent' : 'bg-line-strong'}`} />
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
 * The whole story in one figure: one machine puts something in the bucket
 * under a code, the bucket keeps it briefly, another machine gets it back with
 * the code. A vertical timeline, so it fits beside a heading as well as on a phone.
 */
export function TransferDiagram() {
  return (
    <figure className="border-line-strong bg-surface shadow-card rounded-xl border p-5 sm:p-6">
      <ol>
        <Step
          title="Machine A"
          lines={['s3nd put ./report.pdf', 'or POST /api/transfers from your app', '→ K7QP2M4X']}
        />
        <Connector label="one PutObject · ifAbsent · expiry stamped on the object" />
        <Step
          accent
          title="Your bucket"
          lines={['drop/K7QP2M4X', '284 kB · expires in 1 h', 'S3, R2, MinIO, Scaleway, Wasabi']}
        />
        <Connector label="code normalized · expiry checked on read" />
        <Step
          title="Machine B"
          lines={['s3nd get k7qp-2m4x', 'or GET /api/transfers/:code/raw', '→ report.pdf, then rm']}
        />
      </ol>
      <figcaption className="border-line mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-5">
        <SplitFlap value="K7QP2M4X" size="md" label="The code" />
        <span className="text-ink-muted min-w-[12rem] flex-1 text-sm text-pretty">
          Eight characters read off one screen and typed into another. <Stamp>40 bits</Stamp>
        </span>
      </figcaption>
    </figure>
  )
}
