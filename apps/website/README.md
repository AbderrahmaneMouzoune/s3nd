# s3nd website

The marketing site at [s3nd.sh](https://s3nd.sh): what s3nd is, the three ways to use it, use cases, providers,
examples and the comparison pages. The technical documentation is a separate app, served from
[doc.s3nd.sh](https://doc.s3nd.sh).

```sh
bun run --filter @s3nd/website dev     # localhost:3300
bun run --filter @s3nd/website build
```

Next.js App Router, Tailwind 4, shiki for the code samples at build time. Every page is statically prerendered and
nothing is fetched at request time, so it deploys as a Next app anywhere, or as plain static output once
`output: 'export'` is added to `next.config.mjs`.

## The identity

One committed palette, dark: near-black, warm paper for text, and the amber of a departure board for anything that
matters. The recurring motif is the sync code as a split-flap display; `components/split-flap.tsx` renders it and
spins the tiles on the client, `components/hero-board.tsx` puts it in the hero, and the sync code demo shows the
normalized code on it. The tokens are in `app/globals.css`; corners are tight everywhere through the `--radius-*`
overrides there.

Two typefaces, bundled under `app/fonts` so a build never reaches for the network (both are under the SIL Open Font
License, see the LICENSE there): Bricolage Grotesque for everything set in words, JetBrains Mono for every code,
command and sync code. The static `.ttf` weights render the generated Open Graph image.

The positioning is files first: put a file, hand over the code, get it on any other machine, through a bucket you
own. An application carrying its own state to the user's next device is presented as the second thing the same
primitive does, not the first.

## Where things are

| Path                                                         |                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/site.ts`                                                | Every external URL: the documentation domain and path, the repository, npm. Change the docs domain here, once.           |
| `lib/use-cases.ts`                                           | The seven use-case pages, as data. One entry is one page under `/use-cases/`; `kind` sorts it under files or app state.  |
| `lib/providers.ts`                                           | The five provider pages under `/providers/`: `createBucket()` snippet, the CLI starter, notes.                           |
| `lib/alternatives.ts`                                        | The comparison pages under `/alternatives/`: the other tool in its own terms, a matrix, the differences, and the choice. |
| `lib/examples.ts`, `lib/faq.ts`                              | The examples page and the FAQ (also emitted as `FAQPage` structured data).                                               |
| `lib/fonts.ts`                                               | The two `next/font/local` families and the CSS variables they expose.                                                    |
| `app/*/page.tsx`                                             | The pages. Static text lives in the page; anything repeated across pages lives in `lib/`.                                |
| `components/`                                                | Header, footer, code block, split-flap board, hero board, ticker, the sync code demo, hero, CTA, JSON-LD.                |
| `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` | Sitemap, robots and the generated Open Graph image.                                                                      |

## Adding a page

- **A use case, provider or comparison:** add an entry to the matching file in `lib/`. The route, the sitemap entry
  and the cards on the index pages follow from the data.
- **Anything else:** a `page.tsx` under `app/`, with `pageMetadata()` from `lib/metadata.ts` for the title,
  description and canonical URL, and a `PageHero` with a `trail` so it carries breadcrumbs. Add it to
  `app/sitemap.ts` and, if it belongs in the navigation, to `lib/site.ts`.

## Links to the documentation

`docs('/quick-start')` from `lib/site.ts` resolves to `https://doc.s3nd.sh/docs/quick-start`. The `/docs` segment is
`site.docsPath`; set it to `''` when the documentation app moves to the root of its domain.

## SEO

Every page sets a canonical URL, Open Graph and Twitter tags through `pageMetadata()`, and the root layout declares
`metadataBase`, the `Organization` and `WebSite` structured data, and the theme colour. The home page adds
`SoftwareApplication` and `FAQPage`; every subpage adds a `BreadcrumbList`; comparison pages add an `Article`.

The split-flap board and the sync code demo are the only client components. The demo runs the real
`createSyncCodes()` from `@s3nd/protocol` in the browser, which is why that package is a dependency here.
