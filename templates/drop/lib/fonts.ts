import localFont from 'next/font/local'

/** Bundled under `app/fonts` (SIL Open Font License, see the LICENSE there), so a build never reaches for the network. */
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
