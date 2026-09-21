import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { Wordmark } from '@/components/wordmark'

import { gitConfig, websiteUrl } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="group flex items-center gap-2.5">
          <Wordmark className="text-lg" />
          <span className="border-accent text-accent rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">
            docs
          </span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    themeSwitch: { enabled: false },
    links: [
      { text: 'Documentation', url: '/docs', active: 'nested-url' },
      { text: 'Use cases', url: '/docs/use-cases/new-device', active: 'nested-url' },
      { text: 'API', url: '/docs/api', active: 'nested-url' },
      { text: 'Website', url: websiteUrl, external: true },
      { text: 'Deploy a drop box', url: `${websiteUrl}/drop`, external: true },
    ],
  }
}
