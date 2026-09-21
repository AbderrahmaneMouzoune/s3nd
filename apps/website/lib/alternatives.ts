/**
 * Comparison pages. Each entry describes the other tool in its own terms first,
 * then where the two overlap and where they part ways. The point is to send a
 * reader to the right tool, which is sometimes not this one.
 */

export type AlternativeCategory = 'file-transfer' | 'file-sharing' | 'sync-engine' | 'storage-tooling'

export const categories: Record<AlternativeCategory, { title: string; blurb: string }> = {
  'file-transfer': {
    title: 'Command-line file transfer',
    blurb: 'Tools that move a file between two machines with a code. The closest cousins of the CLI.',
  },
  'file-sharing': {
    title: 'File sharing for people',
    blurb: 'Upload, get a link, send it to someone. Products first, primitives second.',
  },
  'sync-engine': {
    title: 'Local-first sync engines',
    blurb: 'Continuous, multi-user synchronization between a client database and a backend. A different, bigger job.',
  },
  'storage-tooling': {
    title: 'Storage tooling',
    blurb: 'General-purpose tools for talking to a bucket. Broader than s3nd, and without the code.',
  },
}

export const matrixDimensions = [
  { key: 'shape', label: 'What it is' },
  { key: 'storage', label: 'Where the data lives' },
  { key: 'online', label: 'Both ends online at once' },
  { key: 'browser', label: 'From inside your web app' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'price', label: 'Price' },
  { key: 'license', label: 'License' },
] as const

export type MatrixKey = (typeof matrixDimensions)[number]['key']

export const s3ndMatrix: Record<MatrixKey, string> = {
  shape: 'A CLI, a library and React hooks over your own S3 bucket',
  storage: 'Your bucket: S3, R2, MinIO, Scaleway, Wasabi',
  online: 'No. The code is redeemed later, until it expires',
  browser: 'Yes, through one route on your server',
  accounts: 'None. The code is the whole handshake',
  hosting: 'Your bucket, plus your server when a browser takes part',
  price: 'Free. You pay your storage provider for a few objects that expire',
  license: 'MIT',
}

export interface Alternative {
  slug: string
  name: string
  category: AlternativeCategory
  website: string
  /** The page title: "s3nd as a … alternative". */
  headline: string
  /** The other tool, described fairly and in its own terms. */
  what: string
  /** Where the two genuinely overlap. */
  overlap: string
  differences: { title: string; body: string }[]
  pickThem: string[]
  pickS3nd: string[]
  matrix: Record<MatrixKey, string>
  keywords: string[]
}

