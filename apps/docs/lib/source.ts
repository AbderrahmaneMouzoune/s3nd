import { loader } from 'fumadocs-core/source'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { applyMdxPreset } from 'fumadocs-mdx/config'
import { defineDocs } from 'fumadocs-mdx/macro'

import { docsRoute } from './shared'

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    // The default Fumadocs pipeline, with the website's shiki theme: the site
    // is dark only, so both halves of the dual theme are the same.
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: { themes: { light: 'vesper', dark: 'vesper' } },
    }),
  },
  meta: { schema: metaSchema },
})

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
})
