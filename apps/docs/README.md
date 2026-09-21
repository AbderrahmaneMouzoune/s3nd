# s3nd docs

The documentation site, built on [Fumadocs](https://fumadocs.dev) — Next.js App Router, MDX content,
built-in search and table of contents.

## The identity

The same one as the website: near-black, warm paper for text, the amber of a departure board for
anything that matters, Bricolage Grotesque for the words and JetBrains Mono for the code. The theme
is forced dark, since the identity is the dark board; there is no switch. `app/global.css` maps the
palette onto Fumadocs' `--color-fd-*` tokens and tightens the corners, `lib/fonts.ts` bundles the two
families under `app/fonts` (SIL Open Font License, see the LICENSE there), `lib/source.ts` gives the
code blocks the website's shiki theme, and `components/wordmark.tsx` writes the name the way the
domain is: `s3nd` and a quieter `.sh`. The favicon is the website's amber tile.

```sh
bun run --filter @s3nd/docs dev    # localhost:3100
bun run --filter @s3nd/docs build
```

## Where the content lives

Every page is an MDX file under `content/docs`, and the route follows the file path:

| File                                    | Route                        |
| --------------------------------------- | ---------------------------- |
| `content/docs/index.mdx`                | `/docs`                      |
| `content/docs/quick-start.mdx`          | `/docs/quick-start`          |
| `content/docs/use-cases/new-device.mdx` | `/docs/use-cases/new-device` |

Each file opens with frontmatter — `title` and `description` — which Fumadocs uses for the page
heading, the `<title>`, and the search index. Do not repeat the title as an `# H1` in the body.

`content/docs/meta.json` decides the sidebar: the `pages` array lists slugs in order, and a
`"---Section---"` entry starts a new group. A page missing from that array still builds, it just
falls to the end of the sidebar.

## The rest of the app

| Path                            |                                                                   |
| ------------------------------- | ----------------------------------------------------------------- |
| `lib/source.ts`                 | Binds the MDX collection to Fumadocs' loader.                     |
| `lib/layout.shared.tsx`         | Nav title, GitHub link, top-level links — shared by both layouts. |
| `app/docs/[[...slug]]/page.tsx` | Renders one page: title, description, body, TOC.                  |
| `app/(home)/page.tsx`           | The landing page, outside the docs layout.                        |
| `app/api/search/route.ts`       | The search index Fumadocs queries client-side.                    |

Every docs page is statically prerendered, so the site deploys as static output with one dynamic
route for search.
