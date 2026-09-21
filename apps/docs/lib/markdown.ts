import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { source } from './source'
import { docsUrl, gitConfig } from './shared'

/**
 * The documentation as Markdown, for agents: `/docs/<slug>.md`, any docs URL
 * asked for with `Accept: text/markdown`, `/llms.txt` and `/llms-full.txt`.
 * The text is the MDX source itself, minus its frontmatter, with the title
 * and description restored as a heading, and relative links made absolute.
 */

type Page = NonNullable<ReturnType<typeof source.getPage>>

export function markdownUrl(page: Page): string {
  return `${docsUrl}${page.url}.md`
}

export function githubUrl(page: Page): string {
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/docs/content/docs/${page.path}`
}

export async function pageMarkdown(page: Page): Promise<string> {
  const raw = await readFile(join(process.cwd(), 'content/docs', page.path), 'utf8')
  const body = raw
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/\]\(\/docs(\/[^)]*)?\)/g, (_match, rest: string | undefined) => `](${docsUrl}/docs${rest ?? ''})`)
    .trim()

  return [
    `# ${page.data.title}`,
    '',
    page.data.description ? `> ${page.data.description}\n` : '',
    `Canonical: ${docsUrl}${page.url} · Markdown: ${markdownUrl(page)}`,
    '',
    body,
    '',
  ].join('\n')
}

/** `/llms.txt`: every page, with its Markdown twin. */
export function llmsIndex(): string {
  const lines = [
    '# s3nd documentation',
    '',
    '> Send anything with a code, through your own bucket. Snapshots, sync codes, the transfer protocol, the CLI, the React hooks and the API reference.',
    '',
    `Every page below also exists as Markdown at the \`.md\` URL, or by asking for \`text/markdown\`. The full text is at ${docsUrl}/llms-full.txt. The product site, the use cases and the comparisons are at https://s3nd.sh (https://s3nd.sh/llms.txt).`,
    '',
    '## Pages',
    '',
  ]

  for (const page of source.getPages()) {
    lines.push(
      `- [${page.data.title}](${markdownUrl(page)})${page.data.description ? `: ${page.data.description}` : ''}`,
    )
  }

  return `${lines.join('\n')}\n`
}

/** `/llms-full.txt`: every page, one after the other. */
export async function llmsFull(): Promise<string> {
  const parts = [llmsIndex()]
  for (const page of source.getPages()) parts.push(`---\n\n${await pageMarkdown(page)}`)

  return parts.join('\n')
}
