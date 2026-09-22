/**
 * The one place every URL the site links out to is written down. Change the
 * documentation domain here and every "Read the docs" link follows.
 */
export const site = {
  name: 's3nd',
  /** The domain, as the wordmark writes it: `s3nd` and a quieter `.sh`. */
  domain: 's3nd.sh',
  url: 'https://s3nd.sh',
  docsUrl: 'https://doc.s3nd.sh',
  /** Where the documentation app mounts its pages. `''` once it moves to the root. */
  docsPath: '/docs',
  tagline: 'Send anything with a code, through your own bucket.',
  description:
    "Send a file, a folder or an app's data from one machine to another with an eight-character code, through an S3 bucket you own. A CLI, a TypeScript library and React hooks. No account, no relay, nothing to deploy. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.",
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
  s3nd: {
    name: '@s3nd/core',
    install: 'npm install @s3nd/core',
    npm: npm('@s3nd/core'),
    source: github('packages/s3nd'),
  },
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

/**
 * The one-click template: a small WeTransfer on your own bucket, deployed
 * from the repository to Vercel with the environment variables it needs.
 */
export const dropTemplate = {
  path: 'templates/drop',
  source: github('templates/drop'),
  /** The template, deployed: a drop box anyone can try. */
  live: 'https://drop.s3nd.sh',
  deployUrl: (() => {
    const params = new URLSearchParams({
      'repository-url': `${repositoryUrl}/tree/${site.github.branch}/templates/drop`,
      'project-name': 's3nd-drop',
      'repository-name': 's3nd-drop',
      env: 'S3ND_BUCKET,S3ND_ENDPOINT,S3ND_REGION,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY',
      envDescription:
        'An S3-compatible bucket and a key pair scoped to it. R2, S3, MinIO, Scaleway and Wasabi all work.',
      envLink: `${site.url}/providers`,
    })

    return `https://vercel.com/new/clone?${params.toString()}`
  })(),
} as const
