'use client'

import Link from 'next/link'

/**
 * What a visitor sees when the server throws: almost always a drop that has
 * been deployed without its bucket variables. Say so, rather than a blank page.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <span className="text-danger border-danger inline-flex rounded-sm border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">
        not configured
      </span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">The bucket did not answer.</h1>
      <p className="text-ink-muted mx-auto mt-4 max-w-lg text-lg text-pretty">
        This drop needs <code className="font-mono text-base">S3ND_BUCKET</code>, an endpoint, a region and a key pair
        in its environment. Set them, redeploy, and run{' '}
        <code className="font-mono text-base">s3nd doctor --remote</code> against it.
      </p>
      {error.digest ? <p className="text-ink-faint mt-3 font-mono text-[11px]">digest {error.digest}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary bg-accent text-accent-ink hover:bg-accent-bright inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
        >
          Try again
        </button>
        <Link
          className="btn border-ink/30 bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-md border px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase"
          href="/"
        >
          Back to the drop
        </Link>
        <a
          className="text-ink-muted hover:text-ink inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-mono text-[13px] font-bold tracking-[0.14em] uppercase transition-colors"
          href="https://s3nd.sh/drop"
          rel="noopener"
        >
          Setup guide ↗
        </a>
      </div>
    </div>
  )
}
