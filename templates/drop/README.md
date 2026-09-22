# s3nd drop

A small WeTransfer on your own bucket. Drop a file, look at it, decide how long it lives and
whether it takes a password, and get an eight-character code, a link and a QR code; type the code
or scan it on any device until it expires, then burn it. Two pages and three routes, built on
[s3nd](https://s3nd.sh), on top of the S3-compatible bucket you already have: Cloudflare R2, AWS
S3, MinIO, Scaleway, Wasabi.

Try it at [drop.s3nd.sh](https://drop.s3nd.sh), then deploy your own:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAbderrahmaneMouzoune%2Fs3nd%2Ftree%2Fmain%2Ftemplates%2Fdrop&project-name=s3nd-drop&repository-name=s3nd-drop&env=S3ND_BUCKET%2CS3ND_ENDPOINT%2CS3ND_REGION%2CAWS_ACCESS_KEY_ID%2CAWS_SECRET_ACCESS_KEY&envDescription=An%20S3-compatible%20bucket%20and%20a%20key%20pair%20scoped%20to%20it.%20R2%2C%20S3%2C%20MinIO%2C%20Scaleway%20and%20Wasabi%20all%20work.&envLink=https%3A%2F%2Fs3nd.sh%2Fproviders)

| Page                 | Does                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                  | The drop zone, the staged file with its options, and under it "already have a code?": type it, typos repaired. |
| `/K7QP2M4X`          | The pickup page: a preview, everything known about the transfer, a download button, a QR code, a way to burn.  |
| `/api/transfers/*`   | The four-route [transfer protocol](https://doc.s3nd.sh/docs/protocol), so the CLI works too.                   |
| `/api/preview/:code` | The same bytes, served to be looked at rather than saved.                                                      |
| `/api/unlock/:code`  | Where a password is typed, once, for a transfer that has one.                                                  |

No account, no relay, nothing in the middle. The code is the whole handshake: whoever has it can
pick the file up while it lives, and an unknown or expired code answers the same 404 as one that
never existed.

## Before it goes

A file is staged, not sent: picking one shows what it is — the image, the video, the first lines of
the text — and a form for everything the sender gets to decide. Nothing leaves the machine until
the button is pressed, and the defaults are the old behaviour, so a drop is still a drop and a
click.

| Option                            | What it does                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **How long it lives**             | One of the lifetimes this deployment offers, from ten minutes to `DROP_MAX_EXPIRES_IN`. The bucket hands nothing over past that point. |
| **A password on this transfer**   | Asked for before the file can be seen at all. Hashed with scrypt, stored beside the transfer, never recoverable.                       |
| **Burn after the first download** | The code stops working as the bytes go out. Looking at the preview costs nothing; downloading spends it.                               |
| **Call it something else**        | The name it downloads under on the other side.                                                                                         |
| **Sent from**                     | A label for this machine, guessed from the browser and the sender's to overwrite: "Chrome on macOS".                                   |
| **A line with it**                | Up to 280 characters, shown above the file on the pickup page.                                                                         |

Then the bar: the upload goes up over `XMLHttpRequest` rather than `fetch`, because a drop box is
the one place where "68%" is the interface and `fetch` cannot say how far a request body has gone.

**How the options travel.** The protocol's `POST /` takes a body and a filename; everything above
rides along in `x-drop-*` request headers, so the four routes keep the shape every s3nd client
already speaks. A client that knows none of them — the CLI, `@s3nd/react` — gets the defaults, and
the transfer it creates is indistinguishable from one this page made.

Everything that is not the protocol's is kept in a second small object beside the transfer, under
`meta/<code>` in the same prefix, written with the same expiry so it cannot outlive what it
describes. It holds the note, the device, the burn-after-download flag and the password as a
scrypt hash and salt. Burning a code burns both.

## Picking up

Three ways in, all landing on the same pickup page:

- **Type the code.** The front page has a field for it. What is typed stays as typed; underneath,
  `useSyncCodeInput()` from `@s3nd/react` drops separators, folds case and reads `O` as zero, so
  `k7qp-2m4x` finds `K7QP2M4X`.
- **Scan it.** Once a file is dropped, the result shows a QR code of the pickup link beside the
  board, and the pickup page shows one too. Point a phone's camera at it and the page opens there:
  the way to move a file from a laptop to the phone in your hand. The QR code is inline SVG, drawn
  by [`uqr`](https://github.com/unjs/uqr), dark on paper so a camera reads it first time.
- **From a terminal.** `s3nd get k7qp-2m4x --remote https://your.drop/api/transfers`.

The page shows what is there before anything is saved: the image, the video, the audio, the PDF,
the first lines of the text, and for everything else the extension and the size. Under it, what is
known about the transfer — name, size, type, when it was dropped, when it expires (ticking), which
machine sent it, whether it burns on download.

**If there is a password**, the page says only that: the code got you this far, and the password is
the other half. It goes to `/api/unlock/<code>`, which hands that browser a cookie for that one
code — nothing else opens with it, it is gone when the browser closes, and it stops meaning
anything the moment the transfer does. From a terminal the same password is the bearer token:
`s3nd get k7qp-2m4x --remote … --token <password>`.

**If it burns after one download**, the page says that too, before the click. The preview is free;
the download is the spend, and the code is gone by the time the file has finished arriving.

Then burn it. The pickup page offers to as soon as the download has started, and the sender's
result page has a burn button too; whichever side does it, the sender's page notices the code is
gone (it asks the bucket every few seconds, for ten minutes at most). A code left alone expires
on its own; burning just means nothing waits in the bucket meanwhile.

Sharing a link somewhere with previews (a chat, a social network) shows a card for it:
`app/opengraph-image.tsx` draws the front page's, and `app/[code]/opengraph-image.tsx` draws the
pickup page's with the filename, the size and the time left. Whoever holds the link already holds
the code, so the card gives nothing away that the URL did not — and a transfer with a password on
it draws a card that says only that it is locked.

## Deploy

1. Create a bucket and a key pair with read and write on that bucket, and nothing else. On
   Cloudflare R2 that is a bucket plus an API token with _Object Read & Write_; on AWS an IAM user
   or role scoped to the bucket. [Every provider](https://s3nd.sh/providers) has a page.
2. Click **Deploy with Vercel** above and paste the five values it asks for.
3. Give the bucket a lifecycle rule that deletes objects under the prefix (`drop/` by default) after
   a day or two. The expiry stops a transfer being handed over; only the rule deletes the object.
4. Check it round-trips a real transfer:

   ```sh
   npx @s3nd/cli doctor --remote https://your-deployment.vercel.app/api/transfers   # or the live one: https://drop.s3nd.sh/api/transfers
   ```

   With a `DROP_PASSWORD` set, add `--token <password>`.

## Configuration

The bucket is configured through the variables `@s3nd/core` already reads. Everything else is optional.

| Variable                | Required | Default  | What it does                                                                             |
| ----------------------- | :------: | -------- | ---------------------------------------------------------------------------------------- |
| `S3ND_BUCKET`           |   yes    |          | The bucket name.                                                                         |
| `S3ND_ENDPOINT`         |    R2    |          | The provider's S3 endpoint. Leave empty for AWS S3 proper.                               |
| `S3ND_REGION`           |          | `auto`   | `auto` for R2 and most S3-compatible providers; a real region for AWS and Scaleway.      |
| `AWS_ACCESS_KEY_ID`     |   yes    |          | The key pair. On AWS you can leave both out and use a role instead.                      |
| `AWS_SECRET_ACCESS_KEY` |   yes    |          |                                                                                          |
| `S3ND_PREFIX`           |          | `drop`   | The folder in the bucket every transfer lands in. Put the lifecycle rule on it.          |
| `DROP_PASSWORD`         |          |          | Ask for it before an upload. Picking up never asks. See the note below.                  |
| `DROP_EXPIRES_IN`       |          | `86400`  | Seconds a transfer lives when the sender chooses nothing. One day.                       |
| `DROP_MAX_EXPIRES_IN`   |          | `604800` | The longest life a sender may choose. A default longer than this comes down to it.       |
| `DROP_MAX_SIZE_MB`      |          | `4`      | The largest file accepted. Vercel functions take 4.5 MB per request.                     |
| `DROP_RAW_MODE`         |          | `stream` | `stream` pipes downloads through the function; `redirect` presigns them from the bucket. |
| `DROP_PREVIEW`          |          | `true`   | Show what is behind a code on the pickup page. `false` turns the preview route off too.  |
| `DROP_PREVIEW_MAX_MB`   |          | `16`     | The largest file a preview renders. Above it the page describes the file instead.        |
| `DROP_NAME`             |          | `drop`   | The name in the header and the page title.                                               |
| `DROP_URL`              |          | Vercel's | The public URL, for absolute links. Vercel's production domain when unset.               |

**About the two passwords.** They are different things, and only one of them is yours to set.

`DROP_PASSWORD` is the deployment's: without it, anyone who finds the page can drop a file in your
bucket — fine behind a proxy or on a private network, not fine on the open internet. With it, the
upload page asks once and sends it as a bearer token; the CLI passes it with `--token`. Picking a
file up never needs it, because the code is the secret.

The password on a transfer is the sender's, chosen on the form, one per transfer. It is hashed
with scrypt under its own salt and only the hash is stored, so nothing — not this deployment, not
you — can read it back or reset it; lose it and the transfer is only a file that expires. It is
asked for before the metadata, the preview, the download and the burn alike.

## Run it locally

```sh
cp .env.example .env.local   # point it at a bucket
npm install
npm run dev                  # http://localhost:3400
```

`.env.example` has a block for a MinIO on your laptop, which is the quickest way to try the real
code path with nothing to sign up for:

```sh
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"
```

Create the bucket once from the console at http://localhost:9001.

## From a terminal

The deployment speaks the s3nd protocol, so the CLI works against it from any machine, with the
password rather than S3 keys:

```sh
npx @s3nd/cli put ./deck.pdf --remote https://your.drop/api/transfers --token <password>
npx @s3nd/cli get k7qp-2m4x --remote https://your.drop/api/transfers

# a transfer someone put a password on: the same flag, their password
npx @s3nd/cli get k7qp-2m4x --remote https://your.drop/api/transfers --token <their password>
```

A transfer the CLI creates takes the deployment's defaults — no password, no note, the default
lifetime — because `--token` is the upload password and the CLI knows nothing of `x-drop-*`. To
put those on a transfer from a terminal, send the same headers by hand:

```sh
curl -X POST https://your.drop/api/transfers \
  -H 'content-type: application/pdf' \
  -H "x-s3nd-filename: $(printf %s deck.pdf | jq -sRr @uri)" \
  -H 'x-drop-expires-in: 3600' -H 'x-drop-once: 1' \
  -H 'x-drop-passphrase: open%20sesame' \
  --data-binary @deck.pdf
```

## What is where

| Path                                      |                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `app/page.tsx`, `components/drop.tsx`     | The front page: the drop zone, the staged file, the upload, the result with the code.         |
| `components/send-options.tsx`             | The form: lifetime, password, burn-after-download, name, device, note.                        |
| `components/file-preview.tsx`             | What a file looks like — image, video, audio, PDF, text — from a `blob:` or from the route.   |
| `lib/use-upload.ts`                       | The upload itself, over `XMLHttpRequest`, for a progress bar `fetch` cannot give.             |
| `components/pickup-form.tsx`              | "Already have a code?": the field, repaired as typed, that leads to the pickup page.          |
| `components/qr-code.tsx`                  | A QR code as inline SVG, from `uqr`.                                                          |
| `app/[code]/page.tsx`                     | The pickup page. Looks the code up through the handler, in-process.                           |
| `components/unlock-form.tsx`              | The password gate, and the cookie it earns for that one code.                                 |
| `components/pickup-actions.tsx`           | Download, copy the link, burn; burning steps forward once the download has started.           |
| `components/countdown.tsx`                | The time left, ticking, without a hydration mismatch.                                         |
| `app/opengraph-image.tsx`, `app/[code]/…` | The cards a shared link shows, drawn by `lib/og.tsx`.                                         |
| `app/api/transfers/[[...route]]/route.ts` | The protocol routes, and what this deployment adds in front of them.                          |
| `app/api/preview/[code]/route.ts`         | The same bytes, inline, sandboxed, never as a document this origin would run.                 |
| `app/api/unlock/[code]/route.ts`          | Checks a password and sets the cookie.                                                        |
| `lib/transfers.ts`                        | `createTransferHandler()`: one per lifetime, the download mode, the password check on `POST`. |
| `lib/guard.ts`                            | The object beside a transfer: note, device, one-time, and the scrypt hash of the password.    |
| `lib/options.ts`                          | The `x-drop-*` vocabulary, shared by the browser and the routes.                              |
| `lib/preview.ts`                          | What can be shown of a file, and what may be served inline at all.                            |
| `lib/store.ts`                            | `createBucket()`, built on the first request so a build never needs credentials.              |
| `lib/config.ts`                           | The `DROP_*` variables, parsed once.                                                          |
| `app/globals.css`                         | The identity: tokens, the split-flap tile, the hazard stripes, the drop zone.                 |

## Limits, honestly

- **4.5 MB on Vercel.** A file goes through the function, so Vercel's request limit applies, and
  `DROP_MAX_SIZE_MB` refuses anything larger before it is uploaded. Presigned browser uploads,
  which lift the limit, are on the s3nd roadmap; on a host without that limit, raise the variable.
- **No accounts, no history.** A code is a bearer token with an expiry. For anything sensitive,
  choose a short lifetime, put a password on it, tick burn-after-download, or encrypt before
  dropping.
- **One file per code.** Zip a folder first.
- **A preview costs what a download costs.** The bytes come through the function either way, so
  `DROP_PREVIEW_MAX_MB` is a ceiling and `DROP_PREVIEW=false` turns the whole thing off. Uploaded
  bytes are never served as a document this origin would run: the preview route answers with a
  type off a short allowlist (HTML included, as `text/plain`), `nosniff`, and a CSP sandbox.
- **Burn-after-download burns when the bytes leave the bucket**, not when they land. A download cut
  off halfway has still spent the code. That is the honest reading of "one download", and the
  reason the page says so before the click.
- **A password protects the transfer, not the code.** An unknown code and a locked one answer
  differently — one is a 404, the other a 401 — because whoever holds the code already knows it
  exists. What the password keeps back is everything else: the filename, the size, the preview and
  the bytes.
- **In `redirect` raw mode, a one-time transfer is streamed anyway.** A presigned URL would outlive
  the burn.

## Restyle it

Tailwind 4, two pages, no component library. The colours, the fonts and the corner radii are
tokens at the top of `app/globals.css`; the split-flap board and the amber are the s3nd.sh
identity, not the template's contract. The fonts under `app/fonts` are under the SIL Open Font
License; the two static `.ttf` weights are only there to draw the cards.

MIT © Abderrahmane Mouzoune
