'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'

import { Command } from './command'
import { LanguageSwitcher } from './language-switcher'
import { useLocale } from './locale-provider'
import { Logo } from './logo'
import { cx, ExternalMark } from './ui'
import { Wordmark } from './wordmark'

export interface MenuLink {
  label: string
  description?: string
  href: string
  external?: boolean
}

export interface MenuGroup {
  title?: string
  links: MenuLink[]
}

export interface MenuSection {
  id: string
  label: string
  /** A sentence under the section label, in the panel. */
  lead?: string
  groups: MenuGroup[]
  /** The "all of them" link at the bottom of the panel. */
  footer?: MenuLink
  /** A boxed column on the right: a title, a line, a command to copy, a link. */
  aside?: { title: string; body: string; command: string; link: MenuLink }
  /** How the groups lay out on a wide screen. */
  columns?: 2 | 3 | 4
}

export interface MenuData {
  home: string
  homeLabel: string
  sections: MenuSection[]
  /** Plain links after the sections: the docs. */
  links: MenuLink[]
  github: MenuLink
  cta: MenuLink
}

const CLOSE_DELAY = 140

/**
 * The header: wordmark, three mega-menu sections that open on hover, focus or
 * click, the docs link, the language switch, GitHub and the install button.
 * Under `md` the same data becomes a drawer with native disclosure widgets.
 */
