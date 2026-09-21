import { CodeBlock, Command } from '@/components/code-block'
import { Cta } from '@/components/cta'
import { PageHero } from '@/components/page-hero'
import { ButtonLink, Card, Section, TextLink } from '@/components/ui'
import { pageMetadata } from '@/lib/metadata'
import { docs, packages } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'The CLI',
  description:
    'The s3nd command line: move a file between machines with a code, check that a bucket is actually set up to hold transfers, and keep the settings in a committable file instead of your shell history. Straight to S3 or through your own server.',
  path: '/cli',
  keywords: ['send file between computers cli', 's3 file transfer command line', 'cli file transfer code', 's3nd cli'],
})

const INIT = `$ s3nd init --provider r2 --bucket transfers
Wrote /home/you/transfers/s3nd.config.json

Put the three values in .env, and keep it out of git:
  R2_ACCOUNT_ID=…
  R2_ACCESS_KEY_ID=…
  R2_SECRET_ACCESS_KEY=…
The R2 API token needs Object Read & Write on this bucket, and nothing else.
Give the bucket a lifecycle rule that deletes objects under "transfers/" after a day or two.
Run \`s3nd doctor\` — it performs the operations s3nd needs and reports what happened.`

const DOCTOR = `$ s3nd doctor
Using /home/you/transfers/s3nd.config.json
✓ Configuration: bucket "transfers", region "auto"
✓ Credentials: resolved, key ends in 1a2b
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no enabled expiration rule
  → Add an S3 lifecycle rule that expires objects under this bucket after a day or
    two. Without it, expired transfers stay stored and billed.

1 check(s) failed.`

const PUT_GET = `$ s3nd put ./report.pdf
report.pdf · 284 kB · expires in 1 day
K7QP2M4X

$ CODE=$(s3nd put ./report.pdf)          # the code is stdout, the rest is stderr
$ tar cz ./project | s3nd put - --name project.tar.gz

# on the other machine
$ s3nd get K7QP2M4X
Wrote /home/you/report.pdf · 284 kB

$ s3nd get K7QP2M4X -o -  | less        # or to stdout
$ s3nd rm K7QP2M4X
Burned K7QP2M4X`

const CONFIG_FILE = `{
  "envFile": ".env",
  "profiles": {
    "r2": {
      "bucket": "transfers",
      "region": "auto",
      "endpoint": "https://\${R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
      "expiresIn": "24h",
      "credentials": { "accessKeyId": "\${R2_ACCESS_KEY_ID}", "secretAccessKey": "\${R2_SECRET_ACCESS_KEY}" }
    },
    "local": { "bucket": "transfers", "endpoint": "http://localhost:9000" },
    "prod":  { "remote": "https://drop.example.com/api/transfers", "token": "\${S3ND_TOKEN}" }
  }
}`

const PROFILES = `$ s3nd -p local doctor          # against a MinIO container, offline
$ s3nd -p r2 put ./report.pdf
$ s3nd -p prod put ./report.pdf # through your server, with a token

$ s3nd config                   # which value won, and where it came from
file         /home/you/transfers/s3nd.config.json (profile "r2")
mode         straight to S3
bucket       transfers                                 $S3ND_BUCKET
endpoint     https://8c4….r2.cloudflarestorage.com     s3nd.config.json (r2)
credentials  …1a2b                                     s3nd.config.json (r2)
expires in   1 day                                     s3nd.config.json (r2)`

const REMOTE = `$ s3nd --remote https://drop.example.com/api/transfers --token "$TOKEN" put ./report.pdf
K7QP2M4X

$ s3nd doctor --remote https://drop.example.com/api/transfers --token "$TOKEN"
✓ Server: https://drop.example.com/api/transfers answered
✓ Create, read, delete: round-tripped code 8WTXQC8R`

const COMMANDS: [string, string][] = [
  ['put <file>', 'Store a file and print the code to carry. "-" reads stdin'],
  ['get <code>', 'Fetch what a code points at, to the stored filename, -o, or stdout'],
  ['rm <code>', 'Burn a code'],
  ['doctor', 'Check this setup can actually store transfers. Exits non-zero when a check fails'],
  ['init', 'Write a starter s3nd.config.json for aws, r2, minio, scaleway, wasabi or remote'],
  ['config', 'Print the resolved configuration, and where each value came from'],
]

const OPTIONS: [string, string][] = [
  ['-c, --config', 'Configuration file to read'],
  ['-p, --profile', 'Profile to use inside it'],
  ['--env-file', 'Read KEY=value pairs from this file first'],
  ['--bucket, --prefix, --region, --endpoint', 'Bucket settings, overriding the file and the environment'],
  ['--expires-in', '3600, 30m, 24h, 7d, or never'],
  ['--remote, --token', 'Talk to a s3nd server instead of S3 directly'],
  ['--name', 'Filename to store the transfer under'],
  ['--json', 'Machine-readable output, for scripts and for doctor in CI'],
]

