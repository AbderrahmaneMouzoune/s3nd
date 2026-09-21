import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('mx-auto w-full max-w-6xl px-5 sm:px-8', className)} {...props} />
}

export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cx('text-accent font-mono text-[11px] font-medium tracking-[0.18em] uppercase', className)}
      {...props}
    />
  )
}

interface SectionProps {
  id?: string
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  className?: string
  /** Renders the heading as an h2 (default) or h3. */
  level?: 2 | 3
}

export function Section({ id, eyebrow, title, lead, children, className, level = 2 }: SectionProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <section id={id} className={cx('scroll-mt-24 py-16 sm:py-24', className)}>
      <Container>
        <div className="max-w-2xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</Heading>
          {lead ? <p className="text-ink-muted mt-4 text-lg leading-relaxed text-pretty">{lead}</p> : null}
        </div>
        {children ? <div className="mt-10">{children}</div> : null}
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
  primary: 'bg-accent text-accent-ink hover:opacity-90 border border-transparent',
  secondary: 'border border-line-strong bg-surface hover:bg-surface-muted text-ink',
  ghost: 'text-ink-muted hover:text-ink border border-transparent',
}

export function ButtonLink({ href, children, variant = 'primary', external, className }: ButtonLinkProps) {
  const classes = cx(
    'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-[opacity,background-color,color]',
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

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('border-line bg-surface shadow-card rounded-2xl border p-6', className)} {...props} />
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
    'group border-line bg-surface hover:border-line-strong shadow-card flex h-full flex-col rounded-2xl border p-6 transition-colors',
    className,
  )
  const body = (
    <>
      {meta ? <div className="text-ink-faint mb-3 font-mono text-[11px] tracking-wider uppercase">{meta}</div> : null}
      <div className="group-hover:text-accent text-base font-semibold tracking-tight transition-colors">
        {title}
        {external ? (
          <>
            {' '}
            <ExternalMark />
          </>
        ) : null}
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

/** A sync code, grouped in fours the way an app should show it. */
export function CodeChip({ code, size = 'md', className }: { code: string; size?: 'md' | 'lg'; className?: string }) {
  const grouped = code.match(/.{1,4}/g)?.join(' ') ?? code

  return (
    <span
      className={cx(
        'border-line-strong bg-surface text-ink inline-flex items-center rounded-lg border border-dashed font-mono font-medium tracking-[0.18em]',
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
        'border-line bg-surface-muted text-ink-muted inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="bg-surface-muted rounded px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
}

/** A row of small definitions: label above, value below. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-ink-faint font-mono text-[11px] tracking-wider uppercase">{item.label}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TextLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const classes = 'text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent'

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
