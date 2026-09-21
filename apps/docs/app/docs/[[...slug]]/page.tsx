import type { Metadata } from 'next'
import { DocsBody, DocsDescription, DocsPage, DocsTitle, ViewOptionsPopover } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import { notFound } from 'next/navigation'

import { getMDXComponents } from '@/components/mdx'
import { githubUrl, markdownUrl } from '@/lib/markdown'
import { cardMetadata } from '@/lib/shared'
import { source } from '@/lib/source'

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {/* Copy the page as Markdown, or open it in an assistant: the same text agents get from `<url>.md`. */}
      <div className="border-fd-border -mt-2 mb-2 flex flex-row items-center gap-2 border-b pb-5">
        <ViewOptionsPopover markdownUrl={markdownUrl(page)} githubUrl={githubUrl(page)} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url, types: { 'text/markdown': `${page.url}.md` } },
    ...cardMetadata({
      title: `${page.data.title} · doc.s3nd.sh`,
      description: page.data.description,
      url: page.url,
      slugs: page.slugs,
    }),
  }
}
