/**
 * The mark: a rounded tile with an arrow leaving through a dashed edge, the
 * tear-off ticket a sync code is. Inherits `currentColor` for the arrow so it
 * reads in both colour schemes; the tile is the accent.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M9 16h12M16.5 10.5 22 16l-5.5 5.5"
        stroke="var(--accent-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 7v18" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.2 3" />
    </svg>
  )
}
