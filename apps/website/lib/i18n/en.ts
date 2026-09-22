import { docs, dropTemplate, packages, repositoryUrl } from '@/lib/site'

/**
 * Every word the pages say, in English. `fr.ts` mirrors this object key for
 * key, and the type of this one is what keeps the two in step: a string added
 * here is a type error until it exists in French too.
 *
 * Strings may carry two bits of markup, rendered by `<Rich>`: `` `code` `` for
 * an inline code span and `[label](href)` for a link.
 */
export const en = {
  site: {
    tagline: 'Send anything with a code, through your own bucket.',
    description:
      "Send a file, a folder or an app's data from one machine to another with an eight-character code, through an S3 bucket you own. A CLI, a TypeScript library and React hooks. No account, no relay, nothing to deploy. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.",
  },

  ui: {
    skipToContent: 'Skip to content',
    copy: 'Copy',
    copied: 'Copied',
    copyCommand: 'Copy the command',
    copyCode: 'Copy the code',
    menu: 'Menu',
    closeMenu: 'Close the menu',
    primaryNavigation: 'Primary',
    language: 'Language',
    github: 'GitHub',
    docs: 'Docs',
    npm: 'npm',
    home: 'Home',
    breadcrumb: 'Breadcrumb',
    inShort: 'In short',
    installCli: 'Install the CLI',
    howItWorks: 'How it works',
    packages: 'Packages',
    then: 'Then',
    worthNoticing: 'Worth noticing',
    sourceOnGithub: 'Source on GitHub',
    runIt: 'run it',
    expectedOutput: 'expected output',
    codeLabel: 'Code',
    theCode: 'The code',
    normalizedCode: 'Normalized code',
    codePrinted: 'The code s3nd printed',
    empty: 'empty',
  },

  nav: {
    product: {
      label: 'Product',
      items: [
        {
          label: 'How it works',
          description: 'An object in your bucket, a code in someone’s hand.',
          href: '/how-it-works',
        },
        { label: 'The CLI', description: 'put, get, rm, and a doctor that proves the bucket works.', href: '/cli' },
        { label: 'The library', description: 'Files, snapshots and the transfer handler, in Node.', href: '/library' },
        { label: 'React hooks', description: 'Send, receive, and a code input that repairs typos.', href: '/react' },
        {
          label: 'Storage providers',
          description: 'S3, R2, MinIO, Scaleway, Wasabi: the endpoint is the only difference.',
          href: '/providers',
        },
        { label: 'Examples', description: 'Runnable, in the repository, against a local MinIO.', href: '/examples' },
        {
          label: 'Deploy a drop box',
          description: 'A small WeTransfer on your own bucket. Try it on drop.s3nd.sh, deploy it in one click.',
          href: '/drop',
        },
      ],
      aside: {
        title: 'Start in a minute',
        body: 'Install the CLI, point it at a bucket you already have, and hand someone a code.',
        command: 'npm i -g @s3nd/cli',
        link: 'Every command',
      },
    },
    useCases: {
      label: 'Use cases',
      files: 'Files',
      appState: 'App state',
      all: 'All use cases',
    },
    compare: {
      label: 'Compare',
      all: 'All comparisons',
      lead: 'Sometimes the other tool is the right answer. Each page says when.',
    },
    docs: 'Docs',
    github: 'GitHub',
    cta: 'Install',
  },

  footer: {
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'How it works', href: '/how-it-works' },
          { label: 'The CLI', href: '/cli' },
          { label: 'The library', href: '/library' },
          { label: 'React hooks', href: '/react' },
          { label: 'Storage providers', href: '/providers' },
          { label: 'Examples', href: '/examples' },
          { label: 'Deploy a drop box', href: '/drop' },
        ],
      },
      {
        title: 'Use cases',
        links: [
          { label: 'A file between two machines', href: '/use-cases/file-between-machines' },
          { label: 'A drop box for your team', href: '/use-cases/team-drop-box' },
          { label: 'Backups from CI', href: '/use-cases/ci-backups' },
          { label: 'Move an app to a new device', href: '/use-cases/new-device' },
          { label: 'Continuous backup', href: '/use-cases/continuous-backup' },
          { label: 'End-to-end encrypted', href: '/use-cases/encrypted-sync' },
        ],
      },
      {
        title: 'Compare',
        links: [
          { label: 'All comparisons', href: '/alternatives' },
          { label: 'vs croc', href: '/alternatives/croc' },
          { label: 'vs Magic Wormhole', href: '/alternatives/magic-wormhole' },
          { label: 'vs WeTransfer', href: '/alternatives/wetransfer' },
          { label: 'vs transfer.sh', href: '/alternatives/transfer-sh' },
          { label: 'vs rclone', href: '/alternatives/rclone' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Documentation', href: docs(), external: true },
          { label: 'Without a server', href: docs('/no-server'), external: true },
          { label: 'Setting up a server', href: docs('/server'), external: true },
          { label: 'The protocol', href: docs('/protocol'), external: true },
          { label: 'GitHub', href: repositoryUrl, external: true },
          { label: 'npm', href: packages.cli.npm, external: true },
          { label: 'The live drop box', href: dropTemplate.live, external: true },
        ],
      },
    ] as { title: string; links: { label: string; href: string; external?: boolean }[] }[],
    legal: 'No hosted service. No telemetry. No account.',
    madeBy: 'MIT ©',
  },

  cta: {
    title: 'Put a file. Hand over the code.',
    body: 'Point it at the bucket you already pay for. Nothing to deploy, nothing to sign up for, nothing in the middle.',
    primary: 'Install the CLI',
    secondary: 'Put it in your app',
    ghost: 'GitHub',
    commands: ['npm install -g @s3nd/cli', 's3nd init --provider r2 --bucket drop', 's3nd put ./anything.zip'],
  },

  notFound: {
    title: 'Not found',
    heading: 'Unknown or expired code.',
    body: 'Nothing is stored under this address. The page may have moved, or it never existed.',
    back: 'Back to the start',
    docs: 'Documentation',
  },

  home: {
    eyebrow: 'Your bucket · A code · No account',
    title: 'Send anything with a code.',
    lead: 's3nd drops a file into an S3 bucket you own and hands you eight characters. Whoever has the code picks it up, from any machine, until it expires. From a terminal, from your own app, or from curl.',
    primary: 'Install the CLI',
    secondary: 'How it works',
    ghost: 'GitHub',
    commands: ['npm i -g @s3nd/cli', 's3nd put ./anything.zip'],
    ticker: [
      's3nd.sh',
      'No account',
      'No relay',
      'Nothing to deploy',
      'Your bucket',
      'AWS S3',
      'Cloudflare R2',
      'MinIO',
      'Scaleway',
      'Wasabi',
      'Expires on its own',
      '40-bit codes',
      'CLI · Library · React',
      'MIT',
    ],
    how: {
      eyebrow: 'Put. Code. Get.',
      title: 'The whole product is three commands.',
      lead: 'The bytes go from one machine to your bucket and from your bucket to the other. Nothing streams through anyone else’s server, and nobody signs up for anything.',
      steps: [
        {
          stamp: 'put',
          title: 'Drop it in your bucket.',
          body: 'A file, a folder as an archive, whatever comes down stdin. One PutObject into a bucket you own, under a fresh code, with an expiry stamped on the object. The code is printed and nothing else, so it composes.',
          href: docs('/cli'),
          label: 'The CLI reference',
        },
        {
          stamp: 'code',
          title: 'Read it over the phone.',
          body: 'Eight characters, forty bits, no I, L, O or U. Write it on a sticky note, type it in the wrong case with a dash in the middle: it still resolves. The server picks it and claims it with a conditional write.',
          href: docs('/sync-codes'),
          label: 'Sync codes',
        },
        {
          stamp: 'get',
          title: 'Pick it up anywhere.',
          body: 'Any machine with the code and access to the bucket, or a token for your server, gets the file back. Until the transfer expires, or you burn it. The other machine did not have to be on when you sent.',
          href: docs('/no-server'),
          label: 'Without a server',
        },
      ],
    },
    waysIn: {
      eyebrow: 'Three ways to send',
      title: 'A terminal, your own app, or anything that speaks HTTP.',
      lead: 'One primitive under all three. The server-side package holds the keys; everything that runs in a browser depends on fetch and nothing else.',
      terminal: {
        title: 'From a terminal',
        body: 'Straight to the bucket with the credentials on that machine, nothing deployed. Or through your server with a token and `--remote`. A doctor command proves the setup works.',
        link: 'Every command',
      },
      app: {
        title: 'Inside your app',
        body: 'One route file serves the four-route protocol on your domain, with your auth. React hooks send a file, read a code back, and repair what the user typed.',
        libraryLink: 'The library',
        hooksLink: 'The hooks',
      },
      http: {
        title: 'Anything with HTTP',
        body: 'The protocol is four routes and one error format, written down. curl works, a Go client works, and a server in Rails works with every s3nd client.',
        link: 'The protocol spec',
      },
    },
    bucket: {
      eyebrow: 'Your bucket',
      title: 'Nobody in the middle.',
      lead: 'Every other tool in this space either runs a relay, hosts your files, or asks for an account. s3nd is a thin layer over object storage you already pay for.',
      figure:
        'The bytes go from one machine to your bucket and from your bucket to the other. Nothing else is in the picture.',
      facts: [
        {
          label: 'No relay',
          value:
            'Machine to bucket, bucket to machine. Your provider’s durability, your provider’s bill, and on R2 no egress fee at all.',
        },
        {
          label: 'No account',
          value:
            'A code is the whole handshake. On your own server, a bearer token per person is the most identity s3nd ever asks for.',
        },
        {
          label: 'Nothing to deploy',
          value:
            'The CLI talks to the bucket directly. A server enters the picture only when a browser has to, and it is one route file.',
        },
        {
          label: 'Expires on its own',
          value:
            'Every transfer carries an expiry, checked on every read. A lifecycle rule deletes the object, and s3nd doctor checks you have one.',
        },
      ],
    },
    codes: {
      eyebrow: 'Sync codes',
      title: 'A code you can read over the phone.',
      lead: 'The whole experience of a transfer is someone reading a code off one screen and typing it into another. Everything about the code is shaped by that.',
      paragraphs: [
        'The default is eight characters of Crockford base32: no `I`, `L`, `O` or `U`, so a code survives paper, a phone keyboard and a phone call. Generation and normalization live on the same object, so the two sides can never disagree about the alphabet.',
        'Four digits for a phone-first app, twelve alphanumerics for a long-lived drop: both halves are configurable, and `entropyBits` tells you what the code is worth guessing against so the rate limit can do the rest.',
        'A code is a bearer token. Give it a short expiry, rate-limit the lookup route, and for sensitive payloads encrypt before anything reaches the bucket.',
      ],
      links: [
        { label: 'Sync codes', href: docs('/sync-codes') },
        { label: 'Configuring codes', href: docs('/code-configuration') },
      ],
    },
    appState: {
      eyebrow: 'Also',
      title: 'Not only files. An app’s whole state.',
      lead: 'A transfer can be structured data as well as bytes. That is how a local-first app with no accounts carries its database to the user’s new phone: the browser exports IndexedDB, the server snapshots it, the other phone types the code.',
      figure:
        'The old phone exports, your server snapshots, the new phone types the code and sees what it is about to restore.',
      cards: [
        {
          title: 'A self-describing envelope',
          body: 'Your app name, your schema version, the device, an expiry, then the data, gzipped. A restore refuses a snapshot from a newer build instead of misreading it, and shows when and where it was made before replacing anything.',
        },
        {
          title: 'Two devices, one backup, no silent loss',
          body: 'Pass the ETag you last read as `ifMatch` and a device that writes after someone else did gets an error instead of overwriting their work.',
        },
      ],
      links: {
        newDevice: 'Move an app to a new device',
        hooks: 'The React hooks',
        snapshots: 'Snapshots',
      },
    },
    useCases: { eyebrow: 'Use cases', title: 'What people move with it.', files: 'Files', appState: 'App state' },
    compare: {
      eyebrow: 'Compared',
      title: 'Why not croc, WeTransfer or rclone?',
      lead: 'Sometimes they are the right answer. The comparison pages say when, tool by tool, in the other tool’s own terms.',
      all: 'All comparisons',
      vs: 'vs',
    },
    faq: { eyebrow: 'Questions', title: 'The ones that come up.' },
  },

  howItWorks: {
    metaTitle: 'How it works',
    metaDescription:
      'A transfer is an object in your bucket under an eight-character code, with an expiry checked on every read. Files, snapshots, the four-route protocol, conditional writes, and why the packages are split the way they are.',
    keywords: [
      'how s3nd works',
      'file transfer code s3 bucket',
      'transfer protocol sync code',
      'indexeddb snapshot s3',
    ],
    crumb: 'How it works',
    eyebrow: 'Architecture',
    title: 'An object in your bucket, a code in someone’s hand.',
    lead: 's3nd is deliberately small. This page is the whole of it: what a transfer is, what a code is, the protocol between a server and its clients, and why the packages are split the way they are.',
    primary: 'Install the CLI',
    secondary: 'The protocol spec',
    scene: {
      title: 'Two machines. Your bucket between them. Nothing else.',
      eyebrow: 'the whole transfer · 14 s · on a loop',
      machineA: 'machine A · your laptop',
      machineB: 'machine B · your phone',
      bucket: 'your bucket',
      noMiddle: 'no relay · no account · nothing to deploy',
      byHand: 'the code travels by voice, in a chat, or as a QR code · the file never leaves your bucket',
      expires: 'expires in',
      gone: 'gone',
      steps: [
        {
          stamp: '01 · put',
          title: 'One machine puts',
          body: 'A file, or an app’s data, lands in your bucket as one object under a fresh eight-character code, with the expiry stamped on the object.',
        },
        {
          stamp: '02 · the code',
          title: 'Eight characters change hands',
          body: 'Read out loud, pasted in a chat, scanned off a screen. The code is the whole handshake: no account on either side, nothing between the two machines but your bucket.',
        },
        {
          stamp: '03 · get, then burn',
          title: 'Another machine gets',
          body: 'The code is repaired as typed and the expiry checked on read, then the object is handed over. Burn it when you are done, or let the expiry do it.',
        },
      ],
      caption:
        'Machine A puts a file in the bucket and gets a code; the code crosses to machine B by hand; machine B gets the file and burns it. Replays every fourteen seconds; under reduced motion, the finished transfer is shown instead.',
    },
    transfer: {
      eyebrow: 'A transfer',
      title: 'One object, one code, one expiry.',
      lead: 'A file is stored as the bytes you gave, with the filename, the content type and the expiry in the object’s metadata. Structured data is stored as a snapshot: a self-describing envelope, gzipped. Both sit under the code.',
      fileTitle: 'a file, as it lands in the bucket',
      snapshotTitle: 'a snapshot, as it lands in the bucket',
      cards: [
        {
          stamp: 'expiry on read',
          body: 'A transfer past its expiry is never handed over, even if the object is still sitting in the bucket. An expired code answers the same `NOT_FOUND` as one that never existed, so nobody can probe which codes were used.',
        },
        {
          stamp: 'lifecycle rule',
          body: 'Deleting the object is your bucket’s job, through a lifecycle rule on the prefix. `s3nd doctor` checks you have one, because a bucket quietly filling up with expired transfers is the most common way this goes wrong.',
        },
        {
          stamp: 'schema versions',
          body: 'A snapshot carries your schema version. Pass `maxVersion` on read and a snapshot from a newer build throws `SNAPSHOT_TOO_NEW` instead of landing in an app that will misread it.',
        },
      ],
      links: [
        { label: 'Snapshots', href: docs('/snapshots') },
        { label: 'How big a transfer can be', href: docs('/limits') },
      ],
    },
    codes: {
      eyebrow: 'Sync codes',
      title: 'Forty bits that survive a phone call.',
      lead: 'A code is the whole user experience of a transfer. It appears on one screen and someone types it into another, and everything about it is shaped by that.',
      cards: [
        {
          title: 'Crockford base32',
          body: 'No `I`, `L`, `O` or `U`. The first three are what people misread; dropping the fourth keeps a random code from spelling something unfortunate.',
        },
        {
          title: 'Normalized on the way back',
          body: 'Separators dropped, case folded, and `O` read as zero only when there is no letter O to confuse it with. The repair happens in the browser, before any request.',
        },
        {
          title: 'Claimed with a conditional write',
          body: 'The server picks the code and writes with `ifAbsent`, so a collision fails loudly and retries with a fresh code instead of overwriting a stranger’s transfer.',
        },
      ],
      links: [
        { label: 'Sync codes', href: docs('/sync-codes') },
        { label: 'Length, alphabet, and what each costs', href: docs('/code-configuration') },
      ],
    },
    protocol: {
      eyebrow: 'The protocol',
      title: 'Four routes, one error format. Written down.',
      lead: 'A browser cannot hold your S3 credentials, so when one takes part a server sits in the middle. The shape of that middle is a protocol, not whatever the handler happens to do.',
      routesTitle: 'relative to wherever you mounted it',
      clientTitle: 'the client, in a browser',
      paragraphs: [
        'A client works against any server that answers these routes, not only against `createTransferHandler()`. A server in Go or Rails works with every s3nd client. And the CLI pointed at `--remote` cannot tell which it is talking to, which is exactly why `s3nd put` works against your own deployment.',
        'What you send decides what a transfer holds: a JSON body is a snapshot, any other content type is a file with its name in `X-S3nd-Filename`. Clients throw a `TransferError` carrying the error code; branch on the code, never on the message.',
      ],
      link: 'The transfer protocol, route by route',
    },
    writers: {
      eyebrow: 'Two writers',
      title: 'When two machines write, last-write-wins is data loss.',
      lead: 'A one-shot transfer has a single writer. A per-user backup has two, and S3’s default silently keeps whichever arrived last.',
      body: 'Both options are plain S3 conditional headers. `ifAbsent` is how a fresh code is claimed; `ifMatch` is how a second device finds out it lost the race. They work on every provider that implements them, and the node example is where you find out whether yours does.',
      link: 'Two devices, one snapshot',
    },
    packages: {
      eyebrow: 'The packages',
      title: 'One constraint decides the split.',
      lead: 'A browser must never end up with a storage client in its dependency tree. The protocol package is what both halves share, which is why it exists at all.',
      items: [
        {
          name: packages.cli.name,
          role: 'The binary',
          deps: 's3nd',
          body: 'put, get, rm, doctor, init and config. One implementation, the protocol client, wired either to fetch or straight into the handler in-process.',
        },
        {
          name: packages.s3nd.name,
          role: 'The primitive',
          deps: 'aws-sdk, protocol',
          body: 'Files, snapshots, conditional writes and the transfer handler. The only package that holds credentials, so the only one that runs on a server.',
        },
        {
          name: packages.protocol.name,
          role: 'The contract',
          deps: 'nanoid',
          body: 'The wire format, a fetch-based client, and the sync codes. Nothing here imports a storage client, which is what lets a browser share it.',
        },
        {
          name: packages.react.name,
          role: 'The hooks',
          deps: 'protocol, react (peer)',
          body: 'Send, receive, and a code input. Depends on the protocol and never on S3, so no path from your bundle reaches the AWS SDK.',
        },
      ],
      facts: [
        { label: 'Server runtime', value: 'Node 20 or later, what the AWS SDK v3 requires' },
        { label: 'Handler', value: 'Request in, Response out: Next.js, Hono, Bun.serve, Deno, workers' },
        { label: 'Browser packages', value: 'fetch and nothing else: browser, worker, React Native, Deno' },
        { label: 'Tests', value: 'Offline, against an in-memory S3 that honours conditional headers' },
      ],
    },
  },

  cli: {
    metaTitle: 'The CLI',
    metaDescription:
      'The s3nd command line: move a file between machines with a code, check that a bucket is actually set up to hold transfers, and keep the settings in a committable file instead of your shell history. Straight to S3 or through your own server.',
    keywords: [
      'send file between computers cli',
      's3 file transfer command line',
      'cli file transfer code',
      's3nd cli',
    ],
    crumb: 'The CLI',
    title: 'A file between two machines, with a code.',
    lead: 'Move a file with put and get, check that a bucket is actually set up to hold transfers with doctor, and keep the settings in a file you can commit. Straight to S3 with nothing deployed, or through your own server with a token.',
    primary: 'CLI reference',
    secondary: 'Without a server',
    ghost: 'npm',
    initDoctor: {
      eyebrow: 'init and doctor',
      title: 'The command worth running first.',
      lead: 'S3 misconfiguration fails late and vaguely. doctor performs the operations s3nd actually needs and reports what happened, rather than reading your policy and reasoning about it. The probe object is deleted before it returns.',
      initTitle: 'a starting point per provider',
      doctorTitle: 'and the check that earns the command',
      body: 'That last check is the one nobody discovers until a bill arrives. `expiresIn` stops a transfer being handed over; only a lifecycle rule deletes the object. Pointed at a server, `doctor` checks the one thing that matters there, a real round trip, and exits non-zero on failure, so it works as a deployment smoke test.',
    },
    config: {
      eyebrow: 'Configuration',
      title: 'Committable settings, uncommittable keys.',
      lead: '${VAR} is read from the environment, and envFile names a file to load first without overwriting what the shell already set. Profiles hold several setups in one file. A flag beats a variable, which beats the file.',
      body: 'The file is looked for from the working directory upwards, then in `~/.config/s3nd/config.json`. `s3nd config` masks the access key id and never prints the secret or the token. Environment-only works too, which is the shape CI wants.',
      link: 'Backups from CI',
    },
    remote: {
      eyebrow: 'Against your own server',
      title: 'One implementation, two wirings.',
      lead: 'Every command takes --remote, pointing it at a deployment of the transfer protocol instead of at S3. The CLI has exactly one implementation, the protocol client, wired either to fetch or straight into the handler in the same process. The two modes cannot drift apart.',
      paragraphs: [
        'The practical consequence: the machine you run this from needs a token for your own deployment rather than S3 credentials. That is the shape for a team, where handing every laptop the bucket keys is not.',
        '`s3nd init --provider remote` writes the matching starter, and `doctor --remote` proves the server answers before anyone depends on it.',
      ],
      link: 'Setting up a server',
    },
    reference: {
      eyebrow: 'Reference',
      title: 'Six commands, a dozen options.',
      commandsTitle: 'Commands',
      optionsTitle: 'Options',
      commands: [
        { term: 'put <file>', body: 'Store a file and print the code to carry. "-" reads stdin' },
        { term: 'get <code>', body: 'Fetch what a code points at, to the stored filename, -o, or stdout' },
        { term: 'rm <code>', body: 'Burn a code' },
        { term: 'doctor', body: 'Check this setup can actually store transfers. Exits non-zero when a check fails' },
        { term: 'init', body: 'Write a starter s3nd.config.json for aws, r2, minio, scaleway, wasabi or remote' },
        { term: 'config', body: 'Print the resolved configuration, and where each value came from' },
      ],
      options: [
        { term: '-c, --config', body: 'Configuration file to read' },
        { term: '-p, --profile', body: 'Profile to use inside it' },
        { term: '--env-file', body: 'Read KEY=value pairs from this file first' },
        {
          term: '--bucket, --prefix, --region, --endpoint',
          body: 'Bucket settings, overriding the file and the environment',
        },
        { term: '--expires-in', body: '3600, 30m, 24h, 7d, or never' },
        { term: '--remote, --token', body: 'Talk to a s3nd server instead of S3 directly' },
        { term: '--name', body: 'Filename to store the transfer under' },
        { term: '--json', body: 'Machine-readable output, for scripts and for doctor in CI' },
      ],
      body: 'Configuration otherwise comes from the same environment variables as the library: `S3ND_BUCKET`, `S3ND_ENDPOINT`, `S3ND_REMOTE`, `S3ND_TOKEN` and the usual AWS credentials. Node 20 or later; the argument parser is `node:util`’s `parseArgs`, so there is nothing else to install.',
    },
  },

  library: {
    metaTitle: 'The library',
    metaDescription:
      'The s3nd Node package: a file API over your bucket, a transfer handler that is one route file, snapshots with a self-describing envelope, conditional writes and stable error codes. Works with AWS S3, Cloudflare R2, MinIO, Scaleway and Wasabi.',
    keywords: ['s3nd npm', 's3 upload library typescript', 'next.js file drop route', 's3 transfer handler node'],
    crumb: 'The library',
    title: 'Files and snapshots, in your bucket.',
    lead: 'A small file API over object storage, a transfer handler that is one route file, and snapshots for structured state. The only package that holds credentials, so the only one that runs on your server.',
    primary: 'Set up a server',
    secondary: 'API reference',
    ghost: 'npm',
    files: {
      eyebrow: 'The file API',
      title: 'Five verbs over your bucket.',
      lead: 'Strings, buffers, Blobs and streams are all accepted. Keys round-trip: what upload() returns is what you hand back to get(), getUrl() and delete(). The configured prefix is an internal namespace.',
      paragraphs: [
        '`getUrl()` returns a presigned URL by default, or an unsigned one when a `publicUrl` is configured, with a `download` option that sets the filename the browser saves.',
        'A stream needs a `contentLength`, because a single PutObject cannot use chunked encoding. Set `maxSize` and an oversized body is refused before anything reaches the network.',
        'Anything the package does not wrap is one command away through `store.client`, the plain `S3Client`.',
      ],
      link: 'The API reference',
    },
    handler: {
      eyebrow: 'The handler',
      title: 'A drop box on your domain, in one route file.',
      lead: 'createTransferHandler() serves the four-route protocol: create, read, download, burn. It takes a Request and returns a Response, so it is a Next route, a Hono route, Bun.serve or a worker without an adapter.',
      titles: { next: 'Next.js App Router', hono: 'Hono', bun: 'Bun.serve' },
      body: "Every route is public unless you pass `authorize`: fine for a personal drop box behind a proxy, not fine for anything else. Return `false` for a plain 401 or a `Response` to answer with your own. With `raw: 'redirect'` a download answers 302 with a presigned URL, so the bytes never transit your server twice.",
      links: {
        server: 'Setting up a server',
        protocol: 'The transfer protocol',
        teamDropBox: 'A drop box for your team',
      },
    },
    snapshots: {
      eyebrow: 'Snapshots',
      title: 'Structured state, with a restore that is safe rather than hopeful.',
      lead: 'putSnapshot() wraps your value in an envelope with your app name, schema version, device and expiry, then gzips it. getSnapshot() reads the envelope back and refuses what it should.',
      cards: [
        {
          title: 'null when expired',
          body: 'An expired snapshot is never handed over, even if the object is still in the bucket. The receiving device does not need to tell "never existed" from "expired".',
        },
        {
          title: 'SNAPSHOT_TOO_NEW',
          body: 'Pass `maxVersion` and a snapshot written by a newer build throws instead of landing in an app that will misread it.',
        },
      ],
      link: 'Snapshots, in full',
    },
    conditional: {
      eyebrow: 'Conditional writes',
      title: 'No silent overwrite, on any provider that implements them.',
      lead: 'Both options are plain S3 conditional headers, and both fail before anything is replaced.',
      paragraphs: [
        '`ifAbsent` is how a freshly generated code is claimed without a chance of trampling one already in use. The handler retries with a fresh code on the rare collision.',
        '`ifMatch` is how a second device finds out it lost the race. It gets `PRECONDITION_FAILED`, reads again, and merges, which is application code because only your app knows what a merge means.',
      ],
      link: 'Two devices, one snapshot',
    },
    errors: {
      eyebrow: 'Errors',
      title: 'Everything throws a S3ndError with a stable code.',
      lead: 'Failures that can be caught locally, a bad code, an oversized body, unserializable data, are raised before anything reaches the network.',
      codes: [
        { term: 'INVALID_SYNC_CODE', body: 'Empty, or characters outside the alphabet' },
        { term: 'FILE_TOO_LARGE', body: 'Body above the configured maxSize' },
        { term: 'PRECONDITION_FAILED', body: 'An ifMatch or ifAbsent write lost the race' },
        { term: 'SNAPSHOT_TOO_NEW', body: 'Schema version above the maxVersion given' },
        { term: 'INVALID_KEY / INVALID_BODY', body: 'A key or a body type the bucket cannot take' },
        { term: 'UPLOAD_FAILED / GET_FAILED / …', body: 'S3 rejected the request; the original error is in cause' },
      ],
      link: 'Every error code',
    },
    config: {
      eyebrow: 'Configuration',
      title: 'Every option, and the environment variable behind it.',
      lead: 'createBucket() with no arguments works once S3_BUCKET and the usual AWS variables are set. With an endpoint, region defaults to auto and path-style addressing turns on, which is what R2, MinIO and Scaleway expect.',
      paragraphs: [
        'Through your server, a transfer is bound by your runtime’s request limit: 4.5 MB on Vercel functions, 6 MB on Lambda. Set `maxSize` just under it and an oversized upload costs a comparison instead of a truncated request.',
        '`createBucket()` is cheap: the underlying client is built on the first request, so calling it at module scope is fine.',
      ],
      links: { configuration: 'Configuration', limits: 'Limits', providers: 'Providers' },
    },
  },

  react: {
    metaTitle: 'React hooks',
    metaDescription:
      '@s3nd/react: hooks for sending a file or a snapshot, reading a code back, and a sync code input that repairs what the user typed. Never sees a storage credential, never pulls the AWS SDK into your bundle.',
    keywords: ['react file upload code', 's3nd react', 'react hook transfer code', 'one-time code input react'],
    crumb: 'React hooks',
    title: 'Hooks that never see a credential.',
    lead: 'Send a file or a snapshot, read a code back, and an input that repairs the code as the user types it. Its whole dependency tree is the protocol package and nanoid, with React as a peer. The AWS SDK stays on your server.',
    primary: 'React guide',
    secondary: 'npm',
    providerTitle: 'point it at the transfer routes',
    sending: {
      eyebrow: 'Sending',
      title: 'A file input, a code.',
      lead: 'sendFile() takes a File straight off an input, keeping its name and type. Failures land in error rather than rejecting, because an event handler should not need a try/catch.',
      paragraphs: [
        'The hook posts to the transfer routes on your server, which hold the bucket credentials. The browser never sees a key, and your `authorize` function decides who may send.',
        '`transfer` carries the code, the kind, the size and the expiry. Show the code grouped in fours; the receiving side accepts it with or without the spaces.',
      ],
      link: 'A drop box for your team',
    },
    receiving: {
      eyebrow: 'Receiving',
      title: 'Look it up, show it, then download.',
      lead: 'load() fetches what a code holds without moving the bytes, so the user sees a filename and a size before anything is downloaded. loadBytes() brings the file across.',
    },
    input: {
      eyebrow: 'The code input',
      title: 'What the user typed stays untouched.',
      lead: 'useSyncCodeInput does the repair in the browser, before any request. Rewriting the field under the cursor is the one thing that makes these inputs miserable, so it never does.',
      paragraphs: [
        '`value` is verbatim. `code` is the canonical form to submit, `null` while what is typed cannot be one. `isComplete` is the moment to enable the button.',
        '`inputProps` carries the keyboard and autofill hints a one-time code wants: `autoComplete="one-time-code"`, capitals, no autocorrect, and a numeric keyboard when the alphabet is digits.',
        'Pass the same shape your server configured, `{ length: 4, alphabet }`, and both halves follow.',
      ],
    },
    appState: {
      eyebrow: 'App state',
      title: 'The same hooks carry a snapshot.',
      lead: 'Structured state goes through send() as a snapshot, and comes back inline in data. Loading and applying are deliberately separate: only your code knows its object stores, and the user should see what is about to replace their data.',
      body: 'The IndexedDB example in the repository has a complete export and import pair against a real object store, and the use-case page walks the whole flow.',
      links: { newDevice: 'Move an app to a new device', examples: 'The examples' },
    },
    guarantees: {
      eyebrow: 'Guarantees',
      title: 'A user hammering a button gets one answer.',
      lead: 'Every call aborts the one before it, a late reply from a superseded call is dropped rather than published, and nothing is written after unmount.',
      cards: [
        {
          title: 'Client hooks, App Router ready',
          body: "Every export is a client hook and the build carries `'use client'`, so it drops straight into the Next.js App Router. React 18 or later.",
        },
        {
          title: 'Tokens and custom clients',
          body: 'Pass `headers` to the provider for a token, or `client` to bring your own, which is also how you drive it in tests with no network at all.',
        },
        {
          title: 'Status you can render',
          body: '`status` is idle, pending, success or error, and `notFound` covers both an unknown and an expired code, the way the protocol does.',
        },
      ],
      hooks: [
        { term: 'useSendTransfer()', body: 'send, sendFile, transfer, status, isPending, error, reset' },
        {
          term: 'useReceiveTransfer()',
          body: 'load, loadBytes, burn, transfer, data, notFound, status, isPending, error, reset',
        },
        { term: 'useSyncCodeInput()', body: 'value, setValue, code, isComplete, error, reset, inputProps' },
        { term: 'useTransferClient()', body: 'the underlying client, for anything the hooks do not cover' },
      ],
    },
  },

  examples: {
    metaTitle: 'Examples',
    metaDescription:
      'Runnable s3nd examples: a Next.js notes app that moves its IndexedDB between browsers with a code, and a Node script that round-trips a snapshot and proves the conditional writes. Plus the worked guides in the documentation.',
    keywords: ['s3nd example', 'indexeddb sync example nextjs', 's3 snapshot example node'],
    crumb: 'Examples',
    eyebrow: 'Examples',
    title: 'Runnable, in the repository.',
    lead: 'Two examples you can clone and run, and the worked guides in the documentation. Both examples point at a local MinIO by default, so the real code path runs on your laptop with nothing to sign up for.',
    primary: 'Browse the examples',
    secondary: 'GitHub',
    minioTitle: 'a bucket on your laptop',
    guides: {
      eyebrow: 'Guides',
      title: 'Worked examples in the documentation.',
      lead: 'Each guide is copy-pasteable end to end: the store, the routes, the client half, and the thing that goes wrong if you skip a step.',
    },
    tryIt: {
      eyebrow: 'Try it in a minute',
      title: 'No clone required.',
      steps: [
        'Start MinIO with the command above and create a bucket.',
        'Write a starter configuration and check it.',
        'Move a file, and get it back with a sloppily typed code.',
      ],
    },
  },

  useCases: {
    metaTitle: 'Use cases',
    metaDescription:
      'What people move with s3nd: a file between two machines, a drop box for a team, backups from CI, and a local-first app carried to a new device, backed up continuously, or encrypted end to end.',
    keywords: ['file transfer use cases', 'self-hosted file drop', 'local-first sync use cases'],
    crumb: 'Use cases',
    eyebrow: 'Use cases',
    title: 'One primitive, seven shapes.',
    lead: 'A file between two machines is the plain case. The same put, code, get covers a team, a workflow, and an application carrying its own state to the user’s next device.',
    primary: 'Install the CLI',
    files: {
      eyebrow: 'Files',
      title: 'Machines, people, pipelines.',
      lead: 'The CLI straight to the bucket when every participant is a machine you control, and one route on your server when it is not.',
    },
    appState: {
      eyebrow: 'App state',
      title: 'A local-first app, on their other device.',
      lead: 'The browser holds the data, your server holds the keys, and your bucket holds a snapshot for as long as it needs to. No account required.',
    },
    detail: {
      eyebrow: 'Use case',
      metaSuffix: 'How to build it with s3nd, what to watch, and the full guide.',
      situation: {
        eyebrow: 'The situation',
        title: 'What is actually going on.',
        problem: 'The problem',
        approach: 'What s3nd does about it',
      },
      watch: { eyebrow: 'Worth watching', title: 'The things that are easy to get wrong.' },
      related: { eyebrow: 'Related', title: 'Other shapes of the same primitive.' },
    },
  },

  providers: {
    metaTitle: 'Storage providers',
    metaDescription:
      's3nd works with AWS S3 and any S3-compatible storage: Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi. The endpoint is the only difference, and the CLI writes a starter configuration for each.',
    keywords: ['s3 compatible storage', 'cloudflare r2 minio scaleway wasabi', 's3nd providers'],
    crumb: 'Providers',
    eyebrow: 'Your bucket',
    title: 'Any storage that speaks S3.',
    lead: 'Set an endpoint and s3nd adjusts the two defaults S3-compatible providers expect. Both stay overridable. The CLI writes a starter configuration for each provider, and doctor tells you whether it actually works.',
    primary: 'Providers in the docs',
    pick: { eyebrow: 'Providers', title: 'Pick yours.' },
    notListed:
      'Not listed? Ceph, Garage, SeaweedFS, Backblaze B2, DigitalOcean Spaces and the rest work the same way: an endpoint, a key pair, and `s3nd doctor` to confirm the conditional writes are honoured. [The CLI](/cli) has the details.',
    detail: {
      eyebrow: 'Storage provider',
      titlePrefix: 's3nd with',
      metaDescription: (name: string) =>
        `Move files and local-first app data through a ${name} bucket with s3nd: the createBucket() configuration, the CLI starter, and what to know about this provider.`,
      primary: 'In the documentation',
      secondary: 'The CLI',
      why: 'Why this one',
      cli: {
        eyebrow: 'From the command line',
        title: 'A starter configuration, and what is left to do.',
        lead: 'init writes the file with ${VAR} references rather than secrets, so it is meant to be committed; the env file it points at is not.',
        doctor: 'Run `s3nd doctor`. It performs the operations s3nd needs and reports what happened.',
      },
      notes: { eyebrow: 'Worth knowing', title: (short: string) => `Notes on ${short}.`, link: 'The full guide' },
      others: { eyebrow: 'Other providers', title: 'The endpoint is the only difference.' },
    },
  },

  alternatives: {
    metaTitle: 'Alternatives and comparisons',
    metaDescription:
      'How s3nd compares with Magic Wormhole, croc, WeTransfer, PairDrop, Dexie Cloud, PowerSync, ElectricSQL, Replicache, PouchDB, Firebase and rclone. Where they overlap, where they differ, and which to pick.',
    keywords: ['s3nd alternatives', 'file transfer tool comparison', 'local-first sync comparison'],
    crumb: 'Alternatives',
    eyebrow: 'Compared',
    title: 'Sometimes another tool is the right answer.',
    lead: 's3nd sits between three kinds of tools: code-based file transfer, file sharing for people, and local-first sync engines. Each page describes the other tool in its own terms first, then where the two part ways, and says plainly when to pick it.',
    secondary: 'How s3nd works',
    vs: 's3nd vs',
    detail: {
      metaDescription: (name: string, headline: string) =>
        `${headline}. What ${name} is, where the two overlap, where they differ, and when to pick each.`,
      primary: 'How s3nd works',
      what: { eyebrow: (name: string) => `What ${name} is`, title: 'In its own terms.' },
      matrix: { eyebrow: 'Side by side', title: 'Where they part ways.' },
      differences: { eyebrow: 'The differences', title: 'What actually changes.' },
      decision: {
        eyebrow: 'The decision',
        title: 'Pick the one that fits.',
        pickThem: (name: string) => `Pick ${name} when`,
        pickS3nd: 'Pick s3nd when',
        link: 'See the use cases',
      },
      more: { eyebrow: 'More comparisons', title: 'Tool by tool.' },
    },
  },

  board: {
    yourBucket: 'your bucket',
    expires: 'expires 1h',
    anyOtherMachine: 'any other machine',
    gone: 'gone',
  },

  demo: {
    typed: 'What the user typed',
    lookedUpPrefix: 'What',
    lookedUpSuffix: 'looks up',
    placeholder: 'K7QP 2M4X',
    typeACode: 'Type a code.',
    complete: 'Complete.',
    completeBody:
      'Separators dropped, case folded, and O, I and L read as 0, 1 and 1, because Crockford base32 has no O, I or L to confuse them with.',
    partial: '{have} of {need} characters. The input stays exactly as typed; only the lookup is repaired.',
    alphabet: 'Alphabet',
    chars: 'chars',
    bits: 'bits',
  },

  illustrations: {
    yourBucket: 'your bucket',
    putCaption: 'one PutObject · ifAbsent · expiry on the object',
    codeHint: 'lowercase, a dash, no I L O U',
    codeResult: '✓ normalized → K7QP2M4X',
    getCaption: 'any machine · until it expires',
    noMiddle: 'no relay · no account · nothing to deploy',
    machineA: 'machine A',
    machineB: 'machine B',
    midCaption: 'machine → bucket → machine. your provider’s bill, your retention rule.',
    oldPhone: 'old phone',
    newPhone: 'new phone',
    fromDevice: 'from Pixel 8',
    notes: '200 notes · 12:00',
    restore: 'restore',
    snapshot: 'snapshot',
    snapCaption: 'self-describing · refuses a newer schema · shown before replacing',
  },

  drop: {
    metaTitle: 'Deploy a drop box',
    metaDescription:
      'A small WeTransfer on your own bucket: drop a file, get a code, a link and a QR code, pick it up on any device until it expires, then burn it. A Next.js template built on s3nd, deployed to Vercel in one click.',
    keywords: ['self-hosted wetransfer', 'vercel file transfer template', 'nextjs file drop template s3', 's3nd drop'],
    crumb: 'Deploy a drop box',
    eyebrow: 'Template',
    title: 'Your own WeTransfer, on your own bucket.',
    lead: 'Drop a file, get an eight-character code, a link and a QR code; type the code or scan it on any device until it expires, then burn it. One Next.js app built on the library and the hooks, deployed to Vercel in one click with five environment variables.',
    primary: 'Deploy with Vercel',
    secondary: 'The template on GitHub',
    tertiary: 'Try it on drop.s3nd.sh',
    what: {
      eyebrow: 'What you get',
      title: 'Two pages and one route.',
      lead: 'The front page to drop a file or type a code, the pickup page, and the transfer handler between them. Everything else is yours to restyle.',
      cards: [
        {
          title: 'A drop zone',
          body: 'Drag a file in or pick one. It lands in your bucket under a fresh code with an expiry stamped on the object, and the page shows the code on a split-flap board, the link to share, and a QR code of that link.',
        },
        {
          title: 'Already have a code?',
          body: 'The other half of the front page: type the eight characters from the other screen, typos repaired as you go (`k7qp-2m4x` reads as `K7QP2M4X`), and land on the pickup page.',
        },
        {
          title: 'From a laptop to a phone',
          body: 'Point the phone’s camera at the QR code next to the board: the pickup page opens on the phone. Download there, and the page offers to burn the code right after, so nothing stays in the bucket.',
        },
        {
          title: 'A pickup page',
          body: '`/K7QP2M4X` shows the filename, the size and the time left, then hands the bytes over. An unknown or expired code gets the same 404, so nobody can probe which codes were used.',
        },
        {
          title: 'One route file',
          body: '`createTransferHandler()` serves the four-route protocol, so the CLI works against your deployment too: `s3nd put --remote https://drop.s3nd.sh/api/transfers`.',
        },
        {
          title: 'An optional password',
          body: 'Set `DROP_PASSWORD` and uploading asks for it; picking up never does. Without it, anyone who finds the page can drop a file in your bucket, which is fine behind a proxy and not fine on the open internet.',
        },
      ],
    },
    setup: {
      eyebrow: 'Setup',
      title: 'Five variables, one lifecycle rule.',
      lead: 'The bucket and a key pair scoped to it. Vercel asks for them when you deploy; locally they go in .env.local.',
      envTitle: '.env.local',
      steps: [
        'Create a bucket on R2, S3, Scaleway, Wasabi or a MinIO you host, and a key pair with read and write on that bucket and nothing else.',
        'Click Deploy, paste the five values, wait for the build.',
        'Add a lifecycle rule that deletes objects under the prefix after a day or two: the expiry stops a transfer being handed over, only the rule deletes the object.',
        'Run `npx @s3nd/cli doctor --remote https://drop.s3nd.sh/api/transfers` and watch it round-trip a real transfer.',
      ],
    },
    limits: {
      eyebrow: 'Worth knowing',
      title: 'What it does not do, yet.',
      cards: [
        {
          title: '4.5 MB on Vercel',
          body: 'A file goes through the function, so Vercel’s request limit applies. `DROP_MAX_SIZE_MB` sets the ceiling below it, and an oversized file is refused before anything is uploaded. Presigned browser uploads, which lift the limit, are on the roadmap.',
        },
        {
          title: 'No accounts',
          body: 'The code is the whole handshake, and it is a bearer token. The default expiry is a day; shorten it with `DROP_EXPIRES_IN` for anything sensitive, or encrypt before dropping.',
        },
        {
          title: 'Restyle freely',
          body: 'Tailwind, two pages, no design system to learn. The split-flap board and the amber are the site’s identity, not the template’s contract.',
        },
      ],
    },
    localTitle: 'run it locally',
  },
}

export type Dictionary = typeof en
