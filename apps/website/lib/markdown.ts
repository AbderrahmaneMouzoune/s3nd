import { alternatives, alternativesIn, categories, categoryOrder, matrixDimensions, s3ndMatrix } from './alternatives'
import { examples, guides } from './examples'
import { faq } from './faq'
import { localeNames, localePath, locales, type Locale } from './i18n/config'
import { getDictionary } from './i18n'
import { markdownPath } from './metadata'
import { providers } from './providers'
import { samples } from './samples'
import { docs, dropTemplate, packages, repositoryUrl, site } from './site'
import { useCases } from './use-cases'

/**
 * The pages, as Markdown. Agents and language models read this through
 * `/<path>.md`, `Accept: text/markdown`, `/llms.txt` and `/llms-full.txt`;
 * it is assembled from the same dictionaries, data and code samples as the
 * HTML, so the two never disagree.
 */

const absolute = (locale: Locale, href: string) =>
  href.startsWith('http') ? href : `${site.url}${localePath(locale, href)}`

/** Dictionary markup to Markdown: backticks stay, `[label](href)` gets an absolute URL. */
const text = (locale: Locale, value: string) =>
  value.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, href: string) => `[${label}](${absolute(locale, href)})`,
  )

const fence = (code: string, lang = '') => `\`\`\`${lang}\n${code}\n\`\`\``
const h2 = (title: string) => `## ${title}`
const h3 = (title: string) => `### ${title}`
const cards = (locale: Locale, items: { title: string; body: string }[]) =>
  items.map((item) => `- **${text(locale, item.title)}** — ${text(locale, item.body)}`).join('\n')
const links = (locale: Locale, items: { label: string; href: string }[]) =>
  items.map((item) => `- [${item.label}](${absolute(locale, item.href)})`).join('\n')
const terms = (items: { term: string; body: string }[]) =>
  items.map((item) => `- \`${item.term}\`: ${item.body}`).join('\n')
const facts = (items: { label: string; value: string }[]) =>
  items.map((item) => `- **${item.label}**: ${item.value}`).join('\n')

export interface MarkdownPage {
  title: string
  description: string
  /** Without the locale: `/cli`. */
  path: string
  body: string
}

function header(locale: Locale, page: MarkdownPage): string {
  const others = locales
    .filter((other) => other !== locale)
    .map((other) => `${localeNames[other]}: ${site.url}${localePath(other, page.path)}`)

  return [
    `# ${page.title}`,
    '',
    `> ${page.description}`,
    '',
    `Canonical: ${site.url}${localePath(locale, page.path)} · Markdown: ${site.url}${markdownPath(locale, page.path)} · ${others.join(' · ')}`,
    '',
  ].join('\n')
}

