# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting instead:
[report a vulnerability](https://github.com/AbderrahmaneMouzoune/s3nd/security/advisories/new). It
reaches the maintainer alone, and the report stays private until a fix is out.

Say which package and version, how to reproduce it, and what an attacker gains. Expect an
acknowledgement within a few days, and a fix or a decision within a couple of weeks for anything
confirmed. Credit goes in the release notes, unless you would rather it did not.

## Supported versions

The latest release of each package gets fixes: `@s3nd/core`, `@s3nd/cli`, `@s3nd/react` and
`@s3nd/protocol`. Earlier 0.x releases do not, and `bucketcode`, the package's previous name, is
deprecated and will not be patched.

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

Rate-limiting the lookup route and choosing a short `expiresIn` are the deployer's job, and the
documentation says so. That they are not applied for you is a design decision, not a vulnerability.
