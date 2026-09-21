import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** A client that asks for Markdown gets the page as Markdown, from the same URL. */
const wantsMarkdown = [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }]

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The Markdown twins for agents: `/docs/quick-start.md`, or any docs URL
  // asked for with `Accept: text/markdown`, served by `app/llms.md`.
  async rewrites() {
    return {
      afterFiles: [
        { source: '/docs.md', destination: '/llms.md' },
        { source: '/docs/:path*.md', destination: '/llms.md/:path*' },
        { source: '/docs', has: wantsMarkdown, destination: '/llms.md' },
        { source: '/docs/:path*', has: wantsMarkdown, destination: '/llms.md/:path*' },
      ],
    }
  },
}

export default withMDX(config)
