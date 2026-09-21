import { cx } from './ui'

/**
 * The name, written the way the domain is: `s3nd` in full weight and `.sh`
 * a step quieter. Inside a `group`, the `.sh` lights up amber on hover.
 */
export function Wordmark({ className, tld = true }: { className?: string; tld?: boolean }) {
  return (
    <span className={cx('inline-flex items-baseline font-extrabold tracking-[-0.04em]', className)}>
      s3nd
      {tld ? (
        <span className="text-ink-faint group-hover:text-accent font-semibold transition-colors duration-300">.sh</span>
      ) : null}
    </span>
  )
}
