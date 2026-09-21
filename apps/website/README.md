# s3nd website

The marketing site at [s3nd.sh](https://s3nd.sh): what s3nd is, the three ways to use it, use cases, providers,
examples, the comparison pages and the drop template. The technical documentation is a separate app, served from
[doc.s3nd.sh](https://doc.s3nd.sh).

```sh
bun run --filter @s3nd/website dev     # localhost:3300
bun run --filter @s3nd/website build
```

Next.js App Router, Tailwind 4, shiki for the code samples at build time. Every page is statically prerendered in
both languages, and nothing runs per request: the rewrites in `next.config.mjs` map the unprefixed English URLs onto
`app/[locale]`.

## The identity

One committed palette, dark: near-black, warm paper for text, and the amber of a departure board for anything that
matters. The recurring motif is the sync code as a split-flap display; `components/split-flap.tsx` renders it and
spins the tiles on the client, `components/hero-board.tsx` puts it in the hero, and the sync code demo shows the
normalized code on it. The tokens are in `app/globals.css`; corners are tight everywhere through the `--radius-*`
overrides there.

The name is written the way the domain is: `s3nd` in full weight and `.sh` a step quieter, through
`components/wordmark.tsx`. It lights up amber on hover in the header and the footer.

Two typefaces, bundled under `app/fonts` so a build never reaches for the network (both are under the SIL Open Font
License, see the LICENSE there): Bricolage Grotesque for everything set in words, JetBrains Mono for every code,
command and sync code. The static `.ttf` weights render the generated Open Graph image. The favicon and the Apple
icon are the amber tile with the arrow leaving it, from `app/icon.svg` and `app/apple-icon.tsx`.

The positioning is files first: put a file, hand over the code, get it on any other machine, through a bucket you
own. An application carrying its own state to the user's next device is presented as the second thing the same
primitive does, not the first.

## Motion

Small, and all in `app/globals.css`: the hero blocks rise in turn on load (`.rise`), everything below the fold fades
up when it scrolls into view (`data-reveal`, driven by `components/reveal.tsx`, staggered through `--stagger`), links
draw their underline, cards lift and grow an amber bar, the primary button glows and its arrow nudges, a copied
command flashes green, the terminal in the hero blinks a caret. The hidden-until-revealed state only applies under
`@media (scripting: enabled)`, so a crawler or a browser without JavaScript sees the page whole, and everything stops
under `prefers-reduced-motion`.

Every command (`components/command.tsx`) and every code block (`components/code-block.tsx`) copies itself on click. A
shell transcript with `$` prompts copies its first command, continuation lines joined and the trailing comment dropped,
because that is what someone pastes; anything else is copied whole. Pass `copy` to a `CodeBlock` to say otherwise.

## Two languages

English lives at the root of the domain (`/cli`) and French under its prefix (`/fr/cli`). The pages live under
`app/[locale]`, the rewrites in `next.config.mjs` serve `/cli` as `/en/cli` and redirect `/en/cli` to `/cli`, and
every page declares its `hreflang` alternates through `pageMetadata()`. The language switch in the header and the footer keeps the reader on
the same page.

The words live in `lib/i18n/en.ts` and `lib/i18n/fr.ts`, one object each with the same shape; the type of the English
one is what keeps the French one complete. Strings may carry `` `code` `` and `[label](href)`, rendered by
`components/rich-text.tsx`. The data behind the use cases, providers, comparisons, FAQ and examples keeps the parts
that never change (slugs, code, links) in one place and the copy per language beside it (`lib/*.fr.ts`), and each
module exports a function that takes the locale.

Adding a language is `lib/i18n/config.ts` (the code and its names) and the same list in `next.config.mjs`, a
dictionary, and the `.fr.ts`-style copy for the data files.

One thing to know: Next 16 prefetches a hovered link segment by segment, and for the rewritten English URLs that
segment request answers 404 (the French ones, which are not rewritten, are fine). Navigation is unaffected, the client
falls back to fetching the page on click, but the request shows up in the browser console.

## The figures

`components/illustrations.tsx` draws the product: put, code and get in the first section, the bucket with nothing in
the middle, a snapshot between two phones, and three glyphs for the three ways in. Inline SVG in the palette, with
CSS for the strokes and tiles (`ill-*` in `globals.css`) and SMIL for the packets that travel along a path; the few
words they carry come from the dictionary (`illustrations`), and reduced motion stops everything, packets included.
The cells they sit in are `.bento`.

## For agents

Every page exists as Markdown: `/cli.md`, `/fr/cli.md`, `/index.md`, or the page URL asked for with
`Accept: text/markdown`. `lib/markdown.ts` assembles it from the same dictionaries, data and code samples
(`lib/samples.ts`) as the HTML, and the rewrites in `next.config.mjs` route to `app/[locale]/markdown`. `/llms.txt`
is the map and `/llms-full.txt` the whole site in one file, both languages; every page links its Markdown twin
through `<link rel="alternate" type="text/markdown">`, and `robots.txt` names the AI crawlers it welcomes.

## Where things are

| Path                                                         |                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/site.ts`                                                | Every external URL: the documentation domain and path, the repository, npm, the Vercel deploy link for the template.     |
| `lib/i18n/`                                                  | The locales, the two dictionaries and `getDictionary()`.                                                                 |
| `lib/use-cases.ts`, `lib/use-cases.fr.ts`                    | The seven use-case pages, as data. One entry is one page under `/use-cases/`; `kind` sorts it under files or app state.  |
| `lib/providers.ts`, `lib/providers.fr.ts`                    | The five provider pages under `/providers/`: `createBucket()` snippet, the CLI starter, notes.                           |
| `lib/alternatives.ts`, `lib/alternatives.fr.ts`              | The comparison pages under `/alternatives/`: the other tool in its own terms, a matrix, the differences, and the choice. |
| `lib/examples.ts`, `lib/faq.ts`                              | The examples page and the FAQ (also emitted as `FAQPage` structured data), in both languages.                            |
| `lib/fonts.ts`                                               | The two `next/font/local` families and the CSS variables they expose.                                                    |
| `next.config.mjs`                                            | The locale rewrite and the `/en` redirect. The locale list is written there too, since it cannot import TypeScript.      |
| `app/[locale]/*/page.tsx`                                    | The pages. Static text comes from the dictionary; anything repeated across pages lives in `lib/`.                        |
| `components/`                                                | Header and mega menu, footer, code block, command, split-flap board, hero board, ticker, the sync code demo, CTA.        |
| `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` | Sitemap (every page in every language, with alternates), robots and the generated Open Graph image.                      |

## The header

`components/site-header.tsx` builds the menu from the dictionary and the data: the product pages with a line each and
a "start in a minute" aside, the use cases under files and app state, the comparisons by category. A use case or a
comparison added in `lib/` shows up in the menu on its own. `components/mega-menu.tsx` renders it: panels open on
hover, focus or click, close on Escape, on a click outside and on navigation, and under `md` the same data becomes a
drawer of native disclosure widgets.

## Adding a page

- **A use case, provider or comparison:** add an entry to the matching file in `lib/`, in both languages. The route,
  the sitemap entry, the menu and the cards on the index pages follow from the data.
- **Anything else:** a `page.tsx` under `app/[locale]/`, with `pageMetadata()` from `lib/metadata.ts` for the title,
  description, canonical URL and alternates, a `PageHero` with a `trail` so it carries breadcrumbs, and its copy in
  both dictionaries. Add it to `app/sitemap.ts` and, if it belongs in the navigation, to the dictionaries' `nav`.

## Links to the documentation

`docs('/quick-start')` from `lib/site.ts` resolves to `https://doc.s3nd.sh/docs/quick-start`. The `/docs` segment is
`site.docsPath`; set it to `''` when the documentation app moves to the root of its domain. The documentation is in
English only; the French pages link to it as is.

## SEO

Every page sets a canonical URL, `hreflang` alternates, Open Graph and Twitter tags through `pageMetadata()`, and the
locale layout declares `metadataBase`, the `Organization` and `WebSite` structured data, and the theme colour. The
home page adds `SoftwareApplication` and `FAQPage`; every subpage adds a `BreadcrumbList`; comparison pages add an
`Article`.

The split-flap board, the sync code demo, the mega menu, the commands, the copy buttons and the reveal observer are
the client components. The demo runs the real `createSyncCodes()` from `@s3nd/protocol` in the browser, which is why
that package is a dependency here.
