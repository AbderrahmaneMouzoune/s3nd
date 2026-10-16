# Package audit and roadmap to v1

Written on September 22, 2026 against `main` (`613f9e3`), and re-checked on October 15 against
`main` (`bd38089`): every finding below still holds, except the `prefix`/`signal` mismatch between
`Bucket` methods, which PR #22 fixes. The published versions are now `@s3nd/protocol`,
`@s3nd/core` and `@s3nd/react` at `0.1.1`, and `@s3nd/cli` at `0.2.0`.

Scope: `@s3nd/protocol`, `@s3nd/core` (`packages/s3nd`), `@s3nd/react`, `@s3nd/cli`. The apps,
the examples and the `drop` template only come up where they touch the published surface.

Method: a full read of the sources (`src/`), the tests and the build, CI and release
configuration. `bun run build`, `lint`, `type-check`, `test` and `format:check` pass: 261 tests in
total (protocol 35, core 149, react 23, cli 54). Findings marked **[reproduced]** were confirmed
by a throwaway test wired to the handler and to the in-memory bucket of the existing suite.

Every finding is now tracked as an issue; the roadmap in section 5 links them, and #47 tracks the
whole road to 1.0.

---

## 1. Summary

The project is in **very good shape for a 0.1**: the architecture is sound, the code is readable
and well commented, the developer experience is polished, and the release tooling is already at
the level of a mature project. What separates it from a v1 is not code quality, it is:

1. **a few correctness and security bugs** in the HTTP handler and the CLI (section 3), one of
   which writes a file outside the working directory;
2. **a protocol contract that is still implicit** on several points (versioning on the wire,
   telling snapshots from files, size limits, CORS), which has to be frozen before stability is
   promised;
3. **the size ceiling** (everything goes through server memory), already announced as debt;
4. **no tests against a real S3** (MinIO, R2) in CI.

| Package          | Maturity  | Strengths                                                     | v1 blockers                                                      |
| ---------------- | --------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@s3nd/protocol` | Good      | Small, no server dependency, stable error codes               | Version never sent, `S3ndError` in the wrong place, `instanceof` |
| `@s3nd/core`     | Good      | Key validation, ETag and `ifAbsent`, versioned envelope       | Handler bugs, everything in memory, no limit on JSON, no edge    |
| `@s3nd/react`    | Fair      | Abort, race and unmount handled properly, `'use client'` kept | `loadBytes` and `burn` outside the state cycle, no progress      |
| `@s3nd/cli`      | Very good | `doctor`, profiles, origin of every value, a single code path | Path traversal on `get`, silent overwrite, everything in memory  |

---

## 2. What is good

### Architecture

- **The four-package split is right.** `protocol` depends on no storage client, so React, the
  website and a browser bundle it without pulling the AWS SDK. The invariant is written down
  (`protocol/src/index.ts`, the pull request template) and checked in review.
- **The protocol is a contract, not an implementation.** `types.ts` describes four routes and
  their payloads; a Go or Rails backend that implements them works with every client.
- **The CLI has a single code path**: in local mode the protocol client is wired straight into the
  in-memory handler (`buildClient`, `cli/src/index.ts`). `--remote` and local mode cannot drift
  apart.
- **The handler speaks `Request`/`Response`**: Next, Hono, Bun, Deno, workers.

### Code quality

- Strict TypeScript with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`.
- Typed errors with stable `code`s (`S3ndError`, `TransferError`, `CliError`) and messages that
  say what to do.
- `assertValidKey` rejects traversal, absolute paths, control characters and keys over 1024
  bytes: keys coming from a user are treated as hostile.
- Well-designed optimistic concurrency: `ifMatch` / `ifAbsent`, normalised ETags, retry on a code
  collision (`claimCode`).
- Versioned snapshot envelope, compression detected rather than assumed, backward compatibility
  with the old `bucketcode` marker.
- `NOT_FOUND` deliberately covers both "expired" and "never existed", so codes cannot be probed.
- Sync codes: Crockford base32, `O→0` and `I/L→1` repair only when the alphabet makes it
  unambiguous, entropy exposed.
- `useAsyncTask` correctly aborts the previous request and handles late replies and unmounting.

### Developer experience and tooling

- `s3nd doctor` checks what costs an afternoon: credentials, `HeadBucket`, a real write, read and
  delete round trip, and above all the **lifecycle rule** without which expired transfers stay
  stored and billed.
