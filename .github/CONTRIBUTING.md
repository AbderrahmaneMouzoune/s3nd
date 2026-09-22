# Contributing to s3nd

Thanks for looking. Bugs, documentation and small fixes are welcome as pull requests straight
away. For anything larger, open an issue first, so the shape can be agreed before the work is done.

## Setting up

A [bun](https://bun.com) workspace, with [Turborepo](https://turborepo.dev) running the tasks. Node
20 or later is needed as well: the packages are published for Node, so the toolchain and the test
suite run on it, and bun only installs and orchestrates.

```sh
bun install
bun run build
bun run test
bun run type-check
bun run lint
bun run format:check
```

The test suite is offline. It runs against an in-memory stand-in for S3 that honours the
conditional headers, so nothing needs credentials or a network. For an integration check against
the real protocol, point an example at a local MinIO container; the
[README](../README.md#minio-on-your-machine-no-cloud-account) shows how to start one.

## Where things live

| Path                | What it is                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/protocol` | `@s3nd/protocol`: the wire contract, a client, sync codes. No storage client, so it bundles for a browser. |
| `packages/s3nd`     | `@s3nd/core`: the S3 primitive, snapshots, files, the handler.                                             |
| `packages/react`    | `@s3nd/react`: hooks. Depends on the protocol, never on S3.                                                |
| `packages/cli`      | `@s3nd/cli`: the `s3nd` binary, built on the primitive.                                                    |
| `apps/docs`         | The documentation site, served from doc.s3nd.sh.                                                           |
| `apps/website`      | The marketing site at s3nd.sh.                                                                             |
| `examples/*`        | Runnable examples. They exercise the packages, they are not published.                                     |
| `templates/drop`    | The one-click Vercel template, live at drop.s3nd.sh.                                                       |

One constraint organises the whole repository: **a browser must never end up with a storage client
in its dependency tree.** Nothing under `packages/protocol` or `packages/react` may import the AWS
SDK, directly or through `@s3nd/core`. A pull request that breaks this is turned down whatever else
it does.

## Pull requests

- Branch from `main`.
- Pull requests are squash-merged, and the title becomes the commit on `main`. That commit is what
  [release-please](https://github.com/googleapis/release-please) reads to decide the next version,
  so the title has to be a [Conventional Commit](https://www.conventionalcommits.org/):
  `fix: honour expiresAt on read`, `feat(cli): a --quiet flag`, `docs: the R2 lifecycle rule`. CI
  rejects any other shape. `feat` and `fix` release a package; `docs`, `chore`, `ci`, `refactor`
  and `test` do not. A breaking change is `feat!:`, or a `BREAKING CHANGE:` footer.
- Run the checks above before pushing. CI runs the same ones, and the test suite on Node 20, 22
  and 24.
- A change in behaviour comes with a test. A change in what a package exports, or in a CLI
  command, comes with the matching README updated, since the README is what npm shows.
- Prettier decides formatting, and `bun run format` applies it. There is no style to argue about.
- Keep the diff to the change. A rename or a reformat that is not needed by the fix goes in its own
  pull request, where it can be read on its own.

## Writing

The READMEs and the documentation are written plainly, in full sentences, and they say what a
thing does before saying why. No em dashes; a colon, a semicolon or a new sentence does the job.
Code samples are real: they run, and their output is what the program prints.

## Releasing

Maintainers only. Releases are cut by release-please from the commits on `main`, one version per
package, and published to npm with provenance. The [README](../README.md#releasing) describes the
whole flow.
