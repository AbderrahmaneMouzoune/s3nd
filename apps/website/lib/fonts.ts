import localFont from 'next/font/local'

/**
 * Two families, both bundled under `app/fonts` (see the LICENSE there) so a
 * build never reaches for the network. Bricolage Grotesque carries the voice:
 * heavy, tight, a little unruly at display sizes. JetBrains Mono is every code,
 * every command and every sync code on the site.
 */
export const display = localFont({
  src: '../app/fonts/BricolageGrotesque-Variable.woff2',
  weight: '200 800',
  style: 'normal',
  variable: '--font-bricolage',
  display: 'swap',
})

export const mono = localFont({
  src: '../app/fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-jetbrains',
  display: 'swap',
})
