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

## Where things are

| Path                                                         |                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/site.ts`                                                | Every external URL: the documentation domain and path, the repository, npm. Change the docs domain here, once.           |
| `lib/use-cases.ts`                                           | The six use-case pages, as data. One entry is one page under `/use-cases/`.                                              |
| `lib/providers.ts`                                           | The five provider pages under `/providers/`: `createBucket()` snippet, the CLI starter, notes.                           |
| `lib/alternatives.ts`                                        | The comparison pages under `/alternatives/`: the other tool in its own terms, a matrix, the differences, and the choice. |
| `lib/examples.ts`, `lib/faq.ts`                              | The examples page and the FAQ (also emitted as `FAQPage` structured data).                                               |
| `app/*/page.tsx`                                             | The pages. Static text lives in the page; anything repeated across pages lives in `lib/`.                                |
| `components/`                                                | Header, footer, code block, the sync code demo (the only client component), hero, CTA, JSON-LD.                          |
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
`metadataBase`, the `Organization` and `WebSite` structured data, and the theme colours. The home page adds
`SoftwareApplication` and `FAQPage`; every subpage adds a `BreadcrumbList`; comparison pages add an `Article`.

The sync code demo on the home and React pages runs the real `createSyncCodes()` from `@s3nd/protocol` in the
browser, which is why that package is a dependency here. It is also the only JavaScript the site ships beyond
Next's own.
