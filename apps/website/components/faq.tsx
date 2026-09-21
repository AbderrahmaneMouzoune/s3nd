import { faq, type FaqEntry } from '@/lib/faq'

import { JsonLd } from './json-ld'
import { TextLink } from './ui'

/** Questions as native disclosure widgets, and the same content as FAQPage structured data. */
export function Faq({ entries = faq }: { entries?: FaqEntry[] }) {
  return (
    <>
      <div className="border-line divide-line divide-y border-y">
        {entries.map((entry, index) => (
          <details key={entry.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-baseline gap-5 text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
              <span className="text-accent w-8 shrink-0 font-mono text-xs font-semibold tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1">{entry.question}</span>
              <span aria-hidden="true" className="text-accent font-mono transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="text-ink-muted mt-3 max-w-3xl pl-13 text-base leading-relaxed">
              {entry.answer}
              {entry.link ? (
                <>
                  {' '}
                  <TextLink href={entry.link.href} external={entry.link.href.startsWith('http')}>
                    {entry.link.label}
                  </TextLink>
                </>
              ) : null}
            </p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
          })),
        }}
      />
    </>
  )
}
