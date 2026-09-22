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

/**
 * `2 d 04 h`, `23 h 14 m`, `04 m 09 s`: the time left, in the two units that
 * matter at that distance, for a display that ticks.
 */
export function formatCountdown(expiresAt: string | undefined, now = Date.now()): string {
  if (!expiresAt) return 'no expiry'

  const total = Math.round((new Date(expiresAt).getTime() - now) / 1000)
  if (total <= 0) return 'expired'

  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  if (days > 0) return `${days} d ${pad(hours)} h`
  if (hours > 0) return `${hours} h ${pad(minutes)} m`

  return `${pad(minutes)} m ${pad(seconds)} s`
}

/** `22 Sep 2026, 14:02`, in whatever locale and zone the reader is in. */
export function formatMoment(iso: string | undefined): string {
  if (!iso) return ''

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** `K7QP 2M4X`: the way a code should be shown, so it can be read out loud. */
export function groupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join(' ') ?? code
}