function home(locale: Locale): MarkdownPage {
  const t = getDictionary(locale)
  const cases = useCases(locale)
  const body = [
    h2(t.home.how.title),
    t.home.how.lead,
    '',
    ...t.home.how.steps.map((step) => `- **${step.stamp}** — ${step.title} ${step.body} [${step.label}](${step.href})`),
    '',
    h2(t.home.waysIn.title),
    t.home.waysIn.lead,
    '',
    h3(`${t.home.waysIn.terminal.title} (${packages.cli.name})`),
    text(locale, t.home.waysIn.terminal.body),
    '',
    fence(samples.home.CLI_SAMPLE, 'sh'),
    '',
    h3(`${t.home.waysIn.app.title} (${packages.s3nd.name}, ${packages.react.name})`),
    text(locale, t.home.waysIn.app.body),
    '',
    fence(samples.home.APP_SAMPLE, 'ts'),
    '',
    h3(`${t.home.waysIn.http.title} (${packages.protocol.name})`),
    text(locale, t.home.waysIn.http.body),
    '',
    fence(samples.home.CURL_SAMPLE, 'sh'),
    '',
    h2(t.home.bucket.title),
    t.home.bucket.lead,
    '',
    facts(t.home.bucket.facts),
    '',
    links(
      locale,
      providers(locale).map((provider) => ({
        label: `${provider.name}: ${provider.tagline}`,
        href: `/providers/${provider.slug}`,
      })),
    ),
    '',
    h2(t.home.codes.title),
    t.home.codes.lead,
    '',
    ...t.home.codes.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    links(locale, t.home.codes.links),
    '',
    h2(t.home.appState.title),
    t.home.appState.lead,
    '',
    fence(samples.home.SNAPSHOT_SAMPLE, 'ts'),
    '',
    cards(locale, t.home.appState.cards),
    '',
    h2(t.home.useCases.title),
    h3(t.home.useCases.files),
    links(
      locale,
      cases
        .filter((useCase) => useCase.kind === 'files')
        .map((useCase) => ({ label: `${useCase.title}: ${useCase.summary}`, href: `/use-cases/${useCase.slug}` })),
    ),
    '',
    h3(t.home.useCases.appState),
    links(
      locale,
      cases
        .filter((useCase) => useCase.kind === 'app-state')
        .map((useCase) => ({ label: `${useCase.title}: ${useCase.summary}`, href: `/use-cases/${useCase.slug}` })),
    ),
    '',
    h2(t.home.compare.title),
    t.home.compare.lead,
    '',
    links(
      locale,
      alternatives(locale).map((alternative) => ({
        label: `${t.home.compare.vs} ${alternative.name}: ${alternative.headline}`,
        href: `/alternatives/${alternative.slug}`,
      })),
    ),
    '',
    h2(t.home.faq.title),
    ...faq(locale).flatMap((entry) => [
      h3(entry.question),
      entry.link ? `${entry.answer} [${entry.link.label}](${absolute(locale, entry.link.href)})` : entry.answer,
      '',
    ]),
  ]

  return {
    title: `${site.name} · ${t.site.tagline}`,
    description: t.site.description,
    path: '/',
    body: body.join('\n'),
  }
}

function howItWorks(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).howItWorks
  const s = samples.howItWorks
  const body = [
    t.lead,
    '',
    h2(t.transfer.title),
    t.transfer.lead,
    '',
    `**${t.transfer.fileTitle}**`,
    fence(s.FILE_OBJECT, 'text'),
    `**${t.transfer.snapshotTitle}**`,
    fence(s.SNAPSHOT_ENVELOPE, 'jsonc'),
    '',
    cards(
      locale,
      t.transfer.cards.map((card) => ({ title: card.stamp, body: card.body })),
    ),
    links(locale, t.transfer.links),
    '',
    h2(t.codes.title),
    t.codes.lead,
    '',
    cards(locale, t.codes.cards),
    links(locale, t.codes.links),
    '',
    h2(t.protocol.title),
    t.protocol.lead,
    '',
    `**${t.protocol.routesTitle}**`,
    fence(s.ROUTES, 'text'),
    `**${t.protocol.clientTitle}**`,
    fence(s.CLIENT, 'ts'),
    '',
    ...t.protocol.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    `[${t.protocol.link}](${docs('/protocol')})`,
    '',
    h2(t.writers.title),
    t.writers.lead,
    '',
    fence(s.CONDITIONAL, 'ts'),
    '',
    text(locale, t.writers.body),
    '',
    `[${t.writers.link}](${docs('/two-devices')})`,
    '',
    h2(t.packages.title),
    t.packages.lead,
    '',
    ...t.packages.items.map((item) => `- **${item.name}** (${item.role}; ${item.deps}) — ${item.body}`),
    '',
    facts(t.packages.facts),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/how-it-works', body: body.join('\n') }
}

