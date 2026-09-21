import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

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

export function Section({ id, eyebrow, index, title, lead, children, className, level = 2 }: SectionProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <section id={id} className={cx('border-line scroll-mt-20 border-t py-16 sm:py-24', className)}>
      <Container>
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
          <Heading className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
            {title}
          </Heading>
          {lead ? <p className="text-ink-muted mt-5 max-w-2xl text-lg leading-relaxed text-pretty">{lead}</p> : null}
        </div>
        {children ? <div className="mt-12">{children}</div> : null}
      </Container>
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonLinkProps {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  external?: boolean
  className?: string
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-bright border border-transparent',
  secondary: 'border border-line-strong text-ink hover:border-accent hover:text-accent',
  ghost: 'text-ink-muted hover:text-accent border border-transparent',
}

export function ButtonLink({ href, children, variant = 'primary', external, className }: ButtonLinkProps) {
  const classes = cx(
    'inline-flex items-center gap-2 rounded-md px-4 py-3 font-mono text-xs font-semibold tracking-[0.14em] uppercase transition-colors',
    buttonStyles[variant],
    className,
  )

  if (external) {
    return (
      <a className={classes} href={href} rel="noopener">
        {children}
        <ExternalMark />
      </a>
    )
  }

  return (
    <Link className={classes} href={href}>
      {children}
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
  return <div className={cx('border-line bg-surface rounded-lg border p-6', className)} {...props} />
}

interface CardLinkProps {
  href: string
  title: ReactNode
  children?: ReactNode
  meta?: ReactNode
  external?: boolean
  className?: string
}

export function CardLink({ href, title, children, meta, external, className }: CardLinkProps) {
  const classes = cx(
    'group border-line bg-surface hover:border-accent relative flex h-full flex-col rounded-lg border p-6 transition-colors',
    className,
  )
  const body = (
    <>
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
          className="text-ink-faint group-hover:text-accent shrink-0 font-mono transition-[color,transform] group-hover:translate-x-1"
        >
          →
        </span>
      </div>
      {children ? <div className="text-ink-muted mt-2 text-sm leading-relaxed">{children}</div> : null}
    </>
  )

  if (external) {
    return (
      <a className={classes} href={href} rel="noopener">
        {body}
      </a>
    )
  }

  return (
    <Link className={classes} href={href}>
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
        <div key={item.label} className="bg-surface p-5">
          <dt className="text-accent font-mono text-[10px] tracking-[0.2em] uppercase">{item.label}</dt>
          <dd className="mt-2 text-sm leading-relaxed">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TextLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const classes = 'text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent font-medium'

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
