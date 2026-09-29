# @s3nd/cli

[![npm](https://img.shields.io/npm/v/%40s3nd%2Fcli?color=ffb000&labelColor=111111&label=npm)](https://www.npmjs.com/package/@s3nd/cli)
[![install size](https://img.shields.io/npm/unpacked-size/%40s3nd%2Fcli?color=111111&labelColor=111111&label=install%20size)](https://www.npmjs.com/package/@s3nd/cli)
[![MIT](https://img.shields.io/badge/license-MIT-ffb000.svg)](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/packages/cli/LICENSE)
[![Docs](https://img.shields.io/badge/docs-doc.s3nd.sh-111111.svg)](https://doc.s3nd.sh)

<p align="center">
  <img src="https://raw.githubusercontent.com/AbderrahmaneMouzoune/s3nd/main/.github/demos/cli.gif" alt="Two terminals. On machine A, s3nd put ./report.pdf prints the code K7QP2M4X. On any other machine, s3nd get k7qp-2m4x writes report.pdf back, then s3nd rm burns the code." width="880">
</p>

Move a file between machines with a code, check that a bucket is actually set up to hold
transfers, and keep the settings in a file instead of in your shell history.

```sh
npm install -g @s3nd/cli
s3nd setup
s3nd put ./report.pdf
```

`setup` asks a few questions, saves the answers for this machine and checks the bucket works.
From then on every command works from any directory. Or without installing anything:

```sh
npx @s3nd/cli setup
```

It is built on [`@s3nd/core`](https://www.npmjs.com/package/@s3nd/core) as a primitive, and has no
dependencies of its own beyond it: `node:util`'s `parseArgs` is the whole argument parser.

## `setup` and `init`

`setup` asks where transfers are stored (a list you move through with the arrow keys), the bucket
and the keys, one question at a time, with where to find each value. It writes `~/.config/s3nd/config.json`, readable by you only and used
from any directory, then checks the bucket live. The provider list, while it is open:

```
? Where should transfers be stored?
  AWS S3
❯ Cloudflare R2                  no egress fees
  Scaleway
  Wasabi
  MinIO                          on this machine or self-hosted
  Another S3-compatible service  Backblaze B2, DigitalOcean Spaces, Hetzner…
  A s3nd server                  someone else runs it; you only need its URL
  ↑↓ to move · Enter to pick
```

Once picked it folds into one line, and the whole run reads:

```
$ s3nd setup
Set up s3nd on this machine
Saved to ~/.config/s3nd/config.json, used from any directory. Ctrl+C leaves without writing.

? Where should transfers be stored? Cloudflare R2
  Dashboard → R2 → Overview, "Account ID" in the side panel. The S3 API URL works too.
? Cloudflare account ID 8c4f…
  An existing bucket. The check at the end tells you if it is not reachable.
? Bucket name transfers
  R2 → Manage API tokens → Create API token, with Object Read & Write on this bucket.
? Access key ID 5d1e…1a2b
? Secret access key (hidden) ••••••••••••••••

✓ Saved ~/.config/s3nd/config.json (readable by you only)
  Cloudflare R2 · bucket "transfers" · credentials: key …1a2b

Checking it works…
✓ Configuration: bucket "transfers", region "auto", endpoint https://8c4f….r2.cloudflarestorage.com
✓ Credentials: resolved, key ends in 1a2b
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no lifecycle configuration
  → Add an S3 lifecycle rule that expires objects under "transfers/" after a day or two.

Ready. Send something:
  s3nd put ./a-file
```

`init` asks the same questions for a project instead: it writes `./s3nd.config.json`, meant to be
committed, with `${…}` references to the keys, and the keys themselves in a `.env` beside it. It
warns when no `.gitignore` there lists `.env`.

A flag answers its question in advance: `--provider` (`aws`, `r2`, `scaleway`, `wasabi`, `minio`,
`other` or `remote`), `--bucket`, `--region`, `--endpoint`, `--remote`. An existing file is only
replaced once you say so, or with `--force`. Ctrl+C leaves without writing anything.

Nobody at the keyboard (a pipe, CI, or `--yes`), nothing is asked: the flags write a starter with
`${…}` references, and a missing `--bucket` is an error rather than a placeholder.

```sh
s3nd init --yes --provider r2 --bucket transfers
```

You rarely need to type `setup` at all. Any command that needs a bucket, run on a machine with
none configured, offers to set one up on the spot and then carries on with what you asked for.

## `doctor`

The check `setup` ends with, on demand. S3 misconfiguration fails late and vaguely: a policy that looks
right, credentials that resolve to nothing, a region the endpoint disagrees with. `doctor` performs
the operations s3nd actually needs and reports what happened, rather than reading your policy
and reasoning about it. The probe object is deleted before it returns.

```sh
$ s3nd doctor
Using /home/you/transfers/s3nd.config.json
✓ Configuration: bucket "transfers", region "eu-west-3"
✓ Credentials: resolved, key ends in 1234
✓ Bucket reachable: HeadBucket succeeded
✓ Write, read, delete: round-tripped a probe object
! Expiry cleanup: no enabled expiration rule
  → Add an S3 lifecycle rule that expires objects under this bucket after a day or
    two. Without it, expired transfers stay stored and billed.

1 check(s) failed.
```

That last check is the one that earns the command. `expiresIn` stops a transfer being _handed
over_; only a lifecycle rule deletes the object, and nothing surfaces the gap until a bill does.

Pointed at a server, `doctor` checks the only thing that matters there, a real round trip:

```sh
$ s3nd doctor --remote https://drop.example.com/api/transfers --token "$TOKEN"
✓ Server: https://drop.example.com/api/transfers answered
✓ Create, read, delete: round-tripped code 8WTXQC8R
```

It exits non-zero when a check fails, so it works as a deployment smoke test.

## `put`, `get`, `rm`

```sh
$ s3nd put ./report.pdf
report.pdf · 284 kB · expires in 1 hour
K7QP2M4X
```

The code goes to stdout and everything else to stderr, so it composes:

```sh
CODE=$(s3nd put ./report.pdf)
```

`put -` reads stdin, which is how a directory travels:

```sh
tar cz ./project | s3nd put - --name project.tar.gz
```

On the other machine:

```sh
$ s3nd get K7QP2M4X
Wrote /home/you/report.pdf · 284 kB

$ s3nd rm K7QP2M4X
Burned K7QP2M4X
```

`get` writes to the stored filename unless you pass `-o`; `-o -` sends the payload to stdout. A code
holding a snapshot rather than a file prints its JSON instead.

## The configuration file

`s3nd.config.json`, `.s3ndrc.json` or `.s3ndrc`, looked for from the working directory upwards,
then `~/.config/s3nd/config.json`:

```json
{
  "bucket": "transfers",
  "region": "auto",
  "endpoint": "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
  "prefix": "transfers",
  "expiresIn": "24h",
  "envFile": ".env",
  "credentials": {
    "accessKeyId": "${R2_ACCESS_KEY_ID}",
    "secretAccessKey": "${R2_SECRET_ACCESS_KEY}"
  }
}
```

`${VAR}` is read from the environment and `envFile` names a file to load first, without
overwriting what the shell already set. So the configuration is committable and the keys are not.

Profiles hold several setups in one file:

```json
{
  "profiles": {
    "prod": { "remote": "https://drop.example.com/api/transfers", "token": "${S3ND_TOKEN}" },
    "local": { "bucket": "transfers", "endpoint": "http://localhost:9000" }
  }
}
```

```sh
s3nd -p local doctor
s3nd -p prod put ./report.pdf
```

A flag beats an environment variable, which beats the file. `s3nd config` prints which won:

```sh
$ s3nd config
file         /home/you/transfers/s3nd.config.json (profile "r2")
profiles     r2, local
mode         straight to S3

bucket       transfers                                 $S3ND_BUCKET
region       auto                                      s3nd.config.json (r2)
endpoint     https://8c4….r2.cloudflarestorage.com     s3nd.config.json (r2)
prefix       drops                                     --prefix
credentials  …1a2b                                     s3nd.config.json (r2)
expires in   1 day                                     s3nd.config.json (r2)
```

It masks the access key id and never prints the secret or the token.

## Against your own server

Every command takes `--remote`, pointing it at a deployment of
[the transfer protocol](https://github.com/AbderrahmaneMouzoune/s3nd/blob/main/apps/docs/content/docs/protocol.mdx)
instead of at S3:

```sh
s3nd --remote https://drop.example.com/api/transfers put ./report.pdf
```

This is not a second implementation. The CLI has exactly one, the protocol client, wired either to
`fetch` or, without `--remote`, straight into the request handler in the same process. The two modes
cannot drift apart, because there is only one of them.

The practical consequence: the machine you run this from needs a token for your own deployment
rather than S3 credentials.

## Options

| Option                 | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `-c, --config <path>`  | Configuration file to read                                  |
| `-p, --profile <name>` | Profile to use inside it                                    |
| `--env-file <path>`    | Read `KEY=value` pairs from this file first                 |
| `--bucket <name>`      | Bucket name                                                 |
| `--prefix <prefix>`    | Key prefix inside the bucket                                |
| `--region <name>`      | Region                                                      |
| `--endpoint <url>`     | S3-compatible endpoint                                      |
| `--expires-in <d>`     | Transfer lifetime: `3600`, `30m`, `24h`, `7d`, or `never`   |
| `--remote <url>`       | Talk to a s3nd server instead of S3 directly                |
| `--token <token>`      | Bearer token sent with `--remote`                           |
| `--name <filename>`    | Filename to store the transfer under                        |
| `-o, --output <path>`  | Where `get` writes. `-` is stdout                           |
| `--json`               | Machine-readable output, for scripts and for `doctor` in CI |
| `--provider <name>`    | Which starter `init` writes                                 |
| `--force`              | Let `init` overwrite an existing file                       |

Configuration otherwise comes from the same environment variables as the library:
`S3ND_BUCKET`, `S3ND_REGION`, `S3ND_ENDPOINT`, `S3ND_PREFIX`, `S3ND_PUBLIC_URL`,
`S3ND_EXPIRES_IN`, `S3ND_REMOTE`, `S3ND_TOKEN`, and the usual AWS credentials.

## License

MIT © Abderrahmane Mouzoune
