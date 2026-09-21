import { llmsIndex } from '@/lib/markdown'

export const dynamic = 'force-static'

/** The map of the documentation written for language models: https://llmstxt.org. */
export function GET() {
  return new Response(llmsIndex(), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
