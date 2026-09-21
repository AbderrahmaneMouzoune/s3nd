import { llmsFull } from '@/lib/markdown'

export const dynamic = 'force-static'

/** Every page of the documentation as Markdown, in one file. */
export async function GET() {
  return new Response(await llmsFull(), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
