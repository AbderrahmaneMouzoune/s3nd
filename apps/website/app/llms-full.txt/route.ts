import { llmsFull } from '@/lib/markdown'

export const dynamic = 'force-static'

/** Every page of the site as Markdown, in one file. */
export function GET() {
  return new Response(llmsFull(), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
