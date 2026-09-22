/**
 * The mark: an amber tile, the arrow leaving it through a perforated edge. The
 * same tile the code is displayed on, which is the whole idea.
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
      <rect width="32" height="32" rx="5" fill="var(--accent)" />
      <path
        d="M10 16h12M16.5 10.5 22 16l-5.5 5.5"
        stroke="var(--accent-ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 6.5v19" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 3" />
    </svg>
  )
}