export function MegaMenu({ data }: { data: MenuData }) {
  const { ui } = useLocale()
  const pathname = usePathname()
  const baseId = useId()
  const [open, setOpen] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY)
  }, [cancelClose])

  const show = useCallback(
    (id: string) => {
      cancelClose()
      setOpen(id)
    },
    [cancelClose],
  )

  // Navigation closes everything.
  useEffect(() => {
    setOpen(null)
    setDrawer(false)
  }, [pathname])

  // Escape closes, and a click outside the header closes.
  useEffect(() => {
    if (!open && !drawer) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(null)
        setDrawer(false)
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(null)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, drawer])

  // The drawer locks the page behind it.
  useEffect(() => {
    if (!drawer) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [drawer])

  useEffect(() => cancelClose, [cancelClose])

  const current = data.sections.find((section) => section.id === open) ?? null

  return (
    <div
      ref={root}
      className="sticky top-0 z-40"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(null)
      }}
    >
      {/*
       * The bar carries the blur and the panel and the drawer sit beside it,
       * not inside it: a backdrop filter is a containing block for fixed
       * descendants, which would pin the drawer to the bar's 56 pixels.
       */}
      <div className="border-line bg-canvas/85 relative z-10 mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5 backdrop-blur-md sm:px-8">
        <Link className="group flex items-center gap-2.5" href={data.home} aria-label={data.homeLabel}>
          <Logo className="size-6 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-105" />
          <Wordmark className="text-lg" />
        </Link>

        <nav
          aria-label={ui.primaryNavigation}
          className="hidden items-center gap-0.5 md:flex"
          onMouseLeave={scheduleClose}
        >
          {data.sections.map((section) => {
            const active = open === section.id

            return (
              <button
                key={section.id}
                type="button"
                aria-expanded={active}
                aria-controls={`${baseId}-${section.id}`}
                data-state={active ? 'open' : 'closed'}
                onMouseEnter={() => show(section.id)}
                onFocus={() => show(section.id)}
                onClick={() => (active ? setOpen(null) : show(section.id))}
                className={cx(
                  'nav-item flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors',
                  active ? 'text-accent' : 'text-ink-muted hover:text-ink',
                )}
              >
                {section.label}
                <span
                  aria-hidden="true"
                  className={cx('inline-block text-[9px] transition-transform duration-300', active && 'rotate-180')}
                >
                  ▾
                </span>
              </button>
            )
          })}
          {data.links.map((link) => (
            <a
              key={link.href}
              className="nav-item text-ink-muted hover:text-ink rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors"
              href={link.href}
              rel={link.external ? 'noopener' : undefined}
              onMouseEnter={scheduleClose}
              onFocus={() => setOpen(null)}
            >
              {link.label} {link.external ? <ExternalMark /> : null}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <a
            className="border-line-strong text-ink hover:border-accent hover:text-accent hidden items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] uppercase transition-colors lg:inline-flex"
            href={data.github.href}
            rel="noopener"
          >
            {data.github.label}
          </a>
          <Link
            className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright group/btn hidden items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] uppercase md:inline-flex"
            href={data.cta.href}
          >
            {data.cta.label}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover/btn:translate-x-0.5"
            >
              →
            </span>
          </Link>
          <button
            type="button"
            className="border-line-strong hover:border-accent flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] uppercase transition-colors md:hidden"
            aria-expanded={drawer}
            aria-controls={`${baseId}-drawer`}
            onClick={() => setDrawer((value) => !value)}
          >
            {drawer ? ui.closeMenu : ui.menu}
            <span aria-hidden="true" className="relative block h-3 w-3.5">
              <span
                className={cx(
                  'bg-ink absolute left-0 h-0.5 w-full transition-transform duration-300',
                  drawer ? 'top-[5px] rotate-45' : 'top-0',
                )}
              />
              <span
                className={cx(
                  'bg-ink absolute top-[5px] left-0 h-0.5 w-full transition-opacity duration-200',
                  drawer && 'opacity-0',
                )}
              />
              <span
                className={cx(
                  'bg-ink absolute left-0 h-0.5 w-full transition-transform duration-300',
                  drawer ? 'top-[5px] -rotate-45' : 'top-[10px]',
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {current ? (
        <div
          id={`${baseId}-${current.id}`}
          data-menu-panel=""
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="border-line absolute inset-x-0 top-full hidden border-b bg-[#0c0c0b] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)] md:block"
        >
          <div className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8">
            <div className={cx('grid gap-8', current.aside ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]' : '')}>
              <div>
                {current.lead ? (
                  <p className="text-ink-muted mb-5 max-w-xl text-sm text-pretty">{current.lead}</p>
                ) : null}
                <div
                  className={cx(
                    'grid gap-x-8 gap-y-6',
                    current.columns === 4 && 'lg:grid-cols-4',
                    current.columns === 3 && 'lg:grid-cols-3',
                    (current.columns ?? 2) === 2 && 'lg:grid-cols-2',
                  )}
                >
                  {current.groups.map((group, groupIndex) => (
                    <div key={group.title ?? groupIndex} className="min-w-0">
                      {group.title ? (
                        <div className="text-accent mb-3 font-mono text-[10px] font-semibold tracking-[0.22em] uppercase">
                          {group.title}
                        </div>
                      ) : null}
                      <ul className="space-y-0.5">
                        {group.links.map((link, index) => (
                          <li key={link.href} style={{ '--stagger': index } as CSSProperties} className="menu-item">
                            <MenuAnchor link={link} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {current.footer ? (
                  <div className="border-line mt-6 border-t pt-4">
                    <Link
                      className="text-link text-accent font-mono text-[11px] font-semibold tracking-[0.18em] uppercase"
                      href={current.footer.href}
                    >
                      {current.footer.label} →
                    </Link>
                  </div>
                ) : null}
              </div>
              {current.aside ? (
                <aside className="border-line bg-surface flex flex-col gap-3 self-start rounded-lg border p-5">
                  <div className="hazard h-1.5 -mx-5 -mt-5 mb-1 rounded-t-lg" aria-hidden="true" />
                  <div className="font-bold tracking-tight">{current.aside.title}</div>
                  <p className="text-ink-muted text-sm leading-relaxed">{current.aside.body}</p>
                  <Command className="w-full">{current.aside.command}</Command>
                  <Link className="text-link text-accent text-sm font-medium" href={current.aside.link.href}>
                    {current.aside.link.label}
                  </Link>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        id={`${baseId}-drawer`}
        hidden={!drawer}
        className="bg-canvas fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto md:hidden"
        data-drawer=""
      >
        <nav aria-label={ui.primaryNavigation} className="flex flex-col gap-1 px-5 py-4">
          {data.sections.map((section) => (
            <details key={section.id} className="group border-line border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 font-mono text-xs font-bold tracking-[0.18em] uppercase select-none [&::-webkit-details-marker]:hidden">
                {section.label}
                <span aria-hidden="true" className="text-accent transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="pb-4">
                {section.groups.map((group, groupIndex) => (
                  <div key={group.title ?? groupIndex} className="mb-3">
                    {group.title ? (
                      <div className="text-accent mb-1.5 font-mono text-[10px] font-semibold tracking-[0.22em] uppercase">
                        {group.title}
                      </div>
                    ) : null}
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            className="hover:text-accent block py-1.5 text-sm font-medium transition-colors"
                            href={link.href}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {section.footer ? (
                  <Link className="text-accent text-sm font-medium" href={section.footer.href}>
                    {section.footer.label} →
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
          {data.links.map((link) => (
            <a
              key={link.href}
              className="border-line flex items-center justify-between border-b py-3.5 font-mono text-xs font-bold tracking-[0.18em] uppercase"
              href={link.href}
              rel={link.external ? 'noopener' : undefined}
            >
              {link.label} {link.external ? <ExternalMark /> : null}
            </a>
          ))}
          <a
            className="border-line flex items-center justify-between border-b py-3.5 font-mono text-xs font-bold tracking-[0.18em] uppercase"
            href={data.github.href}
            rel="noopener"
          >
            {data.github.label} <ExternalMark />
          </a>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LanguageSwitcher />
            <Link
              className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-[12px] font-bold tracking-[0.14em] uppercase"
              href={data.cta.href}
            >
              {data.cta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  )
}

function MenuAnchor({ link }: { link: MenuLink }) {
  const classes =
    'group/link hover:bg-surface flex items-start gap-3 rounded-md px-2.5 py-2 transition-colors duration-200'
  const body = (
    <>
      <span
        aria-hidden="true"
        className="text-ink-faint group-hover/link:text-accent mt-0.5 font-mono text-xs transition-[color,transform] duration-300 group-hover/link:translate-x-0.5"
      >
        →
      </span>
      <span className="min-w-0">
        <span className="group-hover/link:text-accent block text-sm font-semibold transition-colors">
          {link.label}
          {link.external ? (
            <>
              {' '}
              <ExternalMark />
            </>
          ) : null}
        </span>
        {link.description ? (
          <span className="text-ink-muted mt-0.5 block text-xs leading-relaxed">{link.description}</span>
        ) : null}
      </span>
    </>
  )

  return link.external ? (
    <a className={classes} href={link.href} rel="noopener">
      {body}
    </a>
  ) : (
    <Link className={classes} href={link.href}>
      {body}
    </Link>
  )
}
