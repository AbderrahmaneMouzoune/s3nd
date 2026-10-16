# The s3nd transfer protocol, version 1

This is the normative text of the protocol between a s3nd server and its clients. The TypeScript
types in [`src/types.ts`](./src/types.ts) describe the same payloads; where the two disagree, this
document wins and the types are the bug. `createTransferHandler()` in `@s3nd/core` and
`createTransferClient()` in this package are one server and one client. Anything that follows this
document works with either of them.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be read as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## 1. Overview

A transfer is something stored behind a short code, so that a second device can fetch it by typing
that code. It is one of two kinds:

- a **snapshot**: structured application state, sent and handed back as JSON;
- a **file**: opaque bytes with a filename and a content type.

The server holds the storage credentials. A client never talks to storage directly, except through
a URL the server hands it (sections 5.3 and 8).

All routes are relative to a **base URL** where the server mounted them, for example
`https://drop.example.com/api/transfers`. In this document `/` is that base URL, and `/:code` is the
base URL followed by `/` and a code.

| Method   | Path              | Does                                     | Success |
| -------- | ----------------- | ---------------------------------------- | ------- |
| `POST`   | `/`               | Creates a snapshot or a file             | `201`   |
| `GET`    | `/:code`          | Describes a transfer                     | `200`   |
| `GET`    | `/:code/raw`      | Serves the bytes of a file               | `200`   |
| `DELETE` | `/:code`          | Burns a code                             | `204`   |
| `POST`   | `/:code/complete` | Completes a presigned upload (section 8) | `201`   |

Any other method on a route MUST be answered `INVALID_REQUEST`. Any path below the base URL that is
not one of these MUST be answered `NOT_FOUND`.

## 2. Versioning

### 2.1 The version header

The protocol version is a positive integer. This document describes version `1`.

Both sides carry it in the `s3nd-protocol` header (exported as `PROTOCOL_HEADER`):

- a client MUST send `s3nd-protocol: 1` on every request;
- a server MUST set `s3nd-protocol: 1` on every response it produces, errors and redirects
  included.

The value is the version as decimal digits, with nothing else.

### 2.2 Mismatch

A server receiving a request:

- **without** the header MUST treat it as version 1. Clients published before the header existed
  (0.x) speak version 1 without saying so, and keep working;
- with a version **equal to or lower** than its own MUST answer it;
- with a **higher** version, or with a value that is not a whole number, MUST refuse it with
  `UNSUPPORTED_PROTOCOL` (HTTP `400`), before reading the body and before any authorization
  check.

A client MAY read the response header to learn which version a server speaks. A response without
it comes from a server older than this document, which speaks version 1.

### 2.3 What changes the version

The version is bumped only when an existing route, payload or rule changes shape in a way an older
peer would misread. These do **not** bump it, and a peer MUST tolerate them:

- a new optional field in a response body (clients MUST ignore fields they do not know);
- a new error code (clients MUST handle an unknown code as they would `INTERNAL`, keeping the
  HTTP status);
- a new optional request header.

## 3. Codes

### 3.1 Shape

