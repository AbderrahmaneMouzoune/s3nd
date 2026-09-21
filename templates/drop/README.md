# s3nd drop

A small WeTransfer on your own bucket. Drop a file, get an eight-character code, a link and a QR
code; type the code or scan it on any device until it expires, then burn it. Two pages and one
route, built on [s3nd](https://s3nd.sh), on top of the S3-compatible bucket you already have:
Cloudflare R2, AWS S3, MinIO, Scaleway, Wasabi.

Try it at [drop.s3nd.sh](https://drop.s3nd.sh), then deploy your own:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAbderrahmaneMouzoune%2Fs3nd%2Ftree%2Fmain%2Ftemplates%2Fdrop&project-name=s3nd-drop&repository-name=s3nd-drop&env=S3ND_BUCKET%2CS3ND_ENDPOINT%2CS3ND_REGION%2CAWS_ACCESS_KEY_ID%2CAWS_SECRET_ACCESS_KEY&envDescription=An%20S3-compatible%20bucket%20and%20a%20key%20pair%20scoped%20to%20it.%20R2%2C%20S3%2C%20MinIO%2C%20Scaleway%20and%20Wasabi%20all%20work.&envLink=https%3A%2F%2Fs3nd.sh%2Fproviders)

| Page               | Does                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/`                | The drop zone, and under it "already have a code?": type it, typos repaired, and land on the pickup page.   |
| `/K7QP2M4X`        | The pickup page: filename, size, time left, a download button, a QR code for another device, a way to burn. |
| `/api/transfers/*` | The four-route [transfer protocol](https://doc.s3nd.sh/docs/protocol), so the CLI works too.                |

No account, no relay, nothing in the middle. The code is the whole handshake: whoever has it can
pick the file up while it lives, and an unknown or expired code answers the same 404 as one that
never existed.

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

Then burn it. The pickup page offers to as soon as the download has started, and the sender's
result page has a burn button too; whichever side does it, the sender's page notices the code is
gone (it asks the bucket every few seconds, for ten minutes at most). A code left alone expires
on its own; burning just means nothing waits in the bucket meanwhile.

Sharing a link somewhere with previews (a chat, a social network) shows a card for it:
`app/opengraph-image.tsx` draws the front page's, and `app/[code]/opengraph-image.tsx` draws the
pickup page's with the filename, the size and the time left. Whoever holds the link already holds
the code, so the card gives nothing away that the URL did not.

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

The bucket is configured through the variables `s3nd` already reads. Everything else is optional.

| Variable                | Required | Default  | What it does                                                                             |
| ----------------------- | :------: | -------- | ---------------------------------------------------------------------------------------- |
| `S3ND_BUCKET`           |   yes    |          | The bucket name.                                                                         |
| `S3ND_ENDPOINT`         |    R2    |          | The provider's S3 endpoint. Leave empty for AWS S3 proper.                               |
| `S3ND_REGION`           |          | `auto`   | `auto` for R2 and most S3-compatible providers; a real region for AWS and Scaleway.      |
| `AWS_ACCESS_KEY_ID`     |   yes    |          | The key pair. On AWS you can leave both out and use a role instead.                      |
| `AWS_SECRET_ACCESS_KEY` |   yes    |          |                                                                                          |
| `S3ND_PREFIX`           |          | `drop`   | The folder in the bucket every transfer lands in. Put the lifecycle rule on it.          |
| `DROP_PASSWORD`         |          |          | Ask for it before an upload. Picking up never asks. See the note below.                  |
| `DROP_EXPIRES_IN`       |          | `86400`  | Seconds a transfer lives. One day.                                                       |
| `DROP_MAX_SIZE_MB`      |          | `4`      | The largest file accepted. Vercel functions take 4.5 MB per request.                     |
| `DROP_RAW_MODE`         |          | `stream` | `stream` pipes downloads through the function; `redirect` presigns them from the bucket. |
| `DROP_NAME`             |          | `drop`   | The name in the header and the page title.                                               |
| `DROP_URL`              |          | Vercel's | The public URL, for absolute links. Vercel's production domain when unset.               |

**About the password.** Without `DROP_PASSWORD`, anyone who finds the page can drop a file in your
bucket: fine behind a proxy or on a private network, not fine on the open internet. With it, the
upload page asks once and sends it as a bearer token; the CLI passes it with `--token`. Picking a
file up never needs it, because the code is the secret.

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
```

## What is where

| Path                                      |                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `app/page.tsx`, `components/drop.tsx`     | The front page: the drop zone, the upload, the result with the code, the link and the QR. |
| `components/pickup-form.tsx`              | "Already have a code?": the field, repaired as typed, that leads to the pickup page.      |
| `components/qr-code.tsx`                  | A QR code as inline SVG, from `uqr`.                                                      |
| `app/[code]/page.tsx`                     | The pickup page. Looks the code up through the handler, in-process.                       |
| `components/pickup-actions.tsx`           | Download, copy the link, burn; burning steps forward once the download has started.       |
| `app/opengraph-image.tsx`, `app/[code]/…` | The cards a shared link shows, drawn by `lib/og.tsx`.                                     |
| `app/api/transfers/[[...route]]/route.ts` | The protocol routes: one line each.                                                       |
| `lib/transfers.ts`                        | `createTransferHandler()`: expiry, download mode, the password check on `POST`.           |
| `lib/store.ts`                            | `createBucket()`, built on the first request so a build never needs credentials.          |
| `lib/config.ts`                           | The `DROP_*` variables, parsed once.                                                      |
| `app/globals.css`                         | The identity: tokens, the split-flap tile, the hazard stripes, the drop zone.             |

## Limits, honestly

- **4.5 MB on Vercel.** A file goes through the function, so Vercel's request limit applies, and
  `DROP_MAX_SIZE_MB` refuses anything larger before it is uploaded. Presigned browser uploads,
  which lift the limit, are on the s3nd roadmap; on a host without that limit, raise the variable.
- **No accounts, no history.** A code is a bearer token with an expiry. For anything sensitive,
  shorten `DROP_EXPIRES_IN`, set a password, or encrypt before dropping.
- **One file per code.** Zip a folder first.

## Restyle it

Tailwind 4, two pages, no component library. The colours, the fonts and the corner radii are
tokens at the top of `app/globals.css`; the split-flap board and the amber are the s3nd.sh
identity, not the template's contract. The fonts under `app/fonts` are under the SIL Open Font
License; the two static `.ttf` weights are only there to draw the cards.

MIT © Abderrahmane Mouzoune
