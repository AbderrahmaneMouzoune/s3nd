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
      'A small TypeScript toolkit for moving data from one device to another through an S3 bucket you own. A local-first app snapshots its IndexedDB state into the bucket under a short code; the user types that code on the other device and the state comes back. The same primitive moves files between machines from the command line.',
    link: { label: 'How it works', href: '/how-it-works' },
  },
  {
    question: 'Do I need a server?',
    answer:
      'When a browser takes part, yes: a browser cannot hold S3 credentials, so a small handler on your server sits between it and the bucket. s3nd ships that handler, and it is one route file. When every participant is a machine you control, the CLI talks to the bucket directly and there is nothing to deploy.',
    link: { label: 'Without a server', href: docs('/no-server') },
  },
  {
    question: 'Which storage providers work?',
    answer:
      'AWS S3 and anything that speaks the S3 API: Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi, Ceph and the rest. Set an endpoint and s3nd switches the two defaults those providers expect. The CLI writes a starter configuration for each.',
    link: { label: 'Storage providers', href: '/providers' },
  },
  {
    question: 'Is a sync code secure?',
    answer:
      'A code is a bearer token: whoever has it can read that one transfer while it lives. The default is eight Crockford base32 characters, forty bits, which is sound when a transfer expires within an hour and the lookup route is rate-limited. For sensitive data, encrypt in the browser before sending; s3nd stores whatever bytes you hand it.',
    link: { label: 'Sync codes', href: docs('/sync-codes') },
  },
  {
    question: 'How big can a snapshot be?',
    answer:
      "A snapshot goes through your server, so your runtime's request limit is the ceiling: 4.5 MB on Vercel functions, 6 MB on Lambda, whatever you configure on a long-running Node server. Snapshots are gzipped by default, and a database dump typically shrinks five to ten times, so that limit holds tens of thousands of ordinary records.",
    link: { label: 'Limits', href: docs('/limits') },
  },
  {
    question: 'Does it merge changes from two devices?',
    answer:
      'No. s3nd is a snapshot primitive, not a CRDT or a sync engine. A restore replaces what is on the receiving device, which is the right model for carrying data to a new phone. For two devices writing to one backup, conditional writes make the second writer fail loudly instead of silently overwriting the first, and your app decides how to merge.',
    link: { label: 'Two devices, one snapshot', href: docs('/two-devices') },
  },
  {
    question: 'Does it dump IndexedDB for me?',
    answer:
      'No, on purpose. Only your app knows its object stores, so exporting and importing them stays application code; a generic dumper would be wrong for most schemas. The IndexedDB example in the repository has a complete export and import pair to start from.',
    link: { label: 'Examples', href: '/examples' },
  },
  {
    question: 'What does it cost?',
    answer:
      'Nothing. Every package is MIT-licensed and there is no hosted service in the middle: the only bill is whatever your storage provider charges for a few small objects, and on Cloudflare R2 egress is free.',
  },
  {
    question: 'Which runtimes does it run on?',
    answer:
      'The library and the CLI need Node 20 or later, because the AWS SDK does. The transfer handler takes a Request and returns a Response, so it drops into Next.js, Hono, Bun.serve, Deno or a worker without an adapter. The browser packages depend on fetch and nothing else, so they run in a browser, a worker or React Native.',
  },
]
