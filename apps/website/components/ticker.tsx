/**
 * A strip of facts that never stops moving, like the board in a station. Two
 * copies of the list make the loop seamless; reduced motion stops it, and a
 * hover pauses it.
 */
export function Ticker({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="border-line bg-surface overflow-hidden border-y" aria-label={label}>
      <div className="ticker-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-6 px-3 py-3 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase whitespace-nowrap"
              >
                {item}
                <span aria-hidden="true" className="text-accent">
                  ◆
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
