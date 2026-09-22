import Link from 'next/link'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('mx-auto w-full max-w-7xl px-5 sm:px-8', className)} {...props} />
}

/** The small amber label above a heading. Pass `index` for a section number. */
export function Eyebrow({ index, className, children, ...props }: ComponentProps<'p'> & { index?: string }) {
  return (
    <p
      className={cx(
        'text-accent flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase',
        className,
      )}
      {...props}
    >
      {index ? (
        <>
          <span className="tabular-nums">{index}</span>
          <span aria-hidden="true" className="bg-accent h-px w-6" />
        </>
      ) : null}
      <span>{children}</span>
    </p>
  )
}

interface SectionProps {
  id?: string
  eyebrow?: string
  index?: string
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  className?: string
  /** Renders the heading as an h2 (default) or h3. */
  level?: 2 | 3
}

/**
 * A page section. The heading block and the body each carry `data-reveal`, so
 * they fade up as they scroll into view (see `RevealObserver`); the body a beat
 * after the heading.
 */
export function Section({ id, eyebrow, index, title, lead, children, className, level = 2 }: SectionProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <section id={id} className={cx('border-line scroll-mt-20 border-t py-16 sm:py-24', className)}>
      <Container>
        <div className="max-w-3xl" data-reveal="">
          {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
          <Heading className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
            {title}
          </Heading>
          {lead ? <p className="text-ink-muted mt-5 max-w-2xl text-lg leading-relaxed text-pretty">{lead}</p> : null}
        </div>
        {children ? (
          <div className="mt-12" data-reveal="" style={{ '--stagger': 1 } as CSSProperties}>
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'lg'

interface ButtonLinkProps {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  external?: boolean
  /** Hide the trailing arrow. */
  plain?: boolean
  className?: string
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary bg-accent text-accent-ink border border-transparent hover:bg-accent-bright',
  secondary:
    'btn-secondary border border-ink/30 bg-surface text-ink hover:border-accent hover:text-accent hover:bg-surface-muted',
  ghost: 'btn-ghost text-ink-muted border border-transparent hover:text-ink hover:bg-surface',
}

const buttonSizes: Record<ButtonSize, string> = {
  md: 'px-4 py-2.5 text-[12px]',
  lg: 'px-5 py-3.5 text-[13px]',
}

/**
 * The call to action. Amber and lifted for the primary, an outline for the
 * secondary, text for the rest; every one carries an arrow that nudges on hover.
 */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  external,
  plain,
  className,
}: ButtonLinkProps) {
  const classes = cx(
    'btn group/btn inline-flex items-center gap-2 rounded-md font-mono font-bold tracking-[0.14em] uppercase',
    buttonStyles[variant],
    buttonSizes[size],
    className,
  )
  const arrow = plain ? null : (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block transition-transform duration-300 ease-out',
        external ? 'group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5' : 'group-hover/btn:translate-x-1',
      )}
    >
      {external ? '↗' : '→'}
    </span>
  )

  if (external) {
    return (
      <a className={classes} href={href} rel="noopener">
        {children}
        {arrow}
      </a>
    )
  }

  return (
    <Link className={classes} href={href}>
      {children}
      {arrow}
    </Link>
  )
}

/** The little arrow that marks a link leaving the site. */
export function ExternalMark() {
  return (
    <span aria-hidden="true" className="text-[0.85em] opacity-70">
      ↗
    </span>
  )
}

/** A bordered, uppercase label: the rubber stamp on a parcel. */
export function Stamp({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode
  tone?: 'muted' | 'accent' | 'danger' | 'ok'
  className?: string
}) {
  const tones = {
    muted: 'border-line-strong text-ink-muted',
    accent: 'border-accent text-accent',
    danger: 'border-danger text-danger',
    ok: 'border-ok text-ok',
  }

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.2em] uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cx(
        'card border-line bg-surface hover:border-line-strong rounded-lg border p-6 transition-[border-color,transform,box-shadow] duration-300',
        className,
      )}
      {...props}
    />
  )
}

interface CardLinkProps {
  href: string
  title: ReactNode
  children?: ReactNode
  meta?: ReactNode
  external?: boolean
  className?: string
  /** Position in a grid, for the staggered reveal. */
  index?: number
}

export function CardLink({ href, title, children, meta, external, className, index }: CardLinkProps) {
  const classes = cx(
    'card-link group border-line bg-surface hover:border-accent relative flex h-full flex-col overflow-hidden rounded-lg border p-6 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5',
    className,
  )
  const style = index != null ? ({ '--stagger': index } as CSSProperties) : undefined
  const body = (
    <>
      <span aria-hidden="true" className="card-bar" />
      {meta ? <div className="text-ink-faint mb-4 font-mono text-[10px] tracking-[0.2em] uppercase">{meta}</div> : null}
      <div className="flex items-start justify-between gap-4">
        <div className="text-lg font-bold tracking-tight text-balance">
          {title}
          {external ? (
            <>
              {' '}
              <ExternalMark />
            </>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="text-ink-faint group-hover:text-accent shrink-0 font-mono transition-[color,transform] duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
      {children ? <div className="text-ink-muted mt-2 text-sm leading-relaxed">{children}</div> : null}
    </>
  )

  if (external) {
    return (
      <a className={classes} href={href} rel="noopener" style={style}>
        {body}
      </a>
    )
  }

  return (
    <Link className={classes} href={href} style={style}>
      {body}
    </Link>
  )
}

/** A sync code in tile form, static. For the animated board see `SplitFlap`. */
export function CodeChip({ code, size = 'md', className }: { code: string; size?: 'md' | 'lg'; className?: string }) {
  const grouped = code.match(/.{1,4}/g)?.join(' ') ?? code

  return (
    <span
      className={cx(
        'text-accent inline-flex items-center rounded-md border border-[#2a2926] bg-[#161615] font-mono font-bold tracking-[0.22em]',
        size === 'lg' ? 'px-4 py-2 text-2xl sm:text-3xl' : 'px-2.5 py-1 text-sm',
        className,
      )}
    >
      {grouped}
    </span>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'border-line-strong text-ink-muted inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="bg-surface-muted text-ink rounded-sm px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
}

/** A row of big facts: label above, value below. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="border-line grid gap-px overflow-hidden rounded-lg border bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface hover:bg-surface-muted p-5 transition-colors duration-300">
          <dt className="text-accent font-mono text-[10px] tracking-[0.2em] uppercase">{item.label}</dt>
          <dd className="mt-2 text-sm leading-relaxed">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TextLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const classes = 'text-link text-accent font-medium'

  if (external) {
    return (
      <a className={classes} href={href} rel="noopener">
        {children} <ExternalMark />
      </a>
    )
  }

  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  )
}

export { cx }
