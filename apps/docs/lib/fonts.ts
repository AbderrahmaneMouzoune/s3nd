import localFont from 'next/font/local'

/**
 * The two families the website uses, bundled under `app/fonts` (see the
 * LICENSE there) so a build never reaches for the network. Bricolage Grotesque
 * for the words, JetBrains Mono for code, commands and sync codes.
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
