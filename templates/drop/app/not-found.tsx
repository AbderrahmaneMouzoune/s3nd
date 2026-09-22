import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <span className="text-accent rise inline-flex rounded-md border border-[#2a2926] bg-[#161615] px-4 py-2 font-mono text-2xl font-bold tracking-[0.22em]">
        404
      </span>
      <h1 className="rise rise-1 mt-6 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
        Unknown or expired code.
      </h1>
      <p className="rise rise-2 text-ink-muted mx-auto mt-4 max-w-md text-lg text-pretty">
        Nothing is stored under this code. It may have expired, been burned, or been typed wrong.
      </p>
      <Link
        className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright rise rise-3 mt-8 inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
        href="/"
      >
        Drop a file <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