export default function CliPage() {
  return (
    <>
      <PageHero
        trail={[{ label: 'The CLI', href: '/cli' }]}
        eyebrow={packages.cli.name}
        title="A file between two machines, with a code."
        lead="Move a file with put and get, check that a bucket is actually set up to hold transfers with doctor, and keep the settings in a file you can commit. Straight to S3 with nothing deployed, or through your own server with a token."
        actions={
          <>
            <ButtonLink href={docs('/cli')} external>
              CLI reference
            </ButtonLink>
            <ButtonLink href={docs('/no-server')} variant="secondary" external>
              Without a server
            </ButtonLink>
            <ButtonLink href={packages.cli.npm} variant="ghost" external>
              npm
            </ButtonLink>
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Command>{packages.cli.install}</Command>
              <Command>npx @s3nd/cli doctor</Command>
            </div>
            <CodeBlock code={PUT_GET} lang="sh" />
          </div>
        }
      />

      <Section
        eyebrow="init and doctor"
        title="The command worth running first."
        lead="S3 misconfiguration fails late and vaguely. doctor performs the operations s3nd actually needs and reports what happened, rather than reading your policy and reasoning about it. The probe object is deleted before it returns."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={INIT} lang="sh" title="a starting point per provider" />
          <CodeBlock code={DOCTOR} lang="sh" title="and the check that earns the command" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          That last check is the one nobody discovers until a bill arrives. <code className="font-mono">expiresIn</code>{' '}
          stops a transfer being handed over; only a lifecycle rule deletes the object. Pointed at a server,{' '}
          <code className="font-mono">doctor</code> checks the one thing that matters there, a real round trip, and
          exits non-zero on failure, so it works as a deployment smoke test.
        </p>
      </Section>

      <Section
        eyebrow="Configuration"
        title="Committable settings, uncommittable keys."
        lead="${VAR} is read from the environment, and envFile names a file to load first without overwriting what the shell already set. Profiles hold several setups in one file. A flag beats a variable, which beats the file."
        className="bg-surface-muted/60"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock code={CONFIG_FILE} lang="json" title="s3nd.config.json" />
          <CodeBlock code={PROFILES} lang="sh" />
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          The file is looked for from the working directory upwards, then in{' '}
          <code className="font-mono">~/.config/s3nd/config.json</code>. <code className="font-mono">s3nd config</code>{' '}
          masks the access key id and never prints the secret or the token. Environment-only works too, which is the
          shape CI wants.
        </p>
        <div className="mt-4 text-sm">
          <TextLink href="/use-cases/ci-backups">Backups from CI</TextLink>
        </div>
      </Section>

      <Section
        eyebrow="Against your own server"
        title="One implementation, two wirings."
        lead="Every command takes --remote, pointing it at a deployment of the transfer protocol instead of at S3. The CLI has exactly one implementation, the protocol client, wired either to fetch or straight into the handler in the same process. The two modes cannot drift apart."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <CodeBlock code={REMOTE} lang="sh" />
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              The practical consequence: the machine you run this from needs a token for your own deployment rather than
              S3 credentials. That is the shape for a team, where handing every laptop the bucket keys is not.
            </p>
            <p>
              <code className="font-mono">s3nd init --provider remote</code> writes the matching starter, and{' '}
              <code className="font-mono">doctor --remote</code> proves the server answers before anyone depends on it.
            </p>
            <TextLink href={docs('/server')} external>
              Setting up a server
            </TextLink>
          </div>
        </div>
      </Section>

      <Section eyebrow="Reference" title="Six commands, a dozen options." className="bg-surface-muted/60">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              Commands
            </h3>
            <dl className="divide-line divide-y text-sm">
              {COMMANDS.map(([command, does]) => (
                <div key={command} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                  <dt className="font-mono text-xs leading-relaxed">{command}</dt>
                  <dd className="text-ink-muted leading-relaxed">{does}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-0">
            <h3 className="border-line text-ink-faint border-b px-5 py-3 font-mono text-[11px] tracking-wider uppercase">
              Options
            </h3>
            <dl className="divide-line divide-y text-sm">
              {OPTIONS.map(([option, does]) => (
                <div key={option} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                  <dt className="font-mono text-xs leading-relaxed">{option}</dt>
                  <dd className="text-ink-muted leading-relaxed">{does}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <p className="text-ink-muted mt-6 max-w-2xl text-sm leading-relaxed">
          Configuration otherwise comes from the same environment variables as the library:{' '}
          <code className="font-mono">S3ND_BUCKET</code>, <code className="font-mono">S3ND_ENDPOINT</code>,{' '}
          <code className="font-mono">S3ND_REMOTE</code>, <code className="font-mono">S3ND_TOKEN</code> and the usual
          AWS credentials. Node 20 or later; the argument parser is <code className="font-mono">node:util</code>
          &apos;s <code className="font-mono">parseArgs</code>, so there is nothing else to install.
        </p>
      </Section>

      <Cta />
    </>
  )
}
