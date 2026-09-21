const KB = 1024
const MB = 1024 * KB

/** `284 kB`, `4 MB`, `41.2 MB`: the same units the CLI prints. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return ''
  if (bytes < KB) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / KB)} kB`

  const megabytes = bytes / MB
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`
}

/** `in 23 h`, `in 12 min`, `in 3 days`, or `expired`. */
export function formatExpiry(expiresAt: string | undefined, now = Date.now()): string {
  if (!expiresAt) return 'never expires'

  const seconds = Math.round((new Date(expiresAt).getTime() - now) / 1000)
  if (seconds <= 0) return 'expired'
  if (seconds < 90) return 'in a minute'
  if (seconds < 3600) return `in ${Math.round(seconds / 60)} min`
  if (seconds < 48 * 3600) return `in ${Math.round(seconds / 3600)} h`

  return `in ${Math.round(seconds / 86400)} days`
}

/** `K7QP 2M4X`: the way a code should be shown, so it can be read out loud. */
export function groupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join(' ') ?? code
}