function cli(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).cli
  const s = samples.cli
  const body = [
    t.lead,
    '',
    fence(packages.cli.install, 'sh'),
    fence(s.PUT_GET, 'sh'),
    '',
    h2(t.initDoctor.title),
    t.initDoctor.lead,
    '',
    `**${t.initDoctor.initTitle}**`,
    fence(s.INIT, 'sh'),
    `**${t.initDoctor.doctorTitle}**`,
    fence(s.DOCTOR, 'sh'),
    '',
    text(locale, t.initDoctor.body),
    '',
    h2(t.config.title),
    t.config.lead,
    '',
    `**s3nd.config.json**`,
    fence(s.CONFIG_FILE, 'json'),
    fence(s.PROFILES, 'sh'),
    '',
    text(locale, t.config.body),
    '',
    h2(t.remote.title),
    t.remote.lead,
    '',
    fence(s.REMOTE, 'sh'),
    '',
    ...t.remote.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    `[${t.remote.link}](${docs('/server')})`,
    '',
    h2(t.reference.title),
    h3(t.reference.commandsTitle),
    terms(t.reference.commands),
    '',
    h3(t.reference.optionsTitle),
    terms(t.reference.options),
    '',
    text(locale, t.reference.body),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/cli', body: body.join('\n') }
}

function library(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).library
  const s = samples.library
  const body = [
    t.lead,
    '',
    fence(packages.s3nd.install, 'sh'),
    fence(s.HERO, 'ts'),
    '',
    h2(t.files.title),
    t.files.lead,
    '',
    fence(s.FILES, 'ts'),
    '',
    ...t.files.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    h2(t.handler.title),
    t.handler.lead,
    '',
    `**${t.handler.titles.next}**`,
    fence(s.HANDLER, 'ts'),
    `**${t.handler.titles.hono}**`,
    fence(s.HONO, 'ts'),
    `**${t.handler.titles.bun}**`,
    fence(s.BUN, 'ts'),
    '',
    text(locale, t.handler.body),
    '',
    h2(t.snapshots.title),
    t.snapshots.lead,
    '',
    fence(s.SNAPSHOT, 'ts'),
    '',
    cards(locale, t.snapshots.cards),
    '',
    h2(t.conditional.title),
    t.conditional.lead,
    '',
    fence(s.CONDITIONAL, 'ts'),
    '',
    ...t.conditional.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    h2(t.errors.title),
    t.errors.lead,
    '',
    fence(s.ERRORS, 'ts'),
    '',
    terms(t.errors.codes),
    '',
    h2(t.config.title),
    t.config.lead,
    '',
    fence(s.CONFIG, 'ts'),
    '',
    ...t.config.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/library', body: body.join('\n') }
}

function react(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).react
  const s = samples.react
  const body = [
    t.lead,
    '',
    fence(packages.react.install, 'sh'),
    `**${t.providerTitle}**`,
    fence(s.PROVIDER, 'tsx'),
    '',
    h2(t.sending.title),
    t.sending.lead,
    '',
    fence(s.SEND_FILE, 'tsx'),
    '',
    ...t.sending.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    h2(t.receiving.title),
    t.receiving.lead,
    '',
    fence(s.RECEIVE_FILE, 'tsx'),
    '',
    h2(t.input.title),
    t.input.lead,
    '',
    ...t.input.paragraphs.map((paragraph) => `${text(locale, paragraph)}\n`),
    h2(t.appState.title),
    t.appState.lead,
    '',
    fence(s.SEND_STATE, 'ts'),
    '',
    t.appState.body,
    '',
    h2(t.guarantees.title),
    t.guarantees.lead,
    '',
    cards(locale, t.guarantees.cards),
    '',
    terms(t.guarantees.hooks),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/react', body: body.join('\n') }
}

