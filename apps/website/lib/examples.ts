import type { Locale } from './i18n/config'
import { docs, github } from './site'

export interface Example {
  slug: string
  title: string
  summary: string
  /** What the reader learns from it. */
  shows: string[]
  run: string
  source: string
  stack: string[]
}

export interface Guide {
  title: string
  href: string
  summary: string
}

const base = [
  {
    slug: 'indexeddb-sync',
    title: 'IndexedDB sync',
    run: 'cp .env.example .env.local\nbun install\nbun run dev   # localhost:3200, in two different browsers',
    source: github('examples/indexeddb-sync'),
    stack: ['Next.js', 'IndexedDB', 's3nd', 'MinIO'],
  },
  {
    slug: 'node-script',
    title: 'Node round trip',
    run: 'cp .env.example .env\nbun install\nnode --env-file=.env --import tsx src/round-trip.ts',
    source: github('examples/node-script'),
    stack: ['Node', 'TypeScript', 's3nd'],
  },
] as const

type ExampleSlug = (typeof base)[number]['slug']

interface ExampleCopy {
  title: string
  summary: string
  shows: string[]
}

const copy: Record<Locale, Record<ExampleSlug, ExampleCopy>> = {
  en: {
    'indexeddb-sync': {
      title: 'IndexedDB sync',
      summary:
        'A notes app that keeps everything in IndexedDB and moves it to another device with a code. Open it in two browsers: the second one is empty until the code carries the database across.',
      shows: [
        'A complete exportDatabase / importDatabase pair against a real object store',
        'The code shown grouped in fours, and normalized on the server with or without the spaces',
        'Nothing imported before the user confirms what they are about to restore',
        'ifAbsent on write, a one-hour expiry, and the DELETE after a successful import',
        'A single transaction on import, so a failure halfway leaves the previous data intact',
      ],
    },
    'node-script': {
      title: 'Node round trip',
      summary:
        'A whole transfer in one file: write a snapshot under a code, read it back through a sloppily typed version of that code, prove the conditional writes work, then burn it. A smoke test for a new bucket or provider.',
      shows: [
        'The compression ratio on a realistic dump, printed as the headline',
        'A code typed in lowercase with a dash, resolved by codes.normalize()',
        'ifAbsent rejecting a second claim, ifMatch rejecting a stale write',
        'destroy() in a finally, so the script exits without waiting on keep-alive sockets',
      ],
    },
  },
  fr: {
    'indexeddb-sync': {
      title: 'Synchronisation IndexedDB',
      summary:
        'Une app de notes qui garde tout dans IndexedDB et le déplace vers un autre appareil avec un code. Ouvrez-la dans deux navigateurs : le second est vide jusqu’à ce que le code transporte la base.',
      shows: [
        'Une paire exportDatabase / importDatabase complète contre un vrai object store',
        'Le code affiché groupé par quatre, et normalisé côté serveur avec ou sans les espaces',
        'Rien n’est importé avant que l’utilisateur confirme ce qu’il s’apprête à restaurer',
        'ifAbsent à l’écriture, une expiration d’une heure, et le DELETE après un import réussi',
        'Une seule transaction à l’import, pour qu’un échec à mi-chemin laisse les données précédentes intactes',
      ],
    },
    'node-script': {
      title: 'Aller-retour en Node',
      summary:
        'Un transfert entier dans un seul fichier : écrire un snapshot sous un code, le relire via une version mal tapée de ce code, prouver que les écritures conditionnelles fonctionnent, puis le brûler. Un smoke test pour un nouveau bucket ou fournisseur.',
      shows: [
        'Le taux de compression sur un dump réaliste, affiché en titre',
        'Un code tapé en minuscules avec un tiret, résolu par codes.normalize()',
        'ifAbsent qui rejette une seconde réservation, ifMatch qui rejette une écriture périmée',
        'destroy() dans un finally, pour que le script sorte sans attendre les sockets keep-alive',
      ],
    },
  },
}

export function examples(locale: Locale): Example[] {
  return base.map((entry) => ({ ...entry, stack: [...entry.stack], ...copy[locale][entry.slug] }))
}

const guideBase = [
  { key: 'newDevice', href: docs('/use-cases/new-device') },
  { key: 'continuousBackup', href: docs('/use-cases/continuous-backup') },
  { key: 'encryptedSync', href: docs('/use-cases/encrypted-sync') },
  { key: 'attachments', href: docs('/use-cases/attachments') },
  { key: 'noServer', href: docs('/no-server') },
  { key: 'server', href: docs('/server') },
  { key: 'testing', href: docs('/testing') },
] as const

type GuideKey = (typeof guideBase)[number]['key']

const guideCopy: Record<Locale, Record<GuideKey, { title: string; summary: string }>> = {
  en: {
    newDevice: { title: 'Move to a new device', summary: 'Two routes, two calls, a confirmation step.' },
    continuousBackup: { title: 'Continuous backup', summary: 'One snapshot per account, conditional writes.' },
    encryptedSync: {
      title: 'End-to-end encrypted sync',
      summary: 'WebCrypto in the browser, ciphertext in the bucket.',
    },
    attachments: { title: 'Attachments beside the data', summary: 'Blobs as objects, references in the snapshot.' },
    noServer: { title: 'Without a server', summary: 'The CLI straight to Cloudflare R2, end to end.' },
    server: { title: 'Setting up a server', summary: 'Routes, authorization, expiry, CORS, smoke test.' },
    testing: { title: 'Testing', summary: 'A bucket in memory: no credentials, no network.' },
  },
  fr: {
    newDevice: {
      title: 'Migrer sur un nouvel appareil',
      summary: 'Deux routes, deux appels, une étape de confirmation.',
    },
    continuousBackup: {
      title: 'Sauvegarde continue',
      summary: 'Un snapshot par compte, des écritures conditionnelles.',
    },
    encryptedSync: {
      title: 'Synchronisation chiffrée de bout en bout',
      summary: 'WebCrypto dans le navigateur, du texte chiffré dans le bucket.',
    },
    attachments: {
      title: 'Des pièces jointes à côté des données',
      summary: 'Des blobs en objets, des références dans le snapshot.',
    },
    noServer: { title: 'Sans serveur', summary: 'La CLI directement vers Cloudflare R2, de bout en bout.' },
    server: { title: 'Mettre en place un serveur', summary: 'Routes, autorisation, expiration, CORS, smoke test.' },
    testing: { title: 'Tester', summary: 'Un bucket en mémoire : pas d’identifiants, pas de réseau.' },
  },
}

/** Worked, copy-pasteable guides that live in the documentation. */
export function guides(locale: Locale): Guide[] {
  return guideBase.map((entry) => ({ href: entry.href, ...guideCopy[locale][entry.key] }))
}
