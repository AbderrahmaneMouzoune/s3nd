import { docs } from './site'

export interface FaqEntry {
  question: string
  /** Plain text; used for the FAQ JSON-LD as well as the page. */
  answer: string
  link?: { label: string; href: string }
}

export const faq: FaqEntry[] = [
  {
    question: 'What is s3nd?',
    answer:
      'A way to send anything with a code. s3nd put drops a file into an S3 bucket you own and prints eight characters; s3nd get on any other machine, with the code, downloads it. The same primitive runs inside your own app as a library and React hooks, and it carries structured data as well as files.',
    link: { label: 'How it works', href: '/how-it-works' },
  },
  {
    question: 'How is it different from WeTransfer, croc or Magic Wormhole?',
    answer:
      'The bytes go into your bucket and nowhere else: no hosted service, no relay, no account on either end. And unlike a live peer-to-peer transfer, the sender leaves and the code is redeemed later, until it expires. The comparison pages go tool by tool and say when the other one is the better choice.',
    link: { label: 'Compare', href: '/alternatives' },
  },
  {
    question: 'Do I need a server?',
    answer:
      'Not for machines you control: the CLI talks to the bucket directly with the credentials on that machine, and there is nothing to deploy. You need one as soon as a browser takes part, because a browser cannot hold S3 credentials. s3nd ships that server as one route file, and the CLI talks to it with a token instead of keys.',
    link: { label: 'Without a server', href: docs('/no-server') },
  },
  {
    question: 'Which storage providers work?',
    answer:
      'AWS S3 and anything that speaks the S3 API: Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi, Ceph, Garage and the rest. Set an endpoint and s3nd switches the two defaults those providers expect. s3nd init writes a starter configuration per provider, and s3nd doctor proves it works before you rely on it.',
    link: { label: 'Storage providers', href: '/providers' },
  },
  {
    question: 'Is a code secure?',
    answer:
      'A code is a bearer token: whoever has it can read that one transfer while it lives. The default is eight Crockford base32 characters, forty bits, which is sound when a transfer expires within a day and the lookup route is rate-limited. For sensitive payloads, encrypt before sending; s3nd stores whatever bytes you hand it.',
    link: { label: 'Sync codes', href: docs('/sync-codes') },
  },
  {
    question: 'How big can a file be?',
    answer:
      "From the CLI straight to the bucket, a file goes up in one PutObject, so it is bound by the memory of the sending machine rather than by a request limit: hundreds of megabytes are fine, multi-gigabyte archives wait for multipart, which is on the roadmap. Through your server, the runtime's request limit applies, 4.5 MB on Vercel functions and 6 MB on Lambda, unless you presign.",
    link: { label: 'Limits', href: docs('/limits') },
  },
  {
    question: 'What happens when a transfer expires?',
    answer:
      'It is never handed over again: the expiry is checked on every read, and an expired code answers the same NOT_FOUND as one that never existed. The object itself is deleted by a lifecycle rule on your bucket, which s3nd doctor checks you have, because a bucket quietly filling up with expired transfers is the most common way this goes wrong.',
  },
  {
    question: "Can it move an app's data, not only files?",
    answer:
      'Yes. A snapshot is structured state wrapped in an envelope with your app name, a schema version and an expiry, gzipped, and stored under a code. A local-first app exports its IndexedDB, posts it, and the user types the code on their other phone: no account, and the receiving build refuses a snapshot from a newer schema. That is where s3nd started.',
    link: { label: 'Move an app to a new device', href: '/use-cases/new-device' },
  },
  {
    question: 'What does it cost?',
    answer:
      'Nothing. Every package is MIT-licensed and there is no hosted service in the middle. The only bill is what your storage provider charges for a few objects that expire, and on Cloudflare R2 egress is free.',
  },
  {
    question: 'Which runtimes does it run on?',
    answer:
      'The library and the CLI need Node 20 or later, because the AWS SDK does. The transfer handler takes a Request and returns a Response, so it drops into Next.js, Hono, Bun.serve, Deno or a worker without an adapter. The browser packages depend on fetch and nothing else, so they run in a browser, a worker or React Native.',
  },
]
