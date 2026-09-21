import { faq, type FaqEntry } from '@/lib/faq'

import { JsonLd } from './json-ld'
import { TextLink } from './ui'

/** Questions as native disclosure widgets, and the same content as FAQPage structured data. */
export function Faq({ entries = faq }: { entries?: FaqEntry[] }) {
  return (
    <>
      <div className="border-line divide-line divide-y rounded-2xl border">
        {entries.map((entry) => (
          <details key={entry.question} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
              {entry.question}
              <span aria-hidden="true" className="text-ink-faint transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="text-ink-muted mt-3 max-w-3xl text-sm leading-relaxed">
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
