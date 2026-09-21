/**
 * The one place every URL the site links out to is written down. Change the
 * documentation domain here and every "Read the docs" link follows.
 */
export const site = {
  name: 's3nd',
  url: 'https://s3nd.sh',
  docsUrl: 'https://doc.s3nd.sh',
  /** Where the documentation app mounts its pages. `''` once it moves to the root. */
  docsPath: '/docs',
  tagline: 'Move data between devices with a code, through your own bucket.',
  description:
    "Move a local-first app's data, or a file from your terminal, from one device to another through your own S3 bucket. A TypeScript library, React hooks and a CLI, with a short code the user carries across. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.",
  author: 'Abderrahmane Mouzoune',
  github: {
    user: 'AbderrahmaneMouzoune',
    repo: 's3nd',
    branch: 'main',
  },
} as const

export const repositoryUrl = `https://github.com/${site.github.user}/${site.github.repo}`

/** A path inside the repository, on the default branch. */
export function github(path = ''): string {
  return path ? `${repositoryUrl}/tree/${site.github.branch}/${path.replace(/^\/+/, '')}` : repositoryUrl
}

/** A page of the documentation site: `docs('/quick-start')`. */
export function docs(path = ''): string {
  return `${site.docsUrl}${site.docsPath}${path}`
}

export function npm(packageName: string): string {
  return `https://www.npmjs.com/package/${packageName}`
}

export const packages = {
  s3nd: { name: 's3nd', install: 'npm install s3nd', npm: npm('s3nd'), source: github('packages/s3nd') },
  react: {
    name: '@s3nd/react',
    install: 'npm install @s3nd/react',
    npm: npm('@s3nd/react'),
    source: github('packages/react'),
  },
  cli: {
    name: '@s3nd/cli',
    install: 'npm install -g @s3nd/cli',
    npm: npm('@s3nd/cli'),
    source: github('packages/cli'),
  },
  protocol: {
    name: '@s3nd/protocol',
    install: 'npm install @s3nd/protocol',
    npm: npm('@s3nd/protocol'),
    source: github('packages/protocol'),
  },
} as const

export interface NavLink {
  label: string
  href: string
  external?: boolean
}

export const navigation: NavLink[] = [
  { label: 'Library', href: '/library' },
  { label: 'React', href: '/react' },
  { label: 'CLI', href: '/cli' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Examples', href: '/examples' },
  { label: 'Alternatives', href: '/alternatives' },
  { label: 'Docs', href: docs(), external: true },
]

export const footerColumns: { title: string; links: NavLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/how-it-works' },
      { label: 'The library', href: '/library' },
      { label: 'React hooks', href: '/react' },
      { label: 'The CLI', href: '/cli' },
      { label: 'Storage providers', href: '/providers' },
    ],
  },
  {
    title: 'Use cases',
    links: [
      { label: 'Move to a new device', href: '/use-cases/new-device' },
      { label: 'Continuous backup', href: '/use-cases/continuous-backup' },
      { label: 'End-to-end encrypted sync', href: '/use-cases/encrypted-sync' },
      { label: 'Attachments beside the data', href: '/use-cases/attachments' },
      { label: 'A file between two machines', href: '/use-cases/file-between-machines' },
      { label: 'Backups from CI', href: '/use-cases/ci-backups' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { label: 'All alternatives', href: '/alternatives' },
      { label: 'vs Magic Wormhole', href: '/alternatives/magic-wormhole' },
      { label: 'vs croc', href: '/alternatives/croc' },
      { label: 'vs WeTransfer', href: '/alternatives/wetransfer' },
      { label: 'vs Dexie Cloud', href: '/alternatives/dexie-cloud' },
      { label: 'vs PowerSync', href: '/alternatives/powersync' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: docs(), external: true },
      { label: 'Quick start', href: docs('/quick-start'), external: true },
      { label: 'API reference', href: docs('/api'), external: true },
      { label: 'Examples', href: '/examples' },
      { label: 'GitHub', href: repositoryUrl, external: true },
      { label: 'npm', href: npm('s3nd'), external: true },
    ],
  },
]