A code is a string of characters from an alphabet the server chooses. The default is eight
characters of [Crockford base32](https://www.crockford.com/base32.html),
`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, which is 40 bits. A server MAY configure another alphabet and
length; the client does not need to know them, because the server normalizes what it receives.

The **server** picks the code, never the client. A server MUST NOT overwrite a live transfer with
a new one: on the rare collision it picks another code, and only when it cannot find a free one
answers `CODE_TAKEN`.

### 3.2 Normalization

A code in a path is percent-decoded, then normalized before lookup, so that what a person typed
resolves to the code they were shown:

1. leading and trailing whitespace is removed, then every run of spaces, dashes and underscores;
2. when the alphabet has a single case, the input is upper-cased;
3. when the alphabet has `0` and no `O`, `O` reads as `0`; when it has `1`, `I` and `L` read as
   `1` unless the alphabet has them itself;
4. any remaining character outside the alphabet is an error.

A path segment that is not validly percent-encoded, or that does not normalize, MUST be answered
`INVALID_SYNC_CODE`. A code that normalizes but is stored nowhere is `NOT_FOUND`.

## 4. Transfers

### 4.1 Telling a snapshot from a file

`POST /` decides what it stores from the request headers, in this order:

1. an `x-s3nd-filename` header is present: a **file**, whatever the `content-type`;
2. otherwise a `content-type` of `application/json`: a **snapshot**;
3. otherwise: a **file**, named `file`.

A client creating a file MUST send `x-s3nd-filename`, and a client creating a snapshot MUST NOT.
That is what lets a `.json` file travel as a file.

### 4.2 Expiry

A server MAY give transfers a lifetime. When it does, `expiresAt` is an ISO 8601 date in the
`201` body and in `GET /:code`, and is absent for a transfer that does not expire.

A server MUST NOT hand over a transfer past its `expiresAt`, on any route: it answers `NOT_FOUND`,
exactly as for a code that never existed. Telling the two apart would let someone probe which
codes have been used.

Expiry is enforced when a transfer is read. Whether and when the stored object itself is removed
is the server's business (with `@s3nd/core`, a bucket lifecycle rule).

### 4.3 Size

A server MAY limit the size of what it stores. When a request is over that limit, it MUST answer
`TOO_LARGE` (HTTP `413`), and it MUST do so without reading more of the body than the limit: a
`content-length` over the limit is refused before the body is read, and a body without one, or
whose `content-length` lies, is cut off once the limit is crossed. A client SHOULD NOT assume that
a body a server accepted once will be accepted again.

> **To be specified.** How a server announces its limit before a request (a discovery route or a
> response header) is not part of version 1 yet.

## 5. Routes

### 5.1 `POST /`: create a transfer

**A snapshot.** `content-type: application/json`, no `x-s3nd-filename`, and a body:

```json
{ "data": { "notes": ["one"] }, "version": 3, "device": "Pixel 8" }
```

| Field     | Type    | Required | Meaning                                                         |
| --------- | ------- | -------- | --------------------------------------------------------------- |
| `data`    | any     | yes      | The state. Any JSON value, `null` included                      |
| `version` | integer | no       | The writing application's schema version                        |
| `device`  | string  | no       | A free label for the sending device, shown to the receiving one |

A body that is not valid JSON, or not an object with a `data` property, MUST be answered
`INVALID_REQUEST`.

**A file.** The body is the raw bytes. `x-s3nd-filename` carries the original filename,
percent-encoded as by `encodeURIComponent` so it survives a header. `content-type` is the file's
type; a client that does not know it sends `application/octet-stream` or nothing, and the server
MAY infer one from the filename. An empty body MUST be answered `INVALID_REQUEST`.

**Response.** `201`, with:

```json
{ "code": "K7QP2M4X", "kind": "snapshot", "createdAt": "2026-01-01T00:00:00.000Z", "expiresAt": "…", "size": 412 }
```

| Field         | Type                     | Meaning                                                                       |
| ------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `code`        | string                   | What the user carries to the other device                                     |
| `kind`        | `"snapshot"` \| `"file"` | What was stored                                                               |
| `createdAt`   | ISO 8601 date            |                                                                               |
| `expiresAt`   | ISO 8601 date            | Absent when the transfer does not expire                                      |
| `size`        | integer                  | Stored size in bytes, after compression for a snapshot                        |
| `deleteToken` | string                   | Proof of the right to burn the code (section 5.4), when the server issues one |

### 5.2 `GET /:code`: describe a transfer

`200`, with what is known about the transfer:

| Field         | Type                     | Present for                            |
| ------------- | ------------------------ | -------------------------------------- |
| `code`        | string                   | both; the canonical form               |
| `kind`        | `"snapshot"` \| `"file"` | both                                   |
| `createdAt`   | ISO 8601 date            | both                                   |
| `expiresAt`   | ISO 8601 date            | both, when the transfer expires        |
| `size`        | integer                  | both, when known                       |
| `device`      | string                   | snapshots, when the sender gave one    |
| `app`         | string                   | snapshots, when the server records one |
| `version`     | integer                  | snapshots, when the sender gave one    |
| `data`        | any                      | snapshots: the state, inline           |
| `filename`    | string                   | files                                  |
| `contentType` | string                   | files                                  |

A file's bytes are not in this body; they are at `/:code/raw`.

A server MAY refuse to hand over a snapshot written with a schema `version` newer than it accepts,
with `SNAPSHOT_TOO_NEW`.

### 5.3 `GET /:code/raw`: the bytes of a file

`200`, with the bytes as the body, the stored `content-type`, and a
`content-disposition: attachment; filename*=UTF-8''<percent-encoded name>` when the file has a
name.

Instead of serving the bytes itself, a server MAY answer `302` with a `location` it signed, so the
bytes do not transit through it. It MUST apply the same checks first: a code that is unknown,
expired or not a file is not redirected.

`/raw` serves files only. On a code that holds a snapshot, a server MUST answer `NOT_FOUND`, as if
nothing were there: a snapshot's state is read from `GET /:code`, and its stored form is not part
of the protocol.

### 5.4 `DELETE /:code`: burn a code

`204`, no body. Deleting a code that is already gone, or never existed, is not an error and MUST
also answer `204`: a client burning a code after a successful restore should not have to care
whether it won that race.

**Delete tokens.** Knowing a code is enough to read a transfer, and by default to burn it, so
someone who saw the code go by can destroy a transfer before its recipient reads it. A server MAY
issue a **delete token** when it creates a transfer, as `deleteToken` in the `201` body
(sections 5.1 and 8.6):

- the token MUST be unpredictable, with at least 128 bits of entropy (`createTransferHandler()`
  uses 32 random bytes, base64url);
- the server MUST NOT store it in clear: it keeps a one-way hash (SHA-256), so reading the bucket
  does not give the token away, and it compares hashes in constant time;
- it is returned once, in the creation answer, and never again.

A client sends it with `DELETE /:code`, in the `x-s3nd-delete-token` header, or as
`authorization: Bearer <token>`. When both are present, `x-s3nd-delete-token` is the token: the
`authorization` header may be carrying the server's own credentials.

A server that **requires** the token (`protectDelete` on `createTransferHandler()`):

- MUST answer `401 UNAUTHORIZED` to a `DELETE` without a token, without looking the code up;
- MUST answer `401 UNAUTHORIZED` when the transfer exists and the token does not match;
- MUST answer `204` when a token is sent and nothing is stored under the code any more, as above.

A transfer created before the server issued tokens carries no hash; a server requiring tokens
MUST refuse to burn it with `401`, and leaves it to expire.

**Burn after read.** A server MAY delete a transfer once it has been handed over: a snapshot after
the first `200` of `GET /:code`, a file after the first `200` of `GET /:code/raw` has been sent in
full. A client SHOULD NOT assume a code can be read twice. Two reads racing each other can both
succeed; burning after read is a cleanup, not a lock.

## 6. Errors

### 6.1 The error body

Every response with a status outside `2xx` and `3xx` MUST carry a JSON body of this shape, with
`content-type: application/json`, whatever went wrong, unexpected failures included:

```json
{ "error": { "code": "NOT_FOUND", "message": "Unknown or expired code." } }
```

`code` is one of the codes below. `message` is meant for a developer, not for an end user, and a
client MUST NOT branch on it. For `INTERNAL`, a server SHOULD keep the message generic: the
underlying error can name a bucket or a storage internal.

The one exception is a response produced by the server's own authorization layer, which MAY answer
with any status and body it likes.

### 6.2 Error codes

| Code                   | HTTP  | Meaning                                                                  |
| ---------------------- | ----- | ------------------------------------------------------------------------ |
| `INVALID_REQUEST`      | `400` | Malformed body, or a method the route does not serve                     |
| `INVALID_SYNC_CODE`    | `400` | The code in the path cannot be a code (section 3.2)                      |
| `UNSUPPORTED_PROTOCOL` | `400` | The request announced a protocol version the server does not speak (2.2) |
| `UNAUTHORIZED`         | `401` | Authorization refused                                                    |
| `NOT_FOUND`            | `404` | No such code, or it expired, or no such route                            |
| `CODE_TAKEN`           | `409` | The server found no free code                                            |
| `SNAPSHOT_TOO_NEW`     | `409` | The snapshot's schema version is newer than the server accepts           |
| `TOO_LARGE`            | `413` | Over the server's size limit (section 4.3)                               |
| `RATE_LIMITED`         | `429` | Too many requests from this client; try again later (section 9)          |
| `INTERNAL`             | `500` | Anything else                                                            |

A client SHOULD treat a non-2xx response that does not carry this body (a proxy's error page, a
platform limit) by its status: `401` and `403` as `UNAUTHORIZED`, `429` as `RATE_LIMITED`, anything
else as `INTERNAL`.
Likewise, a `2xx` whose body is not JSON, or not the shape section 5 describes, is `INTERNAL`.

`TIMEOUT` is not in this table on purpose. `createTransferClient()` uses it when a call takes longer
than the client allowed; a server MUST NOT send it.

## 7. Cross-origin requests

A browser page on another origin than the server can only call it if the server answers
[CORS](https://fetch.spec.whatwg.org/#http-cors-protocol). Every client request carries
`s3nd-protocol`, and file uploads `x-s3nd-filename`, so every cross-origin request is preflighted.
A server that accepts cross-origin requests:

- MUST answer an `OPTIONS` preflight on any route with `204`, before any authorization check, since
  a browser sends no credentials with it;
- MUST, for an allowed origin, set on the preflight answer
  - `access-control-allow-origin`: that origin, or `*` when any origin is allowed,
  - `access-control-allow-methods`: at least `GET, POST, DELETE`,
  - `access-control-allow-headers`: at least `content-type`, `authorization`, `s3nd-protocol` and
    `x-s3nd-filename`;
- MUST set `access-control-allow-origin` on every other response to an allowed origin, **errors
  included**, so that the client can read the error body (section 6.1), and
  `access-control-expose-headers` with at least `s3nd-protocol` and `content-disposition`;
- MUST NOT combine `access-control-allow-origin: *` with `access-control-allow-credentials: true`;
- SHOULD send `vary: origin` when the answer depends on the origin.

A refused origin simply gets no `access-control-allow-origin`; the browser then withholds the
response from the page. A server that does not accept cross-origin requests MAY answer `OPTIONS`
with `INVALID_REQUEST`.

## 8. Uploads straight to storage

### 8.1 Why

Every byte of a proxied upload (`POST /` with the raw body) goes through the server, so the
runtime's request limit is the transfer limit: 4.5 MB on a Vercel function, 6 MB on synchronous
Lambda. A presigned upload takes the server out of the data path. The server signs a URL, the
client sends the bytes straight to the bucket, and the server checks the result.

Snapshots are unaffected. They are small, compressed JSON and keep going through `POST /`.

### 8.2 Modes

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

### 8.3 Flow

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

### 8.4 `POST /` with `upload: "presign"`: ask for an upload URL

Request, with `content-type: application/json` and no `x-s3nd-filename` (section 4.1), which is
what routes it away from file creation; the `upload` field is what tells it from a snapshot:

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

### 8.5 The bytes, to the bucket

The client sends `method uploadUrl` with `headers` and a body of exactly `size` bytes. Anything else
(another length, another content type, a late request) is refused by the bucket, not by the
server. A browser needs a CORS rule on the bucket that allows `PUT` from its origin with the
`content-type` header; a client outside a browser does not.

The bucket's answer is the bucket's: a 2xx means the bytes are stored, anything else is a failure
the client reports as it is. A failed `PUT` MAY be retried against the same `uploadUrl` until
`expiresAt`.

### 8.6 `POST /:code/complete`: make the code live

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

A server that issues delete tokens (section 5.4) issues this transfer's here. A repeated
completion answers without one: the token is never handed out twice.

### 8.7 Pending uploads expire

A client can ask for an upload URL and never complete it. The pending object then stays in the
bucket. A server MUST keep pending uploads under a prefix of their own (`createTransferHandler()`
uses `pending/` inside the bucket's prefix), so that a lifecycle rule can remove them, and SHOULD
document that rule. A pending upload is never handed over, whatever its age.

`DELETE /:code` on a pending code removes the pending object too.

### 8.8 Limits

A single presigned `PUT` is capped at 5 GiB by S3, and so is the server-side copy that completion
performs. Larger files need presigned multipart parts, which this version does not specify.

### 8.9 Progress

Nothing in the protocol carries progress: the client counts what it sends. In a browser, an
`XMLHttpRequest` reports `upload.onprogress`, which `fetch` does not.

## 9. Rate limiting

A code is a bearer secret, and a short one can be guessed. A server SHOULD limit how many requests
a client makes against routes that take a code (`GET /:code`, `GET /:code/raw`,
`DELETE /:code`, `POST /:code/complete`), and MAY limit `POST /` too, which fills storage.

A request refused for that reason:

- MUST be answered `429` with the `RATE_LIMITED` error body (section 6.1);
- SHOULD carry `retry-after`, in seconds, when the server knows when the client may try again;
- MUST be refused before the code is looked up, so that a refused guess says nothing about the
  code it guessed.

A client MUST treat `RATE_LIMITED` as a failure worth retrying later, and SHOULD wait at least
`retry-after` before it does. It MUST NOT retry in a tight loop.

How a server identifies a client (an address, an account, a key), and what the limits are, is the
server's own business. The strength a code needs depends on it: with the default eight Crockford
characters (40 bits), guessing one live code is out of reach even without a limit; four digits (13
bits) are not, and are only reasonable behind a strict limit, a short lifetime and burn after read.

## 10. Security considerations

- **A code is a bearer secret.** Whoever holds it can read the transfer, and burn it unless the
  server requires a delete token (section 5.4). Its strength is
  its entropy: 40 bits for the default, far less for a short numeric code, which then relies on
  rate limiting (section 9) and a short lifetime.
- **Expired and unknown look the same** (section 4.2), so the protocol does not reveal which codes
  were ever issued.
- **Authorization is the server's.** The protocol does not define credentials. A server without
  any lets anyone with network access create transfers in its storage.
- **Nothing is encrypted end to end.** The server, and whoever runs the storage, can read every
  transfer. Use HTTPS between client and server.
- **Error messages are not a channel.** A server SHOULD NOT put storage details in an error body
  (section 6.1).