function examplesPage(locale: Locale): MarkdownPage {
  const d = getDictionary(locale)
  const t = d.examples
  const body = [
    t.lead,
    '',
    `**${t.minioTitle}**`,
    fence(samples.examples.MINIO, 'sh'),
    '',
    ...examples(locale).flatMap((example) => [
      h2(`${example.title} (examples/${example.slug})`),
      example.summary,
      '',
      ...example.shows.map((item) => `- ${item}`),
      '',
      `${d.ui.sourceOnGithub}: ${example.source}`,
      '',
      fence(example.run, 'sh'),
      ...(example.slug === 'node-script' ? [`**${d.ui.expectedOutput}**`, fence(samples.examples.OUTPUT, 'text')] : []),
      '',
    ]),
    h2(t.guides.title),
    t.guides.lead,
    '',
    links(
      locale,
      guides(locale).map((guide) => ({ label: `${guide.title}: ${guide.summary}`, href: guide.href })),
    ),
    '',
    h2(t.tryIt.title),
    ...t.tryIt.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    fence(
      'npx @s3nd/cli init --provider minio --bucket transfers\nnpx @s3nd/cli doctor\nnpx @s3nd/cli put ./anything.pdf\nnpx @s3nd/cli get k7qp-2m4x',
      'sh',
    ),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/examples', body: body.join('\n') }
}

function useCasesIndex(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).useCases
  const cases = useCases(locale)
  const list = (kind: 'files' | 'app-state') =>
    links(
      locale,
      cases
        .filter((useCase) => useCase.kind === kind)
        .map((useCase) => ({ label: `${useCase.title}: ${useCase.summary}`, href: `/use-cases/${useCase.slug}` })),
    )
  const body = [
    t.lead,
    '',
    h2(t.files.title),
    t.files.lead,
    '',
    list('files'),
    '',
    h2(t.appState.title),
    t.appState.lead,
    '',
    list('app-state'),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/use-cases', body: body.join('\n') }
}

function useCaseDetail(locale: Locale, slug: string): MarkdownPage | null {
  const useCase = useCases(locale).find((candidate) => candidate.slug === slug)
  if (!useCase) return null
  const t = getDictionary(locale).useCases.detail
  const body = [
    useCase.summary,
    '',
    fence(useCase.code.source, useCase.code.lang),
    '',
    h2(t.situation.title),
    h3(t.situation.problem),
    useCase.problem,
    '',
    h3(t.situation.approach),
    useCase.approach,
    '',
    h2(t.watch.title),
    cards(locale, useCase.watch),
    '',
    `Packages: ${useCase.packages.join(', ')}. [${useCase.guide.label}](${useCase.guide.href})`,
  ]

  return {
    title: useCase.title,
    description: `${useCase.summary} ${t.metaSuffix}`,
    path: `/use-cases/${slug}`,
    body: body.join('\n'),
  }
}

function providersIndex(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).providers
  const body = [
    t.lead,
    '',
    fence(samples.providers.ENDPOINT, 'ts'),
    '',
    h2(t.pick.title),
    links(
      locale,
      providers(locale).map((provider) => ({
        label: `${provider.name} (s3nd init --provider ${provider.initName}): ${provider.tagline}`,
        href: `/providers/${provider.slug}`,
      })),
    ),
    '',
    text(locale, t.notListed),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/providers', body: body.join('\n') }
}

function providerDetail(locale: Locale, slug: string): MarkdownPage | null {
  const provider = providers(locale).find((candidate) => candidate.slug === slug)
  if (!provider) return null
  const d = getDictionary(locale)
  const t = d.providers.detail
  const body = [
    provider.tagline,
    '',
    `**createBucket()**`,
    fence(provider.library, 'ts'),
    '',
    h2(t.why),
    provider.description,
    '',
    h2(t.cli.title),
    t.cli.lead,
    '',
    fence(`s3nd init --provider ${provider.initName} --bucket transfers`, 'sh'),
    `**s3nd.config.json**`,
    fence(provider.config, 'json'),
    '',
    h3(d.ui.then),
    ...provider.next.map((step, index) => `${index + 1}. ${step}`),
    `${provider.next.length + 1}. ${text(locale, t.cli.doctor)}`,
    '',
    h2(t.notes.title(provider.short)),
    cards(locale, provider.notes),
    '',
    `[${t.notes.link}](${provider.docsHref})`,
  ]

  return {
    title: `${t.titlePrefix} ${provider.name}`,
    description: t.metaDescription(provider.name),
    path: `/providers/${slug}`,
    body: body.join('\n'),
  }
}

function alternativesIndex(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).alternatives
  const cats = categories(locale)
  const body = [
    t.lead,
    '',
    ...categoryOrder.flatMap((category) => [
      h2(cats[category].title),
      cats[category].blurb,
      '',
      links(
        locale,
        alternativesIn(locale, category).map((alternative) => ({
          label: `${t.vs} ${alternative.name}: ${alternative.headline}`,
          href: `/alternatives/${alternative.slug}`,
        })),
      ),
      '',
    ]),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/alternatives', body: body.join('\n') }
}

function alternativeDetail(locale: Locale, slug: string): MarkdownPage | null {
  const alternative = alternatives(locale).find((candidate) => candidate.slug === slug)
  if (!alternative) return null
  const t = getDictionary(locale).alternatives
  const ours = s3ndMatrix(locale)
  const body = [
    alternative.overlap,
    '',
    h2(t.detail.what.eyebrow(alternative.name)),
    alternative.what,
    '',
    `Website: ${alternative.website}`,
    '',
    h2(t.detail.matrix.title),
    `| | s3nd | ${alternative.name} |`,
    '| --- | --- | --- |',
    ...matrixDimensions(locale).map(
      (dimension) => `| ${dimension.label} | ${ours[dimension.key]} | ${alternative.matrix[dimension.key]} |`,
    ),
    '',
    h2(t.detail.differences.title),
    cards(locale, alternative.differences),
    '',
    h2(t.detail.decision.title),
    h3(t.detail.decision.pickThem(alternative.name)),
    ...alternative.pickThem.map((item) => `- ${item}`),
    '',
    h3(t.detail.decision.pickS3nd),
    ...alternative.pickS3nd.map((item) => `- ${item}`),
  ]

  return {
    title: `${t.vs} ${alternative.name}`,
    description: t.detail.metaDescription(alternative.name, alternative.headline),
    path: `/alternatives/${slug}`,
    body: body.join('\n'),
  }
}

function drop(locale: Locale): MarkdownPage {
  const t = getDictionary(locale).drop
  const body = [
    t.lead,
    '',
    `- ${t.primary}: ${dropTemplate.deployUrl}`,
    `- ${t.secondary}: ${dropTemplate.source}`,
    `- ${t.tertiary}: ${dropTemplate.live}`,
    '',
    h2(t.what.title),
    t.what.lead,
    '',
    cards(locale, t.what.cards),
    '',
    h2(t.setup.title),
    t.setup.lead,
    '',
    `**${t.setup.envTitle}**`,
    fence(samples.drop.ENV, 'sh'),
    '',
    ...t.setup.steps.map((step, index) => `${index + 1}. ${text(locale, step)}`),
    '',
    h2(t.limits.title),
    cards(locale, t.limits.cards),
  ]

  return { title: t.metaTitle, description: t.metaDescription, path: '/drop', body: body.join('\n') }
}

const staticPages: Record<string, (locale: Locale) => MarkdownPage> = {
  '/': home,
  '/how-it-works': howItWorks,
  '/cli': cli,
  '/library': library,
  '/react': react,
  '/examples': examplesPage,
  '/use-cases': useCasesIndex,
  '/providers': providersIndex,
  '/alternatives': alternativesIndex,
  '/drop': drop,
}

/** One page as Markdown, or null when no page lives at that path. */
export function markdownFor(locale: Locale, path: string): string | null {
  let page: MarkdownPage | null = null

  if (path in staticPages) page = staticPages[path](locale)
  else if (path.startsWith('/use-cases/')) page = useCaseDetail(locale, path.slice('/use-cases/'.length))
  else if (path.startsWith('/providers/')) page = providerDetail(locale, path.slice('/providers/'.length))
  else if (path.startsWith('/alternatives/')) page = alternativeDetail(locale, path.slice('/alternatives/'.length))

  return page ? `${header(locale, page)}\n${page.body}\n` : null
}

/** Every path that has a Markdown twin, without the locale. */
export function markdownPaths(locale: Locale): string[] {
  return [
    ...Object.keys(staticPages),
    ...useCases(locale).map((useCase) => `/use-cases/${useCase.slug}`),
    ...providers(locale).map((provider) => `/providers/${provider.slug}`),
    ...alternatives(locale).map((alternative) => `/alternatives/${alternative.slug}`),
  ]
}

/** `/llms.txt`: what the site is, and where every page is, in every language. */
export function llmsIndex(): string {
  const en = getDictionary('en')
  const lines = [
    `# ${site.name}`,
    '',
    `> ${en.site.tagline} ${en.site.description}`,
    '',
    `s3nd is a CLI (${packages.cli.name}), a TypeScript library (${packages.s3nd.name}), React hooks (${packages.react.name}) and a wire protocol (${packages.protocol.name}) for moving a file, a folder or an application's state between machines with an eight-character code, through an S3-compatible bucket the user owns. Every page below also exists as Markdown at the \`.md\` URL, or by asking for \`text/markdown\`. The full text of every page is at ${site.url}/llms-full.txt.`,
    '',
    `- Repository: ${repositoryUrl}`,
    `- Documentation: ${docs()} (its own map: ${site.docsUrl}/llms.txt)`,
    `- Live drop box: ${dropTemplate.live}`,
    '',
  ]

  for (const locale of locales) {
    const t = getDictionary(locale)
    const entry = (path: string, label: string, note?: string) =>
      `- [${label}](${site.url}${markdownPath(locale, path)})${note ? `: ${note}` : ''}`

    lines.push(`## ${localeNames[locale]}`, '')
    lines.push(entry('/', `${site.name}`, t.site.tagline))
    lines.push(entry('/how-it-works', t.howItWorks.metaTitle, t.howItWorks.metaDescription))
    lines.push(entry('/cli', t.cli.metaTitle, t.cli.metaDescription))
    lines.push(entry('/library', t.library.metaTitle, t.library.metaDescription))
    lines.push(entry('/react', t.react.metaTitle, t.react.metaDescription))
    lines.push(entry('/providers', t.providers.metaTitle, t.providers.metaDescription))
    lines.push(entry('/examples', t.examples.metaTitle, t.examples.metaDescription))
    lines.push(entry('/drop', t.drop.metaTitle, t.drop.metaDescription))
    lines.push('', `### ${t.useCases.metaTitle}`, '')
    lines.push(entry('/use-cases', t.useCases.metaTitle, t.useCases.metaDescription))
    for (const useCase of useCases(locale))
      lines.push(entry(`/use-cases/${useCase.slug}`, useCase.title, useCase.summary))
    lines.push('', `### ${t.providers.metaTitle}`, '')
    for (const provider of providers(locale))
      lines.push(entry(`/providers/${provider.slug}`, provider.name, provider.tagline))
    lines.push('', `### ${t.alternatives.metaTitle}`, '')
    lines.push(entry('/alternatives', t.alternatives.metaTitle, t.alternatives.metaDescription))
    for (const alternative of alternatives(locale)) {
      lines.push(
        entry(`/alternatives/${alternative.slug}`, `${t.alternatives.vs} ${alternative.name}`, alternative.headline),
      )
    }
    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

/** `/llms-full.txt`: every page, in every language, one after the other. */
export function llmsFull(): string {
  const parts: string[] = [llmsIndex()]

  for (const locale of locales) {
    for (const path of markdownPaths(locale)) {
      const page = markdownFor(locale, path)
      if (page) parts.push(`---\n\n${page}`)
    }
  }

  return parts.join('\n')
}
