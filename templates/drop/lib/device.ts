'use client'

/**
 * A name for the machine doing the sending, so the other end sees "Chrome on
 * macOS" beside the file rather than a bare code. It is a guess, and the
 * sender can overwrite it before sending; nothing is read that a page would
 * not already know about its own browser.
 */

interface UserAgentData {
  platform?: string
  brands?: { brand: string; version: string }[]
  mobile?: boolean
}

const PLATFORMS: [RegExp, string][] = [
  [/iphone/i, 'iPhone'],
  [/ipad/i, 'iPad'],
  [/android/i, 'Android'],
  [/mac os x|macintosh/i, 'macOS'],
  [/windows/i, 'Windows'],
  [/cros/i, 'ChromeOS'],
  [/linux/i, 'Linux'],
]

const BROWSERS: [RegExp, string][] = [
  [/edg\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/firefox|fxios/i, 'Firefox'],
  [/chrome|crios/i, 'Chrome'],
  [/safari/i, 'Safari'],
]

function match(pairs: [RegExp, string][], value: string): string | undefined {
  return pairs.find(([pattern]) => pattern.test(value))?.[1]
}

export function guessDevice(): string {
  if (typeof navigator === 'undefined') return ''

  const agent = navigator.userAgent
  const hints = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData

  const platform =
    match(PLATFORMS, agent) ?? (hints?.platform ? hints.platform : undefined) ?? (hints?.mobile ? 'a phone' : undefined)

  // The brand list puts the real browser last, behind whatever fiction it
  // ships to keep sniffers happy.
  const brand = hints?.brands?.filter(({ brand: name }) => !/not.*brand|chromium/i.test(name)).at(-1)?.brand
  const browser = brand ?? match(BROWSERS, agent)

  if (browser && platform) return `${browser} on ${platform}`

  return browser ?? platform ?? ''
}
