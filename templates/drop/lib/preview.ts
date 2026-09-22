/**
 * What can be shown of a file, and how it may be served.
 *
 * Both sides read this: the browser, to decide what to render for a file the
 * sender has just picked or a receiver is about to download, and the preview
 * route, to decide what it is willing to serve inline at all.
 */

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none'

/** Extensions worth reading as text, for the many that carry no content type. */
const TEXT_EXTENSIONS = new Set([
  'c',
  'cfg',
  'conf',
  'cpp',
  'cs',
  'css',
  'csv',
  'env',
  'go',
  'graphql',
  'h',
  'ini',
  'java',
  'js',
  'json',
  'jsx',
  'kt',
  'log',
  'lua',
  'md',
  'mdx',
  'mjs',
  'php',
  'pl',
  'py',
  'rb',
  'rs',
  'sh',
  'sql',
  'svelte',
  'swift',
  'toml',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xml',
  'yaml',
  'yml',
  'zsh',
])

const KIND_BY_EXTENSION: Record<string, PreviewKind> = {
  avif: 'image',
  bmp: 'image',
  gif: 'image',
  heic: 'image',
  ico: 'image',
  jpeg: 'image',
  jpg: 'image',
  png: 'image',
  svg: 'image',
  webp: 'image',
  pdf: 'pdf',
  aac: 'audio',
  flac: 'audio',
  m4a: 'audio',
  mp3: 'audio',
  oga: 'audio',
  ogg: 'audio',
  opus: 'audio',
  wav: 'audio',
  mov: 'video',
  mp4: 'video',
  m4v: 'video',
  webm: 'video',
}

/** The extension of a filename, lowercased, or an empty string. */
export function extensionOf(filename: string | undefined): string {
  const last = filename?.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')

  return dot > 0 ? last.slice(dot + 1).toLowerCase() : ''
}

/** The bare content type, without the `; charset=…` a server may add. */
function bareType(contentType: string | undefined): string {
  return contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
}

/**
 * What a file can be shown as. The content type decides when there is one
 * worth trusting — a browser hands `File.type` over for most things — and the
 * extension answers for the rest, which is every text format there is.
 */
export function previewKind(contentType: string | undefined, filename?: string): PreviewKind {
  const type = bareType(contentType)
  const extension = extensionOf(filename)

  // `.ts` is a TypeScript file far more often than an MPEG transport stream,
  // and a `.md` is never markdown to a MIME table. The extension wins for
  // anything we know to be text.
  if (TEXT_EXTENSIONS.has(extension)) return 'text'

  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('text/')) return 'text'
  if (type === 'application/json' || type === 'application/xml' || /\+(json|xml)$/.test(type)) return 'text'

  return KIND_BY_EXTENSION[extension] ?? 'none'
}

/**
 * The content type the preview route is willing to answer with, or `null`
 * when a file is not to be rendered inline at all.
 *
 * This is the whole defence of that route: bytes someone else uploaded are
 * served from this origin, so anything that a browser would run as a document
 * — HTML above all — is handed back as plain text instead. Everything here
 * also goes out sandboxed, with sniffing turned off.
 */
export function inlinePreviewType(contentType: string | undefined, filename?: string): string | null {
  const type = bareType(contentType)

  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) return type
  if (type === 'application/pdf') return type
  if (previewKind(contentType, filename) === 'text') return 'text/plain; charset=utf-8'

  return null
}
