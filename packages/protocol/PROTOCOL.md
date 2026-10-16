# The s3nd transfer protocol

This file is the normative description of the wire contract between a s3nd server and its clients.
The four core routes (`POST /`, `GET /:code`, `GET /:code/raw`, `DELETE /:code`) are described on
the [protocol page](../../apps/docs/content/docs/protocol.mdx) until #35 moves them here; this file
starts with the extension that does not fit there: presigned uploads.

The key words "MUST", "MUST NOT", "SHOULD" and "MAY" are to be read as in RFC 2119.

## Presigned uploads

### Why

Every byte of a proxied upload (`POST /` with the raw body) goes through the server, so the
runtime's request limit is the transfer limit: 4.5 MB on a Vercel function, 6 MB on synchronous
Lambda. A presigned upload takes the server out of the data path. The server signs a URL, the
client sends the bytes straight to the bucket, and the server checks the result.

Snapshots are unaffected. They are small, compressed JSON and keep going through `POST /`.

### Modes

A server is in one of three upload modes for files:

| Mode      | `POST /` with raw bytes | `POST /` with `upload: "presign"` |
| --------- | ----------------------- | --------------------------------- |
| `proxy`   | accepted                | `400 INVALID_REQUEST`             |
| `presign` | `400 INVALID_REQUEST`   | accepted                          |
| `both`    | accepted                | accepted                          |

`proxy` is the default, so a deployment that does not opt in behaves exactly as before. A client
that does not know the server's mode MAY try a presigned upload first and fall back to a proxied
one when the server answers `400 INVALID_REQUEST`. A server that predates this extension answers
the same way (it reads the request as a snapshot without `data`), so the fallback also works
against it.

### Flow

```
client                         server                          bucket
  │  POST / {upload:"presign"}   │                                │
  │ ───────────────────────────► │  reserves a code               │
  │  201 {code, uploadUrl, …}    │  signs PUT pending/<code>      │
  │ ◄─────────────────────────── │                                │
  │  PUT uploadUrl (the bytes)                                    │
  │ ────────────────────────────────────────────────────────────► │
  │  200                                                          │
  │ ◄──────────────────────────────────────────────────────────── │
  │  POST /:code/complete        │                                │
  │ ───────────────────────────► │  HEAD pending/<code>           │
  │                              │  checks size, copies it live   │
  │  201 CreatedTransfer         │                                │
  │ ◄─────────────────────────── │                                │
```

### 1. `POST /`: ask for an upload URL

Request, with `Content-Type: application/json`:

```json
{ "upload": "presign", "filename": "holiday.mov", "size": 734003200, "contentType": "video/quicktime" }
```

| Field         | Type   | Required | Meaning                                                             |
| ------------- | ------ | -------- | ------------------------------------------------------------------- |
| `upload`      | string | yes      | MUST be `"presign"`. It is what tells this request from a snapshot. |
| `filename`    | string | yes      | The original filename, non-empty.                                   |
| `size`        | number | yes      | The exact byte size the client will send, a positive integer.       |
| `contentType` | string | no       | The MIME type. When absent the server guesses from `filename`.      |

The server:

- MUST answer `400 INVALID_REQUEST` when the mode is `proxy`, or when a field is missing or has the
  wrong type;
- MUST answer `413 TOO_LARGE` when `size` is above its configured maximum, before signing anything;
- MUST pick the code itself, one that is neither live nor pending;
- MUST sign the URL so that the bucket only accepts a body of exactly `size` bytes, with the
  announced content type, at the pending location of that code.

Response, `201`:

```json
{
  "code": "K7QP2M4X",
  "uploadUrl": "https://bucket.s3.eu-west-3.amazonaws.com/transfers/pending/K7QP2M4X?X-Amz-…",
  "method": "PUT",
  "headers": { "content-type": "video/quicktime" },
  "expiresAt": "2026-10-16T12:15:00.000Z"
}
```

| Field       | Meaning                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| `code`      | The code the transfer will have. Until completion it reads as `404 NOT_FOUND`.                |
| `uploadUrl` | Where to send the bytes. Opaque to the client.                                                |
| `method`    | The HTTP method to use. `"PUT"` in this version.                                              |
| `headers`   | Headers the client MUST send with the bytes, exactly. The client also sends `Content-Length`. |
| `expiresAt` | When `uploadUrl` stops being accepted. Not the transfer's own expiry.                         |

### 2. The bytes, to the bucket

The client sends `method uploadUrl` with `headers` and a body of exactly `size` bytes. Anything else
(another length, another content type, a late request) is refused by the bucket, not by the
server. A browser needs a CORS rule on the bucket that allows `PUT` from its origin with the
`content-type` header; a client outside a browser does not.

The bucket's answer is the bucket's: a 2xx means the bytes are stored, anything else is a failure
the client reports as it is. A failed `PUT` MAY be retried against the same `uploadUrl` until
`expiresAt`.

### 3. `POST /:code/complete`: make the code live

No request body is needed; one is ignored.

The server:

- MUST answer `404 NOT_FOUND` when nothing is pending under the code and nothing is live either;
- MUST answer `201` with the same `CreatedTransfer` again when the code is already live and is a
  file, so a client that lost the first answer can retry;
- MUST check the stored size against the announced one, and against its configured maximum. On a
  mismatch it MUST delete the pending object and answer `400 INVALID_REQUEST` (size differs) or
  `413 TOO_LARGE`;
- MUST then make the transfer readable under the code exactly as a proxied file would be:
  `GET /:code` reports `kind: "file"`, `GET /:code/raw` serves the bytes, `DELETE /:code` burns it.
  The transfer's expiry runs from completion;
- SHOULD remove the pending object once the live one exists.

Response, `201`, the usual `CreatedTransfer`:

```json
{ "code": "K7QP2M4X", "kind": "file", "createdAt": "…", "expiresAt": "…", "size": 734003200 }
```

### Pending uploads expire

A client can ask for an upload URL and never complete it. The pending object then stays in the
bucket. A server MUST keep pending uploads under a prefix of their own (`createTransferHandler()`
uses `pending/` inside the bucket's prefix), so that a lifecycle rule can remove them, and SHOULD
document that rule. A pending upload is never handed over, whatever its age.

`DELETE /:code` on a pending code removes the pending object too.

### Limits

A single presigned `PUT` is capped at 5 GiB by S3, and so is the server-side copy that completion
performs. Larger files need presigned multipart parts, which this version does not specify.

### Progress

Nothing in the protocol carries progress: the client counts what it sends. In a browser, an
`XMLHttpRequest` reports `upload.onprogress`, which `fetch` does not.