- `s3nd config` shows where every value came from; secrets are masked.
- Release: release-please in a monorepo, Conventional Commits pull request titles checked in CI,
  publishing ordered by dependency, `--provenance`, idempotent on already published versions.
- CI: Node 20/22/24 matrix, turbo cache, `format:check`.
- Light tarballs (sourcemaps dropped, explicit `files`, `sideEffects: false`).
- Plenty of documentation: a README per package, GIFs, community health files, `SECURITY.md`.

---

## 3. What is wrong

Ordered by severity. References point at `main`.

### Critical (security, to fix before any new release)

These two are tracked privately, as `.github/SECURITY.md` asks, and are only summarised here.

**C1. `s3nd get` can write a received file to a path the sender chooses**, including outside the
working directory. **[reproduced]**

**C2. `GET /:code/raw` in `redirect` mode checks nothing before signing**, so an expired code
stays downloadable until the lifecycle rule removes the object.

### Major (correctness)

**M1. A JSON file cannot be sent as a file** (#30). The handler picks snapshot or file on
`content-type.includes('application/json')`. `useSendTransfer().sendFile(file)` sends
`file.type`, so every `.json` goes down the snapshot path and fails with `INVALID_REQUEST`
**[reproduced]**; worse, a JSON file with a `data` key silently becomes a snapshot. Fix: decide on
the presence of `x-s3nd-filename` (or an explicit `x-s3nd-kind` header), and write the rule into
the protocol.

**M2. A badly encoded path crashes the handler** (#29). `segmentsOf` calls `decodeURIComponent`
without a `try`: `GET /api/transfers/%E0` throws an uncaught `URIError` **[reproduced]**, so the
framework answers a 500 instead of `INVALID_SYNC_CODE`.

**M3. More generally, any error that is not an `S3ndError` is rethrown** (#29). The protocol says
"every non-2xx has an `{ error }` body", but an SDK network error that was not wrapped, a
`URIError` or an exception inside `authorize` leaves raw. A last safety net answering `INTERNAL`
in JSON is needed, with an `onError` hook for logging.

**M4. `/raw` also serves snapshots** (#31). On a snapshot code, `/raw` returns the raw gzipped
envelope (`1f 8b`) **[reproduced]**, internal metadata included. Either 404/`INVALID_REQUEST`, or
documented behaviour.

**M5. Nothing bounds the size before everything is read** (#32). `createFile` calls
`request.arrayBuffer()` and only then does `upload()` check `maxSize`; `createSnapshot` calls
`request.json()` with no limit at all. A client can hold a large body in server memory before it
is refused. Fix: check `content-length` first, then read as a stream with a counter that stops past
`maxSize`.

**M6. The User-Agent is stored by default** (#33).
`device: body.device ?? request.headers.get('user-agent')` writes the full UA into the bucket and
hands it back to anyone who knows the code. A quiet leak of personal data; it should be opt-in.

### Medium (API and robustness)

- **`PROTOCOL_VERSION` is never sent** (#35). No response header, no request header. A v2 client
  talking to a v1 server cannot tell. To freeze before v1 (for example `s3nd-protocol: 1` both
  ways).
- **No CORS** (#36). The client is presented as usable from any origin, but the handler does not
  answer `OPTIONS` and adds no header.
- **No rate-limiting hook** (#43). 40 bits of entropy is fine, but `SyncCodes` documents that four
  digits are "a rate limit's problem", while the handler offers no hook other than `authorize`.
- **Anyone who knows a code can delete it** (#43). For a v1, an owner token returned on creation
  (`deleteToken`) or a burn-after-read mode would be safer.
- **`S3ndError` lives in `protocol`** (#37) although half of its codes (`UPLOAD_FAILED`,
  `GET_FAILED`, `MISSING_CONTENT_LENGTH`...) describe storage. Moving it is breaking: now or in v2.
- **`isS3ndError` / `isTransferError` rely on `instanceof`** (#37), while every package ships both
  ESM and CJS. If an application loads `protocol` once through `require` and once through `import`,
  `instanceof` returns `false` (dual package hazard). Add a brand (`Symbol.for('s3nd.error')`) and
  test it.
- **Inconsistent `Bucket` API**: `get`/`put`/`upload` accept `prefix` and `signal`, `getUrl` and
  `delete` accept neither. Fixed by PR #22.
- **The client does not validate responses** (#38) (`as CreatedTransfer`): a proxy answering HTML
  with a 200 gives an obscure parsing error. At least check the `content-type`.
- **No default timeout** (#38) in the client.
- **`@s3nd/core` imports `node:crypto`, `node:zlib` and `node:stream`** (#13): it does not run on
  Vercel Edge or on a Worker without `nodejs_compat`, while the handler docs mention "a worker".
  `crypto.randomUUID`, `CompressionStream` and web streams would be enough.

### Minor (developer experience, consistency)

- React (#39): `loadBytes` and `burn` bypass `useAsyncTask` (no `status`, no abort, no exposed
  error). No upload or download progress (#41).
- React (#39): the JSDoc example `onClick={() => send(await exportDatabase(), …)}` is not valid
  code; `@s3nd/react` has no `engines` field, and the `react` peer has no upper bound.
- CLI (#42): `put` reads the whole file into memory (`readFile`, concatenated stdin), there is no
  progress bar. `--token` as an argument ends up in shell history; recommend `S3ND_TOKEN`.
- `doctor` (#34): a lifecycle rule filtered by `Filter.And.Prefix` or by tag is not recognised
  (false warning).
- Comments and messages promising "v0.2" (multipart, presigning) (#46) need updating to the real
  roadmap.
- No `publint` / `@arethetypeswrong/cli` in CI to check ESM/CJS/types `exports` (#45).
- No measured coverage (#45), no integration test against MinIO (#8).
- `turbo.json`: `lint` has no `inputs`, so no targeted cache; minor.

---

## 4. What to improve

Grouped by theme, with what v1 requires and what can wait.

### 4.1 Freeze the protocol (required for v1)

Write `packages/protocol/PROTOCOL.md` as a real specification, then implement it (#35):

- a version header both ways and the behaviour on mismatch;
- an explicit snapshot/file rule (#30);
- `/raw` on a snapshot (#31);
- limits: announced maximum size (a header, or a `GET /` capabilities route), `TOO_LARGE`
  guaranteed before the full read (#32);
- CORS and `OPTIONS` (#36);
- `DELETE` semantics (owner token or not) (#43);
- the guarantee that every non-2xx has an `{ error }` body (#29);
- an exported conformance suite a third-party server can run against its implementation (#44).

### 4.2 Large files (required to keep the "move a file" promise)

Today everything goes through server memory and stops at 4.5 MB on Vercel. For a credible v1:

- **presigned uploads** (#41): `POST /` answers a presigned PUT URL (or a POST policy with
  `content-length-range`), the browser or the CLI sends straight to the bucket, then confirms;
- **multipart** (#12) for the CLI and local mode (`UploadBody` already accepts streams);
- **streaming** in the CLI (#42) (`createReadStream`, streamed writes on `get`);
- progress exposed in the client, the React hooks and the CLI (#41, #42).

### 4.3 Security

- Fix C1, C2, M5 and M6.
- A `rateLimit` hook (or documentation of a middleware) and a code length recommendation (#43).
- Optional end-to-end encryption (key in the URL fragment, or derived from the code): a strong
  differentiator for a transfer tool, but a 1.x item.
- Write the threat model into `SECURITY.md` (#46): who can read, who can delete, what a bucket
  operator sees.

### 4.4 Runtime portability

- Remove `node:*` from `@s3nd/core` in favour of web APIs, or isolate the handler in an
  edge-compatible `@s3nd/core/handler` entry (#13).
- Test the handler on Bun, Deno and a Worker in CI (at least a smoke test).

### 4.5 Quality and CI

- An integration job against a MinIO container (a GitHub Actions service) running the full suite
  and `s3nd doctor` (#8).
- `publint` and `attw` on every built package (#45).
- Measured coverage (`vitest --coverage`) with a threshold on `core` and `protocol` (#45).
- A tarball smoke test: `npm pack`, install into an empty ESM and CJS project, import, run
  `s3nd --version` (#45).
- Property tests on `normalizeSyncCode` and `assertValidKey` (fast-check).

### 4.6 Public API

- A full API review with `@microsoft/api-extractor` (#40): generate a `.api.md` report per
  package, commit it, and fail CI on any unintended change. It is the tool that makes the semver
  promise keepable.
- Settle the breaking changes in one go (phase 2 below).
- Align `getUrl`/`delete` with `get`/`put` (`prefix`, `signal`): PR #22.
- A cross-bundle error brand (`Symbol.for`) (#37).

---

## 5. Roadmap to v1

Principle: **anything that breaks the API happens before 1.0**, so that 1.0 is a stabilisation
release rather than a feature release.

The phases are named rather than numbered by version, because the packages are versioned
independently (the CLI is already `0.2.0`). Each phase is a GitHub milestone; #47 tracks them all.

### Phase 1: fixes, no API change (`v1-phase-1-fixes`)

Goal: make the published versions safe to use while the rest is prepared.

- [ ] C1 and C2, through private security advisories
- [ ] #29 Safe `decodeURIComponent`, and a final `INTERNAL` JSON net with an `onError` hook
- [ ] #30 A `.json` file sent with `sendFile` stays a file
- [ ] #31 `/raw` refuses a snapshot
- [ ] #32 `content-length` checked first, bounded read, limit on JSON
- [ ] #33 Stop storing the User-Agent by default
- [ ] #34 `doctor` recognises `Filter.And.Prefix`
- [ ] #8 SDK default checksums on R2 and MinIO, and a MinIO integration job
- [ ] #9 Document whether `maxSize` is measured before or after gzip
- [ ] #20 Drop nanoid (PR #21)

### Phase 2: contract and API, the last window to break (`v1-phase-2-contract-and-api`)

Goal: freeze the wire and the API.

- [ ] #35 `PROTOCOL.md` and the protocol version header
- [ ] #36 CORS in the handler
- [ ] #37 `S3ndError` moved to `@s3nd/core`, `Symbol.for` brand
- [ ] #38 Response validation and timeout in the client
- [ ] #39 `loadBytes` and `burn` in the React state cycle
- [ ] #7 `head`, `exists`, `list`, `copy`, `deleteSnapshot`, and `prefix`/`signal` on `getUrl` and
      `delete` (PR #22)
- [ ] #10 `ifAbsent` and backend support for conditional writes
- [ ] #14 Validate `getSnapshot<T>` data instead of casting it
- [ ] #40 api-extractor wired in, reports committed (last)

### Phase 3: large files and runtimes (`v1-phase-3-large-files-and-runtimes`)

Goal: keep the "move a file" promise without a 4.5 MB ceiling.

- [ ] #41 Presigned uploads (browser and CLI) with confirmation and progress
- [ ] #12 Multipart in `Bucket.upload` for streams of unknown size
- [ ] #42 Streaming CLI on `put` and `get`, progress bar
- [ ] #28 `s3nd put` of a directory
- [ ] #43 Rate-limiting hook and delete token (or burn after read)
- [ ] #13 `@s3nd/core` without `node:*` on the handler path; smoke tests on Bun, Deno and a Worker

### Phase 4: hardening, release candidate (`v1-phase-4-release-candidate`)

Goal: no more features, only confidence.

- [ ] #44 Protocol conformance suite, run against the handler
- [ ] #45 `publint`, `attw`, tarball smoke test, coverage threshold
- [ ] #11 Dependabot, CodeQL, Scorecard, type tests, knip
- [ ] #46 Threat model, migration guide from 0.x to 1.0, no stale "v0.2" mentions, every exported
      option documented
- [ ] A documented manual pass on AWS S3 and R2
- [ ] `1.0.0-rc.N` published under the npm `next` tag, with feedback from at least one real
      project (the `drop` template, the `indexeddb-sync` example)

### 1.0: stable

Exit criteria:

- no open high-severity `bug` issue and no open security advisory;
- api-extractor reports unchanged since the last RC;
- CI green on Node 20/22/24, MinIO, and the runtime smoke tests;
- `PROTOCOL.md` marked version 1 and the conformance suite at 100%;
- a written support policy: strict semver, supported Node versions, how long 1.x is supported
  after a 2.0.

On the release-please side: drop `bump-minor-pre-major` when moving to 1.0 (or force the version
with `release-as: 1.0.0`), otherwise a `feat!` in 0.x keeps producing only a minor bump.

### After 1.0 (1.x)

- Optional end-to-end encryption
- Multi-file and directory transfers
- An interactive `s3nd send` with a QR code in the terminal
- Ready-made framework adapters (Hono, Express, Fastify)
- Hooks for other UI frameworks (Vue, Svelte) on top of `@s3nd/protocol`
