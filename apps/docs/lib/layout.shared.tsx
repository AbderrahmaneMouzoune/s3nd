import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { appName, gitConfig, websiteUrl } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <span className="font-semibold tracking-tight">{appName}</span>,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      { text: 'Documentation', url: '/docs', active: 'nested-url' },
      { text: 'Use cases', url: '/docs/use-cases/new-device', active: 'nested-url' },
      { text: 'API', url: '/docs/api', active: 'nested-url' },
      { text: 'Website', url: websiteUrl, external: true },
    ],
  }
}