export const alternatives: Alternative[] = [
  {
    slug: 'magic-wormhole',
    name: 'Magic Wormhole',
    category: 'file-transfer',
    website: 'https://magic-wormhole.readthedocs.io',
    headline: 'A Magic Wormhole alternative that goes through your own bucket',
    what: 'A command-line tool that sends files and directories from one computer to another with a short, human-readable code such as 7-crossover-clockwork. The two sides run a PAKE, so the code both finds the peer and keys the encryption; the bytes travel directly between the machines, or through a transit relay when they cannot reach each other.',
    overlap:
      'Both hand you a short code in a terminal, both are open source, and both exist for a person carrying something from one machine to another without an account.',
    differences: [
      {
        title: 'Asynchronous, not live',
        body: 'Wormhole needs both ends running at the same time: the sender waits until the receiver enters the code. s3nd writes to the bucket and exits. The code is redeemed whenever the other machine gets to it, until the transfer expires.',
      },
      {
        title: 'Your bucket, not a relay',
        body: 'Wormhole goes through a rendezvous server and, when direct connection fails, a transit relay; public ones by default, yours if you run them. s3nd stores the object in a bucket you already own, and there is no relay to run or trust.',
      },
      {
        title: 'Where the encryption comes from',
        body: 'Wormhole is end-to-end encrypted by construction. s3nd is encrypted in transit and at rest by your provider; end to end is yours to add by encrypting before sending, and the code is a bearer token that a short expiry and a rate limit protect.',
      },
      {
        title: 'Also a library',
        body: 'Wormhole is a tool for people at keyboards. s3nd ships the same primitive as a library and React hooks, so a web app can move its own IndexedDB state with the same code.',
      },
    ],
    pickThem: [
      'You want end-to-end encryption without thinking about it.',
      'Both machines are online and you are at both keyboards.',
      'You have no bucket and would rather not create one.',
    ],
    pickS3nd: [
      'The sender leaves before the receiver arrives.',
      'You already pay for a bucket and want the bytes to stay in it.',
      'The thing moving is an app’s state, not a file on disk.',
    ],
    matrix: {
      shape: 'CLI file transfer with a spoken code',
      storage: 'In transit only: peer to peer, or through a transit relay',
      online: 'Yes',
      browser: 'No, terminal first',
      accounts: 'None',
      hosting: 'Public rendezvous and relay servers by default; self-hostable',
      price: 'Free',
      license: 'MIT',
    },
    keywords: ['magic wormhole alternative', 'magic-wormhole vs', 'send file with code terminal'],
  },
  {
    slug: 'croc',
    name: 'croc',
    category: 'file-transfer',
    website: 'https://github.com/schollz/croc',
    headline: 'A croc alternative with nothing running between the two machines',
    what: 'A Go command-line tool for sending files and folders between any two computers with a code phrase. It uses a PAKE for end-to-end encryption, a relay to get through NATs, resumes interrupted transfers, and ships as a single binary for every platform.',
    overlap:
      'A code in a terminal, no account, open source, and a sender who does not want to think about networks. croc is the tool most people reach for when they want exactly what the s3nd CLI does.',
    differences: [
      {
        title: 'Live versus stored',
        body: 'croc streams while both ends are connected. s3nd stores the object and leaves; the code works later, from a machine that was off when the transfer was made.',
      },
      {
        title: 'A relay versus a bucket',
        body: 'croc uses a public relay by default and lets you run your own. s3nd uses the bucket you already have, with the provider’s durability, lifecycle rules and billing.',
      },
      {
        title: 'Resume and size',
        body: 'croc resumes a broken transfer and handles very large files well. s3nd does a single PutObject today, which is right for snapshots and ordinary files; multipart is on the roadmap.',
      },
      {
        title: 'A primitive, not only a tool',
        body: 'The same code that runs the CLI runs in a Next.js route and behind React hooks, so an application can offer the same move-with-a-code to its users.',
      },
    ],
    pickThem: [
      'Both ends are online and you want end-to-end encryption for free.',
      'Multi-gigabyte files where resume matters.',
      'No cloud account of any kind, not even a bucket.',
    ],
    pickS3nd: [
      'The two machines are never online at the same time.',
      'A server in front, handing out tokens instead of S3 keys, for a team.',
      'A web app moving its own data, with the CLI as a bonus.',
    ],
    matrix: {
      shape: 'CLI file transfer with a code phrase',
      storage: 'In transit only, through a relay',
      online: 'Yes',
      browser: 'No',
      accounts: 'None',
      hosting: 'Public relay by default; self-hostable',
      price: 'Free',
      license: 'MIT',
    },
    keywords: ['croc alternative', 'croc vs', 'file transfer code cli'],
  },
  {
    slug: 'wetransfer',
    name: 'WeTransfer',
    category: 'file-sharing',
    website: 'https://wetransfer.com',
    headline: 'A WeTransfer alternative that keeps the file in your own bucket',
    what: 'A hosted file-sharing service: upload in the browser, get a link, email it. The free tier has a size limit and an expiry, and paid plans raise the limit, add password protection and keep files longer. It is a product for people, polished and familiar.',
    overlap:
      'Someone has a file, someone else needs it, and neither wants to set anything up. Both hand over a short thing, a link or a code, that expires.',
    differences: [
      {
        title: 'Their servers versus your bucket',
        body: 'A WeTransfer upload lives on WeTransfer’s infrastructure under their terms. An s3nd transfer lives in your bucket, under your retention rule, and nowhere else.',
      },
      {
        title: 'A product versus a primitive',
        body: 'WeTransfer is a web page. s3nd is a command you can put in a script or a CI job, a route you can mount in your API, and hooks you can put in your React app.',
      },
      {
        title: 'A link versus a code',
        body: 'A link is pasted; a code is read out loud or typed off another screen. Both work; s3nd’s codes are built to survive being misread, with the confusable letters removed and repaired.',
      },
      {
        title: 'No interface',
        body: 's3nd ships no upload page. If the recipient is a non-technical person clicking an email, WeTransfer is the better experience, and the honest answer.',
      },
    ],
    pickThem: [
      'Sending to someone who will click a link in an email.',
      'No infrastructure at all, not even a bucket.',
      'A polished upload and download experience is the point.',
    ],
    pickS3nd: [
      'The data should never leave your storage provider.',
      'The transfer is automated: a script, a workflow, an app.',
      'What moves is an app’s state, not a file for a person.',
    ],
    matrix: {
      shape: 'Hosted file sharing by link',
      storage: 'WeTransfer’s servers',
      online: 'No',
      browser: 'Their web app, not yours',
      accounts: 'Optional on the free tier, required on paid plans',
      hosting: 'Hosted only',
      price: 'Free tier, paid plans',
      license: 'Proprietary',
    },
    keywords: ['wetransfer alternative', 'self-hosted wetransfer', 'wetransfer alternative open source'],
  },
  {
    slug: 'firefox-send',
    name: 'Firefox Send',
    category: 'file-sharing',
    website: 'https://github.com/timvisee/send',
    headline: 'A Firefox Send alternative that needs nothing deployed',
    what: 'Mozilla’s end-to-end encrypted file-sharing service: upload, get a link, and the file expired after a number of downloads or a period of time. Mozilla shut the service down in 2020. The code was open source, and community forks, notably timvisee’s Send, keep it alive as something you host yourself.',
    overlap:
      'Short-lived transfers that expire on their own, no account, open source, and a design that assumes the server should not be trusted with the contents.',
    differences: [
      {
        title: 'A web app to deploy versus a route to mount',
        body: 'A Send fork is a whole application: a Node server, a Redis, a storage backend, a front end. s3nd is a library you call from your own API, or a CLI that talks to the bucket with nothing running at all.',
      },
      {
        title: 'Encryption built in versus encryption you add',
        body: 'Send encrypts in the browser and puts the key in the URL fragment. s3nd stores whatever bytes you hand it, so the same design is a few lines of WebCrypto on your side, documented in the encrypted sync guide.',
      },
      {
        title: 'Files for people versus state for apps',
        body: 'Send moves a file to a person with a link. s3nd also moves a database to another device with a code, with schema versions and expiry enforced on read.',
      },
    ],
    pickThem: [
      'You want a shareable-link web page for people, self-hosted.',
      'End-to-end encryption in the browser, out of the box.',
    ],
    pickS3nd: [
      'No application to run: a bucket and, at most, one route in the app you already have.',
      'Moving app state, not only files.',
      'The CLI to a bucket, with nothing deployed anywhere.',
    ],
    matrix: {
      shape: 'End-to-end encrypted file sharing by link; discontinued, forks are self-hostable',
      storage: 'The Send server’s storage; forks can use S3',
      online: 'No',
      browser: 'Its own web app',
      accounts: 'None',
      hosting: 'Self-hosted forks only',
      price: 'Free',
      license: 'MPL-2.0',
    },
    keywords: ['firefox send alternative', 'firefox send replacement', 'self-hosted encrypted file sharing'],
  },
  {
    slug: 'pairdrop',
    name: 'PairDrop',
    category: 'file-sharing',
    website: 'https://github.com/schlagmichdoch/PairDrop',
    headline: 'A PairDrop alternative for when the other device is not in the room',
    what: 'A browser-based, peer-to-peer file transfer between devices on the same network, in the spirit of AirDrop and a fork of Snapdrop: open the page on both devices, they see each other, drop the file. WebRTC carries the bytes and a small signaling server introduces the peers. Pairing across networks is possible with a code.',
    overlap:
      'No account, no install, open source, and a person moving something between two of their own devices. Both keep the bytes away from a third party.',
    differences: [
      {
        title: 'Now versus later',
        body: 'PairDrop works while both devices have the page open. s3nd stores the transfer in the bucket, and the other device picks it up when it is switched on, for as long as the transfer lives.',
      },
      {
        title: 'Nothing stored versus stored in your bucket',
        body: 'PairDrop keeps nothing anywhere, which is a feature. s3nd keeps the object until it expires, which is a different feature: the transfer survives a closed tab.',
      },
      {
        title: 'A page for people versus a primitive for apps',
        body: 'PairDrop is the interface. s3nd is what you build an interface on, in your app, with a code its users type.',
      },
    ],
    pickThem: [
      'Two devices in the same room, right now.',
      'Nothing should be written anywhere, ever.',
      'A URL on both sides and no setup is the whole requirement.',
    ],
    pickS3nd: [
      'The other device is not here yet, or not switched on.',
      'A script or an app is one side of the transfer, not a person with a tab.',
      'You want the transfer to live, briefly, in a bucket you control.',
    ],
    matrix: {
      shape: 'Browser peer-to-peer transfer on a local network',
      storage: 'Nowhere: peer to peer',
      online: 'Yes, at the same time',
      browser: 'Its own web page',
      accounts: 'None',
      hosting: 'Public instance, self-hostable',
      price: 'Free',
      license: 'GPL-3.0',
    },
    keywords: ['pairdrop alternative', 'snapdrop alternative', 'airdrop alternative cross platform'],
  },
  {
    slug: 'transfer-sh',
    name: 'transfer.sh',
    category: 'file-sharing',
    website: 'https://github.com/dutchcoders/transfer.sh',
    headline: 'A transfer.sh alternative with no service to run',
    what: 'A file-sharing service you drive with curl: PUT a file, get a URL back, share it. Written in Go, self-hostable, with pluggable storage backends that include S3. The public instance made it famous; the self-hosted server is what teams actually run.',
    overlap:
      'Terminal-first sharing, a short secret to hand over, and an expiry. Both are happy to store the object in an S3 bucket.',
    differences: [
      {
        title: 'A server you run versus a bucket you have',
        body: 'transfer.sh is a service in front of storage. The s3nd CLI is the bucket with no service in front; when you do want a server, it is a route inside the API you already deploy.',
      },
      {
        title: 'A URL versus a code',
        body: 'A transfer.sh link carries a random path that is the secret. An s3nd code is eight characters designed to be read aloud, with the confusable letters removed and repaired on the way back.',
      },
      {
        title: 'Files versus files and state',
        body: 'transfer.sh moves files. s3nd moves files and snapshots of application state, with schema versions and conditional writes, from a library as well as a command.',
      },
    ],
    pickThem: ['A curl-able upload endpoint for a team, with links.', 'You already run it and it works.'],
    pickS3nd: [
      'Nothing to run: the CLI talks straight to the bucket.',
      'Codes people can read out loud rather than URLs to paste.',
      'App state with versioning and expiry enforced on read.',
    ],
    matrix: {
      shape: 'Self-hostable upload service with links',
      storage: 'Its server’s storage; an S3 backend is available',
      online: 'No',
      browser: 'By URL',
      accounts: 'None',
      hosting: 'Self-hosted',
      price: 'Free',
      license: 'MIT',
    },
    keywords: ['transfer.sh alternative', 'curl upload file share', 'self-hosted file upload cli'],
  },
  {
    slug: 'dexie-cloud',
    name: 'Dexie Cloud',
    category: 'sync-engine',
    website: 'https://dexie.org/cloud/',
    headline: 'A Dexie Cloud alternative for apps that have no accounts',
    what: 'A sync service for Dexie.js, the IndexedDB wrapper. Add the addon, point it at a Dexie Cloud database, and the local tables sync continuously, with authentication, per-object access control and realtime updates. Hosted by the Dexie team, with a free tier and paid plans, and an on-premise option.',
    overlap:
      'Both start from IndexedDB in a browser and end with the same data on another device. If your app is built on Dexie, both are one dependency away.',
    differences: [
      {
        title: 'Continuous sync versus a snapshot',
        body: 'Dexie Cloud syncs every change, both ways, all the time, and merges. s3nd takes a snapshot of the whole database and carries it across once, or rewrites a per-user backup with a conditional write. It does not merge; your app does, when it wants to.',
      },
      {
        title: 'Accounts versus a code',
        body: 'Dexie Cloud identifies users, which is how it knows whose data to sync and who may see it. s3nd has no notion of a user: a code is the whole handshake, which is exactly what a local-first app without sign-in needs.',
      },
      {
        title: 'Their service versus your bucket',
        body: 'Dexie Cloud is a backend the Dexie team runs for you. s3nd is a few small objects in a bucket you already own, with no service in the middle.',
      },
      {
        title: 'Dexie versus anything',
        body: 'Dexie Cloud needs Dexie. s3nd stores whatever your app exports, from Dexie, raw IndexedDB, SQLite in WASM, or a plain object.',
      },
    ],
    pickThem: [
      'You use Dexie and want continuous multi-device sync with sharing and permissions.',
      'Realtime collaboration between users.',
      'A hosted backend is fine, and welcome.',
    ],
    pickS3nd: [
      'The app has no accounts and you want to keep it that way.',
      'A one-shot move to a new device, or a backup, not live sync.',
      'The data must stay in your own bucket.',
      'You do not use Dexie.',
    ],
    matrix: {
      shape: 'Continuous sync service for Dexie.js',
      storage: 'Dexie Cloud’s servers',
      online: 'No',
      browser: 'Yes, that is the point',
      accounts: 'Required',
      hosting: 'Hosted by Dexie; an on-premise option is offered',
      price: 'Free tier, paid plans',
      license: 'Proprietary service; the client addon is open source',
    },
    keywords: ['dexie cloud alternative', 'dexie sync alternative', 'indexeddb sync without accounts'],
  },
  {
    slug: 'powersync',
    name: 'PowerSync',
    category: 'sync-engine',
    website: 'https://www.powersync.com',
    headline: 'A PowerSync alternative when there is no backend database',
    what: 'A sync engine that keeps a SQLite database on the client in step with your Postgres, MongoDB or MySQL. Sync rules decide which rows each user receives, writes go back through your own backend, and the client SDKs cover web, React Native, Flutter, Swift and Kotlin. Available as a hosted cloud or self-hosted.',
    overlap:
      'Both are offline-first: the app reads and writes locally and the network is a background concern. Both let a user pick up on another device.',
    differences: [
      {
        title: 'A database on the server versus none',
        body: 'PowerSync replicates from a backend database that is the source of truth. s3nd assumes the browser is the source of truth and there may be no backend database at all; the bucket holds a snapshot, not a replica.',
      },
      {
        title: 'Partial, continuous replication versus a whole snapshot',
        body: 'PowerSync streams the rows a user is allowed to see, as they change. s3nd moves the whole local database once, or rewrites one backup object per user.',
      },
      {
        title: 'A service versus a bucket',
        body: 'PowerSync is a service to run or rent, with sync rules to write. s3nd is one route and a bucket, and a day’s work.',
      },
      {
        title: 'Users versus codes',
        body: 'PowerSync authenticates every client with a JWT. s3nd works without any identity: a code, an expiry, a rate limit.',
      },
    ],
    pickThem: [
      'You have a Postgres and want it on the client, offline-first.',
      'Many users, row-level permissions, live updates.',
      'Native mobile SDKs are a requirement.',
    ],
    pickS3nd: [
      'There is no backend database; the browser holds the data.',
      'A code, not a login.',
      'The whole feature should take an afternoon.',
    ],
    matrix: {
      shape: 'Postgres, MongoDB or MySQL to client-side SQLite sync engine',
      storage: 'Your database, replicated to each client',
      online: 'No',
      browser: 'Yes, web SDK',
      accounts: 'Required, JWT',
      hosting: 'Hosted cloud or self-hosted',
      price: 'Free tier and paid plans; self-hosting is free',
      license: 'Client SDKs Apache-2.0; the service is source-available',
    },
    keywords: ['powersync alternative', 'offline-first sync without postgres', 'local-first sync simple'],
  },
  {
    slug: 'electricsql',
    name: 'ElectricSQL',
    category: 'sync-engine',
    website: 'https://electric-sql.com',
    headline: 'An ElectricSQL alternative for apps without Postgres',
    what: 'A Postgres sync engine. Electric runs next to your database and exposes shapes, filtered subsets of a table, over HTTP; clients subscribe and hold the rows locally, and reads scale through ordinary CDNs. Writes go through your own API. Open source, with a hosted Electric Cloud.',
    overlap:
      'Local data, offline reads, and a user who expects the same state on every device. Both keep the write path in your hands.',
    differences: [
      {
        title: 'Postgres versus a bucket',
        body: 'Electric needs a Postgres to sync from and is very good at it. s3nd needs an S3 bucket to store into and is very small about it. They solve the same user story at opposite ends of the infrastructure spectrum.',
      },
      {
        title: 'Live rows versus a snapshot',
        body: 'A shape is a live view that keeps updating. A snapshot is the whole local database at one moment, carried across with a code or rewritten as a backup.',
      },
      {
        title: 'A component to deploy versus a route to add',
        body: 'Electric is a service between Postgres and your clients. s3nd is a function in the API you already have, or a CLI with nothing deployed.',
      },
    ],
    pickThem: [
      'Postgres is the source of truth and you want it on the client.',
      'Many users reading overlapping data, with live updates.',
      'A read path that scales through a CDN.',
    ],
    pickS3nd: [
      'No Postgres, or no backend database at all.',
      'Move to a new device, backup, encrypted export: the one-shot cases.',
      'The smallest thing that works.',
    ],
    matrix: {
      shape: 'Postgres read-path sync engine, shapes over HTTP',
      storage: 'Your Postgres, replicated to clients',
      online: 'No',
      browser: 'Yes',
      accounts: 'Whatever your API requires',
      hosting: 'Self-hosted or Electric Cloud',
      price: 'Free; the cloud is paid',
      license: 'Apache-2.0',
    },
    keywords: ['electricsql alternative', 'electric sql vs', 'local-first without sync engine'],
  },
  {
    slug: 'replicache',
    name: 'Replicache',
    category: 'sync-engine',
    website: 'https://replicache.dev',
    headline: 'A Replicache alternative for one-shot moves rather than multiplayer',
    what: 'A client-side sync framework from Rocicorp. Your app writes to a local cache through mutators, Replicache pushes them to your backend and pulls updates back, and you implement push and pull on your server against your own database. Rocicorp now builds Zero, a query-driven successor with its own sync server.',
    overlap:
      'Optimistic local writes, an app that keeps working offline, and data that shows up on the user’s other device.',
    differences: [
      {
        title: 'A framework with a backend contract versus a primitive',
        body: 'Replicache asks you to implement push and pull, keep a version per client and per space, and store everything in a backend database. s3nd asks for a bucket and gives you put and get.',
      },
      {
        title: 'Multiplayer versus a personal transfer',
        body: 'Replicache is built for many clients editing shared data in realtime with rebase and conflict resolution. s3nd is built for one person carrying their own data to their next device.',
      },
      {
        title: 'Identity implied versus none',
        body: 'Push and pull need to know who the client is. A sync code needs to know nothing.',
      },
    ],
    pickThem: [
      'Multiplayer, realtime, optimistic UI against your own backend.',
      'You are ready to implement push and pull, or to adopt Zero.',
    ],
    pickS3nd: [
      'There is no backend database to sync against.',
      'The move happens once, or a backup is rewritten occasionally.',
      'Codes, not accounts.',
    ],
    matrix: {
      shape: 'Client sync framework with push and pull on your backend',
      storage: 'Your backend database, cached on the client',
      online: 'No',
      browser: 'Yes',
      accounts: 'Whatever your backend requires',
      hosting: 'Your backend; Zero adds a sync server',
      price: 'Free',
      license: 'Source available; Zero is Apache-2.0',
    },
    keywords: ['replicache alternative', 'replicache vs', 'zero sync alternative simple'],
  },
  {
    slug: 'pouchdb',
    name: 'PouchDB',
    category: 'sync-engine',
    website: 'https://pouchdb.com',
    headline: 'A PouchDB alternative that does not need a CouchDB',
    what: 'A JavaScript database that runs in the browser, on IndexedDB, and replicates with CouchDB or anything that speaks its replication protocol. Bidirectional, incremental, with conflict detection through revision trees, and around for over a decade.',
    overlap:
      'IndexedDB in the browser, the same data on another device, and a design that treats offline as normal rather than as an error.',
    differences: [
      {
        title: 'A database versus a snapshot of yours',
        body: 'PouchDB is the database, with its document model and its revisions. s3nd leaves your database alone, whatever it is, and moves an export of it.',
      },
      {
        title: 'A CouchDB versus a bucket',
        body: 'Replication needs a CouchDB, or a compatible server, running somewhere. s3nd needs object storage and nothing else.',
      },
      {
        title: 'Continuous replication versus a code',
        body: 'PouchDB syncs as long as it is connected. s3nd moves the data once, when the user asks, and the code is the only credential.',
      },
    ],
    pickThem: [
      'You want a database that syncs, with revisions and conflicts as first-class concepts.',
      'A CouchDB you already run, or a hosted one you are happy to rent.',
      'Continuous bidirectional replication is the feature.',
    ],
    pickS3nd: [
      'You keep your own IndexedDB schema and your own wrapper.',
      'Object storage is all you want to run.',
      'New device with a code, backup, or encrypted export.',
    ],
    matrix: {
      shape: 'Browser database with CouchDB replication',
      storage: 'A CouchDB server, or a compatible one',
      online: 'No',
      browser: 'Yes',
      accounts: 'CouchDB authentication',
      hosting: 'Self-hosted or hosted CouchDB',
      price: 'Free',
      license: 'Apache-2.0',
    },
    keywords: ['pouchdb alternative', 'pouchdb couchdb alternative s3', 'indexeddb replication simple'],
  },
  {
    slug: 'firebase',
    name: 'Firebase',
    category: 'sync-engine',
    website: 'https://firebase.google.com/products/firestore',
    headline: 'A Firebase alternative for local-first apps that keep their data',
    what: 'Google’s hosted document database, Cloud Firestore, with realtime listeners and offline persistence on web and mobile. The SDK caches locally, queues writes while offline and reconciles when it reconnects. It is priced per document read, write and delete, and per gigabyte stored, and it comes with the rest of the Firebase platform: auth, rules, functions, hosting.',
    overlap:
      'A user who opens the app on a second device and finds their data there. Both handle the offline case without the app noticing.',
    differences: [
      {
        title: 'Google’s servers versus your bucket',
        body: 'Firestore is the source of truth and it lives on Google Cloud. With s3nd the source of truth is the device, and the bucket is yours: S3, R2, MinIO, wherever you decide.',
      },
      {
        title: 'Per-operation pricing versus a few objects',
        body: 'Firestore bills every read and write. A snapshot is one object, written when the user asks or on a debounce, and the cost is not worth calculating.',
      },
      {
        title: 'A platform versus a primitive',
        body: 'Firebase is auth, rules, functions and a console. s3nd is put, get and a code. Neither is a criticism of the other.',
      },
    ],
    pickThem: [
      'Realtime across many users and you want Google to run all of it.',
      'You also want the auth, rules, functions and hosting.',
      'Native mobile with offline persistence out of the box.',
    ],
    pickS3nd: [
      'The data should not live on a third party’s servers.',
      'Predictable cost: a few objects, not a billion reads.',
      'Local-first with the browser as the source of truth and no sign-in.',
    ],
    matrix: {
      shape: 'Hosted realtime document database with an offline cache',
      storage: 'Google Cloud',
      online: 'No',
      browser: 'Yes',
      accounts: 'Firebase Auth, anonymous allowed',
      hosting: 'Hosted only',
      price: 'Free tier, then per operation',
      license: 'Proprietary service; SDKs Apache-2.0',
    },
    keywords: ['firebase alternative local-first', 'firestore alternative self-hosted', 'firebase offline alternative'],
  },
  {
    slug: 'rclone',
    name: 'rclone',
    category: 'storage-tooling',
    website: 'https://rclone.org',
    headline: 'An rclone alternative for handing someone a code',
    what: 'The rsync of cloud storage: a command-line program that copies, syncs, moves and mounts files across seventy-odd storage backends, S3 included. It does bandwidth limits, checksums, filters, encryption and a great deal more. When the job is moving trees of files between a machine and a bucket, it is the standard tool.',
    overlap:
      'Both put a file in your bucket from a terminal with credentials on the machine, and both are open source and MIT-licensed.',
    differences: [
      {
        title: 'A path versus a code',
        body: 'With rclone you name the destination and the other side has to know it. With s3nd the destination is a code the tool picked, that someone can read out loud, that expires, and that the other side can type sloppily.',
      },
      {
        title: 'Everything versus one thing',
        body: 'rclone is a toolbox for storage. s3nd does one thing: put something under a code, get it back, burn it, and check the bucket is set up to hold transfers.',
      },
      {
        title: 'Not only a CLI',
        body: 'The s3nd CLI is a thin layer over a library that also runs in your API and behind React hooks, so the same code works for a web app’s users.',
      },
    ],
    pickThem: [
      'Syncing directories, mounting a bucket, bulk copies.',
      'Backends that are not S3.',
      'Bandwidth control, checksums, filters, and the rest of the toolbox.',
    ],
    pickS3nd: [
      'Hand a code to someone rather than a path.',
      'Expiry, conditional writes and a doctor command, with one command to learn.',
      'The same primitive inside an application.',
    ],
    matrix: {
      shape: 'Cloud storage CLI: copy, sync, mount',
      storage: 'Your bucket, and seventy other backends',
      online: 'No',
      browser: 'No',
      accounts: 'Provider credentials on each machine',
      hosting: 'None, it is a binary',
      price: 'Free',
      license: 'MIT',
    },
    keywords: ['rclone alternative simple', 'rclone vs', 'send file to s3 with code'],
  },
]

export function findAlternative(slug: string): Alternative | undefined {
  return alternatives.find((alternative) => alternative.slug === slug)
}

export function alternativesIn(category: AlternativeCategory): Alternative[] {
  return alternatives.filter((alternative) => alternative.category === category)
}
