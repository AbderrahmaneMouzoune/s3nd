# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting instead:
[report a vulnerability](https://github.com/AbderrahmaneMouzoune/s3nd/security/advisories/new). It
reaches the maintainer alone, and the report stays private until a fix is out.

Say which package and version, how to reproduce it, and what an attacker gains. Expect an
acknowledgement within a few days, and a fix or a decision within a couple of weeks for anything
confirmed. Credit goes in the release notes, unless you would rather it did not.

## Supported versions

From 1.0.0, each package follows strict semver, and the latest minor of the current major gets
fixes: `@s3nd/core`, `@s3nd/cli`, `@s3nd/react` and `@s3nd/protocol`. When a 2.0.0 comes out,
1.x keeps getting security fixes for six months. 0.x releases and the `1.0.0-rc` candidates get
none once 1.0.0 is out, and `bucketcode`, the package's previous name, is deprecated and will not be
patched. The [support policy](../README.md#support-policy) has the rest, Node versions included.

## What counts

s3nd moves bytes through a bucket you own, under a code that is a bearer token. Reports worth
making:

- A way to read, overwrite or delete a transfer without holding its code.
- A code easier to guess than its alphabet and length imply. The default is eight characters of
  Crockford base32, forty bits.
- A storage credential, or a presigned URL, reaching a browser through `@s3nd/protocol` or
  `@s3nd/react`.
- An expired transfer being handed over.
- The handler telling an expired code apart from one that never existed. Both answer `NOT_FOUND`
  on purpose, so nobody can probe which codes have been used.
- The CLI printing a secret. `s3nd config` masks the access key id and never prints the secret or
  the token; `s3nd doctor` prints the last four characters of the key and nothing more.

Turning on `rateLimit` and `protectDelete`, and choosing a short `expiresIn`, are the deployer's
job: the handler provides each of them, off by default, and the documentation says when they
matter. That they are not applied for you is a design decision, not a vulnerability. The threat
model below says what s3nd protects and what it leaves to you.

## Threat model

### A code is the only key

**Who can read a transfer:** anyone who holds its code. Nothing else is asked: no account, no
session, no link between the two devices. The server can put its own authorization in front
(`authorize` on `createTransferHandler()`), which then applies to every route, but within it a code
reads its transfer.

**Who can delete it:** by default, anyone who holds the code, so someone who saw a code go by can
burn it before its recipient reads it. With `protectDelete`, only whoever holds the transfer's
delete token can. The token is returned once, in the answer that created the transfer, and the
server keeps only its SHA-256, so reading the bucket does not give it away.

**What the bucket operator sees:** everything, in clear. s3nd does not encrypt end to end: a
snapshot's state, a file's bytes and name, and the metadata (`app`, `version`, `device`, the dates)
are stored as they were sent, gzipped but not encrypted. Whoever runs the server sees the same,
and so does anyone with read access to the bucket or its backups. Encrypt before sending when that is not
acceptable (the [encrypted sync](https://doc.s3nd.sh/docs/use-cases/encrypted-sync) use case shows
how), and use HTTPS between the client and the server.

### What expiry guarantees

A transfer past its `expiresAt` is **refused on read**: every route answers `NOT_FOUND`, exactly as
for a code that never existed, so nobody can tell an expired code from an unused one.

Expiry does **not delete** anything. The object stays in the bucket, readable by anyone with bucket
access, until a lifecycle rule removes it. That rule is yours to set (`s3nd doctor` checks there is
one), along with the rules for `pending/` uploads nobody completed and for incomplete multipart
uploads. `burnAfterRead` deletes a transfer once it has been handed over, which shortens the window
but is a cleanup, not a lock: two reads racing each other can both succeed.

### Guessing a code

A code is a bearer secret, so its strength is its entropy. The default, eight characters of
Crockford base32, is 40 bits: about 1.1 × 10¹² codes, so finding one live code among a thousand
takes around a billion requests. A shorter code or a smaller alphabet is another matter: six digits
(20 bits) hold a million codes, and with a thousand of them live, an unlimited client hits one in
about a thousand requests.

The handler does not count requests itself, since only the deployment knows who a client is. It
gives `rateLimit(request, { route, code })` a say before any code is looked up, so a refused guess
learns nothing, and answers `429 RATE_LIMITED` with `retry-after`. A deployment with short codes
needs a rate limit, a short `expiresIn`, and preferably `burnAfterRead`. The
[sync codes](https://doc.s3nd.sh/docs/sync-codes) page has a table of code lengths with and without
one.

### A filename the CLI receives

The filename of a transfer comes from whoever sent it. `s3nd get` treats it as a name and nothing
more: it keeps the last path segment, whichever separator was used, drops control characters and
leading dots, and falls back to the code when nothing is left. The file is written in the current
directory, or where `--output` says, never over an existing file unless `--force` is given. It is
streamed into a temporary file beside the destination and only takes the destination's name once it
is complete, so an interrupted transfer leaves nothing half written.
