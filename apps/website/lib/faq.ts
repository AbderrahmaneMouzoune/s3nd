import type { Locale } from './i18n/config'
import { docs } from './site'

export interface FaqEntry {
  question: string
  /** Plain text; used for the FAQ JSON-LD as well as the page. */
  answer: string
  link?: { label: string; href: string }
}

const en: FaqEntry[] = [
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

const fr: FaqEntry[] = [
  {
    question: 'Qu’est-ce que s3nd ?',
    answer:
      'Une façon d’envoyer n’importe quoi avec un code. s3nd put dépose un fichier dans un bucket S3 qui vous appartient et affiche huit caractères ; s3nd get sur n’importe quelle autre machine, avec le code, le télécharge. La même primitive tourne dans votre propre app sous forme de bibliothèque et de hooks React, et elle transporte des données structurées autant que des fichiers.',
    link: { label: 'Comment ça marche', href: '/how-it-works' },
  },
  {
    question: 'En quoi est-ce différent de WeTransfer, croc ou Magic Wormhole ?',
    answer:
      'Les octets vont dans votre bucket et nulle part ailleurs : pas de service hébergé, pas de relais, pas de compte d’un côté ni de l’autre. Et contrairement à un transfert pair-à-pair en direct, l’expéditeur s’en va et le code est utilisé plus tard, jusqu’à son expiration. Les pages de comparaison vont outil par outil et disent quand l’autre est le meilleur choix.',
    link: { label: 'Comparer', href: '/alternatives' },
  },
  {
    question: 'Ai-je besoin d’un serveur ?',
    answer:
      'Pas pour des machines que vous contrôlez : la CLI parle directement au bucket avec les identifiants de cette machine, et il n’y a rien à déployer. Il vous en faut un dès qu’un navigateur participe, parce qu’un navigateur ne peut pas détenir des identifiants S3. s3nd livre ce serveur sous forme d’un seul fichier de route, et la CLI lui parle avec un jeton plutôt qu’avec des clés.',
    link: { label: 'Sans serveur', href: docs('/no-server') },
  },
  {
    question: 'Quels fournisseurs de stockage fonctionnent ?',
    answer:
      'AWS S3 et tout ce qui parle l’API S3 : Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi, Ceph, Garage et les autres. Définissez un endpoint et s3nd bascule les deux valeurs par défaut que ces fournisseurs attendent. s3nd init écrit une configuration de départ par fournisseur, et s3nd doctor prouve qu’elle fonctionne avant que vous ne vous y fiiez.',
    link: { label: 'Fournisseurs de stockage', href: '/providers' },
  },
  {
    question: 'Un code, c’est sûr ?',
    answer:
      'Un code est un jeton au porteur : quiconque l’a peut lire ce transfert-là tant qu’il vit. Par défaut, huit caractères en base32 Crockford, quarante bits, ce qui est solide quand un transfert expire dans la journée et que la route de lecture est limitée en débit. Pour les données sensibles, chiffrez avant d’envoyer ; s3nd stocke les octets que vous lui donnez, tels quels.',
    link: { label: 'Codes de synchronisation', href: docs('/sync-codes') },
  },
  {
    question: 'Quelle taille peut faire un fichier ?',
    answer:
      'Depuis la CLI directement vers le bucket, un fichier monte en un seul PutObject, donc il est borné par la mémoire de la machine qui envoie plutôt que par une limite de requête : des centaines de mégaoctets passent, les archives de plusieurs gigaoctets attendent le multipart, qui est sur la feuille de route. Via votre serveur, la limite de requête du runtime s’applique, 4,5 Mo sur les fonctions Vercel et 6 Mo sur Lambda, sauf à présigner.',
    link: { label: 'Limites', href: docs('/limits') },
  },
  {
    question: 'Que se passe-t-il quand un transfert expire ?',
    answer:
      'Il n’est plus jamais remis : l’expiration est vérifiée à chaque lecture, et un code expiré répond le même NOT_FOUND qu’un code qui n’a jamais existé. L’objet lui-même est supprimé par une règle de cycle de vie sur votre bucket, dont s3nd doctor vérifie la présence, parce qu’un bucket qui se remplit discrètement de transferts expirés est la façon la plus courante de se tromper.',
  },
  {
    question: 'Peut-il déplacer les données d’une app, pas seulement des fichiers ?',
    answer:
      'Oui. Un snapshot est de l’état structuré enveloppé avec le nom de votre app, une version de schéma et une expiration, gzippé, et stocké sous un code. Une app local-first exporte son IndexedDB, le poste, et l’utilisateur tape le code sur son autre téléphone : pas de compte, et la version qui reçoit refuse un snapshot d’un schéma plus récent. C’est de là que s3nd est parti.',
    link: { label: 'Migrer une app sur un nouvel appareil', href: '/use-cases/new-device' },
  },
  {
    question: 'Combien ça coûte ?',
    answer:
      'Rien. Chaque package est sous licence MIT et il n’y a aucun service hébergé au milieu. La seule facture est ce que votre fournisseur de stockage demande pour quelques objets qui expirent, et sur Cloudflare R2 la sortie est gratuite.',
  },
  {
    question: 'Sur quels runtimes ça tourne ?',
    answer:
      'La bibliothèque et la CLI ont besoin de Node 20 ou plus, parce que le SDK AWS l’exige. Le handler de transfert prend une Request et renvoie une Response, donc il s’insère dans Next.js, Hono, Bun.serve, Deno ou un worker sans adaptateur. Les packages navigateur ne dépendent que de fetch, donc ils tournent dans un navigateur, un worker ou React Native.',
  },
]

const entries: Record<Locale, FaqEntry[]> = { en, fr }

export function faq(locale: Locale): FaqEntry[] {
  return entries[locale]
}
