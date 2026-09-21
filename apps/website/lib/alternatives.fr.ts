import type { AlternativeCopy, AlternativeSlug, CategoryCopy, MatrixKey } from './alternatives'

export const categoriesFr: CategoryCopy = {
  'file-transfer': {
    title: 'Transfert de fichiers en ligne de commande',
    blurb:
      'Des outils qui déplacent un fichier entre deux machines avec un code. Les cousins les plus proches de la CLI.',
  },
  'file-sharing': {
    title: 'Partage de fichiers pour les gens',
    blurb: 'Envoyer, obtenir un lien, l’envoyer à quelqu’un. Des produits d’abord, des primitives ensuite.',
  },
  'sync-engine': {
    title: 'Moteurs de synchronisation local-first',
    blurb:
      'Une synchronisation continue, multi-utilisateurs, entre une base cliente et un backend. Un autre travail, plus gros.',
  },
  'storage-tooling': {
    title: 'Outillage de stockage',
    blurb: 'Des outils généralistes pour parler à un bucket. Plus larges que s3nd, et sans le code.',
  },
}

export const matrixDimensionsFr: Record<MatrixKey, string> = {
  shape: 'Ce que c’est',
  storage: 'Où vivent les données',
  online: 'Les deux côtés en ligne en même temps',
  browser: 'Depuis votre app web',
  accounts: 'Comptes',
  hosting: 'Hébergement',
  price: 'Prix',
  license: 'Licence',
}

export const s3ndMatrixFr: Record<MatrixKey, string> = {
  shape: 'Une CLI, une bibliothèque et des hooks React sur votre propre bucket S3',
  storage: 'Votre bucket : S3, R2, MinIO, Scaleway, Wasabi',
  online: 'Non. Le code est utilisé plus tard, jusqu’à expiration',
  browser: 'Oui, via une route sur votre serveur',
  accounts: 'Aucun. Le code est toute la poignée de main',
  hosting: 'Votre bucket, plus votre serveur quand un navigateur participe',
  price: 'Gratuit. Vous payez votre fournisseur de stockage pour quelques objets qui expirent',
  license: 'MIT',
}

export const alternativesFr: Record<AlternativeSlug, AlternativeCopy> = {
  'magic-wormhole': {
    headline: 'Une alternative à Magic Wormhole qui passe par votre propre bucket',
    what: 'Un outil en ligne de commande qui envoie des fichiers et des dossiers d’un ordinateur à un autre avec un code court et lisible, du genre 7-crossover-clockwork. Les deux côtés exécutent un PAKE, donc le code sert à la fois à trouver le pair et à chiffrer ; les octets voyagent directement entre les machines, ou via un relais de transit quand elles ne peuvent pas se joindre.',
    overlap:
      'Les deux vous donnent un code court dans un terminal, les deux sont open source, et les deux existent pour une personne qui emporte quelque chose d’une machine à une autre sans compte.',
    differences: [
      {
        title: 'Asynchrone, pas en direct',
        body: 'Wormhole a besoin des deux côtés en même temps : l’expéditeur attend que le destinataire saisisse le code. s3nd écrit dans le bucket et s’en va. Le code est utilisé quand l’autre machine y arrive, jusqu’à l’expiration du transfert.',
      },
      {
        title: 'Votre bucket, pas un relais',
        body: 'Wormhole passe par un serveur de rendez-vous et, quand la connexion directe échoue, un relais de transit ; publics par défaut, à vous si vous les hébergez. s3nd stocke l’objet dans un bucket que vous possédez déjà, et il n’y a aucun relais à faire tourner ni à croire.',
      },
      {
        title: 'D’où vient le chiffrement',
        body: 'Wormhole est chiffré de bout en bout par construction. s3nd est chiffré en transit et au repos par votre fournisseur ; le bout en bout est à vous d’ajouter en chiffrant avant d’envoyer, et le code est un jeton au porteur qu’une expiration courte et une limite de débit protègent.',
      },
      {
        title: 'Aussi une bibliothèque',
        body: 'Wormhole est un outil pour des gens devant un clavier. s3nd livre la même primitive en bibliothèque et en hooks React, donc une app web peut déplacer son propre état IndexedDB avec le même code.',
      },
    ],
    pickThem: [
      'Vous voulez du chiffrement de bout en bout sans y penser.',
      'Les deux machines sont en ligne et vous êtes aux deux claviers.',
      'Vous n’avez pas de bucket et préférez ne pas en créer.',
    ],
    pickS3nd: [
      'L’expéditeur part avant que le destinataire n’arrive.',
      'Vous payez déjà un bucket et voulez que les octets y restent.',
      'Ce qui bouge est l’état d’une app, pas un fichier sur disque.',
    ],
    matrix: {
      shape: 'Transfert de fichiers en CLI avec un code dictable',
      storage: 'En transit seulement : pair à pair, ou via un relais de transit',
      online: 'Oui',
      browser: 'Non, terminal d’abord',
      accounts: 'Aucun',
      hosting: 'Serveurs de rendez-vous et de relais publics par défaut ; auto-hébergeable',
      price: 'Gratuit',
      license: 'MIT',
    },
    keywords: ['alternative à magic wormhole', 'magic-wormhole vs', 'envoyer un fichier avec un code terminal'],
  },
  croc: {
    headline: 'Une alternative à croc sans rien qui tourne entre les deux machines',
    what: 'Un outil en ligne de commande en Go pour envoyer des fichiers et des dossiers entre deux ordinateurs quelconques avec une phrase-code. Il utilise un PAKE pour le chiffrement de bout en bout, un relais pour traverser les NAT, reprend les transferts interrompus, et se livre en un seul binaire pour chaque plateforme.',
    overlap:
      'Un code dans un terminal, pas de compte, open source, et un expéditeur qui ne veut pas penser au réseau. croc est l’outil vers lequel la plupart des gens se tournent quand ils veulent exactement ce que fait la CLI s3nd.',
    differences: [
      {
        title: 'En direct ou stocké',
        body: 'croc streame tant que les deux côtés sont connectés. s3nd stocke l’objet et s’en va ; le code fonctionne plus tard, depuis une machine qui était éteinte quand le transfert a été fait.',
      },
      {
        title: 'Un relais ou un bucket',
        body: 'croc utilise un relais public par défaut et vous laisse héberger le vôtre. s3nd utilise le bucket que vous avez déjà, avec la durabilité, les règles de cycle de vie et la facturation du fournisseur.',
      },
      {
        title: 'Reprise et taille',
        body: 'croc reprend un transfert interrompu et gère très bien les fichiers énormes. s3nd fait un seul PutObject aujourd’hui, ce qui convient aux snapshots et aux fichiers ordinaires ; le multipart est sur la feuille de route.',
      },
      {
        title: 'Une primitive, pas seulement un outil',
        body: 'Le même code qui fait tourner la CLI tourne dans une route Next.js et derrière des hooks React, donc une application peut offrir le même « déplacer avec un code » à ses utilisateurs.',
      },
    ],
    pickThem: [
      'Les deux côtés sont en ligne et vous voulez du chiffrement de bout en bout gratuitement.',
      'Des fichiers de plusieurs gigaoctets où la reprise compte.',
      'Aucun compte cloud d’aucune sorte, pas même un bucket.',
    ],
    pickS3nd: [
      'Les deux machines ne sont jamais en ligne en même temps.',
      'Un serveur devant, qui distribue des jetons plutôt que des clés S3, pour une équipe.',
      'Une app web qui déplace ses propres données, avec la CLI en bonus.',
    ],
    matrix: {
      shape: 'Transfert de fichiers en CLI avec une phrase-code',
      storage: 'En transit seulement, via un relais',
      online: 'Oui',
      browser: 'Non',
      accounts: 'Aucun',
      hosting: 'Relais public par défaut ; auto-hébergeable',
      price: 'Gratuit',
      license: 'MIT',
    },
    keywords: ['alternative à croc', 'croc vs', 'transfert de fichier par code cli'],
  },
  wetransfer: {
    headline: 'Une alternative à WeTransfer qui garde le fichier dans votre propre bucket',
    what: 'Un service hébergé de partage de fichiers : envoyer dans le navigateur, obtenir un lien, l’envoyer par e-mail. L’offre gratuite a une limite de taille et une expiration, et les offres payantes relèvent la limite, ajoutent une protection par mot de passe et gardent les fichiers plus longtemps. C’est un produit pour les gens, soigné et familier.',
    overlap:
      'Quelqu’un a un fichier, quelqu’un d’autre en a besoin, et aucun des deux ne veut rien installer. Les deux remettent une petite chose, un lien ou un code, qui expire.',
    differences: [
      {
        title: 'Leurs serveurs ou votre bucket',
        body: 'Un envoi WeTransfer vit sur l’infrastructure de WeTransfer, selon leurs conditions. Un transfert s3nd vit dans votre bucket, selon votre règle de rétention, et nulle part ailleurs.',
      },
      {
        title: 'Un produit ou une primitive',
        body: 'WeTransfer est une page web. s3nd est une commande que vous pouvez mettre dans un script ou un job de CI, une route que vous pouvez monter dans votre API, et des hooks que vous pouvez mettre dans votre app React.',
      },
      {
        title: 'Un lien ou un code',
        body: 'Un lien se colle ; un code se lit à voix haute ou se tape depuis un autre écran. Les deux fonctionnent ; les codes s3nd sont faits pour survivre à une mauvaise lecture, avec les lettres confondables retirées et réparées.',
      },
      {
        title: 'Une interface que vous déployez vous-même',
        body: 's3nd ne livre pas de page d’envoi hébergée, mais le template drop en est une : une app Next.js avec une zone de dépôt et une page de récupération, déployée sur Vercel en un clic au-dessus de votre bucket. Si le destinataire est une personne non technique qui clique dans un e-mail, WeTransfer reste l’expérience la plus soignée, et la réponse honnête.',
      },
    ],
    pickThem: [
      'Envoyer à quelqu’un qui cliquera sur un lien dans un e-mail.',
      'Aucune infrastructure du tout, pas même un bucket.',
      'Une expérience d’envoi et de téléchargement soignée est le but.',
    ],
    pickS3nd: [
      'Les données ne doivent jamais quitter votre fournisseur de stockage.',
      'Le transfert est automatisé : un script, un workflow, une app.',
      'Ce qui bouge est l’état d’une app, pas un fichier pour une personne.',
    ],
    matrix: {
      shape: 'Partage de fichiers hébergé, par lien',
      storage: 'Les serveurs de WeTransfer',
      online: 'Non',
      browser: 'Leur app web, pas la vôtre',
      accounts: 'Optionnel en gratuit, requis en payant',
      hosting: 'Hébergé uniquement',
      price: 'Offre gratuite, offres payantes',
      license: 'Propriétaire',
    },
    keywords: ['alternative à wetransfer', 'wetransfer auto-hébergé', 'alternative wetransfer open source'],
  },
  'firefox-send': {
    headline: 'Une alternative à Firefox Send qui n’a besoin de rien déployer',
    what: 'Le service de partage de fichiers chiffré de bout en bout de Mozilla : envoyer, obtenir un lien, et le fichier expirait après un nombre de téléchargements ou une durée. Mozilla a fermé le service en 2020. Le code était open source, et des forks communautaires, notamment le Send de timvisee, le maintiennent en vie comme quelque chose que vous hébergez vous-même.',
    overlap:
      'Des transferts éphémères qui expirent tout seuls, pas de compte, open source, et une conception qui suppose que le serveur ne doit pas être digne de confiance pour le contenu.',
    differences: [
      {
        title: 'Une app web à déployer ou une route à monter',
        body: 'Un fork de Send est une application entière : un serveur Node, un Redis, un backend de stockage, un front. s3nd est une bibliothèque que vous appelez depuis votre propre API, ou une CLI qui parle au bucket sans rien qui tourne.',
      },
      {
        title: 'Chiffrement intégré ou chiffrement que vous ajoutez',
        body: 'Send chiffre dans le navigateur et met la clé dans le fragment de l’URL. s3nd stocke les octets que vous lui donnez, donc la même conception tient en quelques lignes de WebCrypto de votre côté, documentées dans le guide de synchronisation chiffrée.',
      },
      {
        title: 'Des fichiers pour les gens ou de l’état pour les apps',
        body: 'Send déplace un fichier vers une personne avec un lien. s3nd déplace aussi une base de données vers un autre appareil avec un code, avec des versions de schéma et une expiration vérifiée à la lecture.',
      },
    ],
    pickThem: [
      'Vous voulez une page web à lien partageable pour les gens, auto-hébergée.',
      'Du chiffrement de bout en bout dans le navigateur, prêt à l’emploi.',
    ],
    pickS3nd: [
      'Aucune application à faire tourner : un bucket et, au plus, une route dans l’app que vous avez déjà.',
      'Déplacer de l’état d’application, pas seulement des fichiers.',
      'La CLI vers un bucket, sans rien déployer nulle part.',
    ],
    matrix: {
      shape: 'Partage de fichiers chiffré de bout en bout par lien ; arrêté, les forks sont auto-hébergeables',
      storage: 'Le stockage du serveur Send ; les forks peuvent utiliser S3',
      online: 'Non',
      browser: 'Sa propre app web',
      accounts: 'Aucun',
      hosting: 'Forks auto-hébergés uniquement',
      price: 'Gratuit',
      license: 'MPL-2.0',
    },
    keywords: [
      'alternative à firefox send',
      'remplacement de firefox send',
      'partage de fichiers chiffré auto-hébergé',
    ],
  },
  pairdrop: {
    headline: 'Une alternative à PairDrop pour quand l’autre appareil n’est pas dans la pièce',
    what: 'Un transfert de fichiers pair-à-pair dans le navigateur entre des appareils du même réseau, dans l’esprit d’AirDrop et fork de Snapdrop : ouvrez la page sur les deux appareils, ils se voient, déposez le fichier. WebRTC transporte les octets et un petit serveur de signalisation présente les pairs. L’appairage entre réseaux est possible avec un code.',
    overlap:
      'Pas de compte, rien à installer, open source, et une personne qui déplace quelque chose entre deux de ses propres appareils. Les deux tiennent les octets à l’écart d’un tiers.',
    differences: [
      {
        title: 'Maintenant ou plus tard',
        body: 'PairDrop fonctionne tant que les deux appareils ont la page ouverte. s3nd stocke le transfert dans le bucket, et l’autre appareil le récupère quand il est allumé, aussi longtemps que le transfert vit.',
      },
      {
        title: 'Rien de stocké ou stocké dans votre bucket',
        body: 'PairDrop ne garde rien nulle part, ce qui est une fonctionnalité. s3nd garde l’objet jusqu’à expiration, ce qui est une autre fonctionnalité : le transfert survit à un onglet fermé.',
      },
      {
        title: 'Une page pour les gens ou une primitive pour les apps',
        body: 'PairDrop est l’interface. s3nd est ce sur quoi vous construisez une interface, dans votre app, avec un code que ses utilisateurs tapent.',
      },
    ],
    pickThem: [
      'Deux appareils dans la même pièce, tout de suite.',
      'Rien ne doit être écrit nulle part, jamais.',
      'Une URL des deux côtés et aucune configuration, c’est tout le besoin.',
    ],
    pickS3nd: [
      'L’autre appareil n’est pas encore là, ou pas allumé.',
      'Un script ou une app est un côté du transfert, pas une personne avec un onglet.',
      'Vous voulez que le transfert vive, brièvement, dans un bucket que vous contrôlez.',
    ],
    matrix: {
      shape: 'Transfert pair-à-pair dans le navigateur sur un réseau local',
      storage: 'Nulle part : pair à pair',
      online: 'Oui, en même temps',
      browser: 'Sa propre page web',
      accounts: 'Aucun',
      hosting: 'Instance publique, auto-hébergeable',
      price: 'Gratuit',
      license: 'GPL-3.0',
    },
    keywords: ['alternative à pairdrop', 'alternative à snapdrop', 'alternative à airdrop multiplateforme'],
  },
  'transfer-sh': {
    headline: 'Une alternative à transfer.sh sans service à faire tourner',
    what: 'Un service de partage de fichiers piloté avec curl : PUT un fichier, recevez une URL, partagez-la. Écrit en Go, auto-hébergeable, avec des backends de stockage interchangeables dont S3. L’instance publique l’a rendu célèbre ; le serveur auto-hébergé est ce que les équipes font vraiment tourner.',
    overlap:
      'Un partage pensé pour le terminal, un petit secret à transmettre, et une expiration. Les deux sont contents de stocker l’objet dans un bucket S3.',
    differences: [
      {
        title: 'Un serveur que vous faites tourner ou un bucket que vous avez',
        body: 'transfer.sh est un service devant du stockage. La CLI s3nd est le bucket sans service devant ; quand vous voulez vraiment un serveur, c’est une route dans l’API que vous déployez déjà.',
      },
      {
        title: 'Une URL ou un code',
        body: 'Un lien transfer.sh porte un chemin aléatoire qui est le secret. Un code s3nd, ce sont huit caractères conçus pour être lus à voix haute, avec les lettres confondables retirées et réparées au retour.',
      },
      {
        title: 'Des fichiers ou des fichiers et de l’état',
        body: 'transfer.sh déplace des fichiers. s3nd déplace des fichiers et des snapshots d’état d’application, avec des versions de schéma et des écritures conditionnelles, depuis une bibliothèque autant qu’une commande.',
      },
    ],
    pickThem: [
      'Un endpoint d’envoi pilotable par curl pour une équipe, avec des liens.',
      'Vous le faites déjà tourner et ça marche.',
    ],
    pickS3nd: [
      'Rien à faire tourner : la CLI parle directement au bucket.',
      'Des codes que les gens peuvent lire à voix haute plutôt que des URL à coller.',
      'De l’état d’application avec versionnage et expiration vérifiée à la lecture.',
    ],
    matrix: {
      shape: 'Service d’envoi auto-hébergeable avec des liens',
      storage: 'Le stockage de son serveur ; un backend S3 est disponible',
      online: 'Non',
      browser: 'Par URL',
      accounts: 'Aucun',
      hosting: 'Auto-hébergé',
      price: 'Gratuit',
      license: 'MIT',
    },
    keywords: ['alternative à transfer.sh', 'partage de fichier upload curl', 'upload de fichier auto-hébergé cli'],
  },
  'dexie-cloud': {
    headline: 'Une alternative à Dexie Cloud pour les apps sans comptes',
    what: 'Un service de synchronisation pour Dexie.js, le wrapper IndexedDB. Ajoutez l’addon, pointez-le sur une base Dexie Cloud, et les tables locales se synchronisent en continu, avec authentification, contrôle d’accès par objet et mises à jour en temps réel. Hébergé par l’équipe Dexie, avec une offre gratuite et des offres payantes, et une option sur site.',
    overlap:
      'Les deux partent d’IndexedDB dans un navigateur et finissent avec les mêmes données sur un autre appareil. Si votre app est bâtie sur Dexie, les deux sont à une dépendance de distance.',
    differences: [
      {
        title: 'Synchronisation continue ou snapshot',
        body: 'Dexie Cloud synchronise chaque changement, dans les deux sens, tout le temps, et fusionne. s3nd prend un snapshot de toute la base et le transporte une fois, ou réécrit une sauvegarde par utilisateur avec une écriture conditionnelle. Il ne fusionne pas ; votre app le fait, quand elle le veut.',
      },
      {
        title: 'Des comptes ou un code',
        body: 'Dexie Cloud identifie les utilisateurs, c’est ainsi qu’il sait quelles données synchroniser et qui peut les voir. s3nd n’a aucune notion d’utilisateur : un code est toute la poignée de main, exactement ce qu’une app local-first sans connexion demande.',
      },
      {
        title: 'Leur service ou votre bucket',
        body: 'Dexie Cloud est un backend que l’équipe Dexie fait tourner pour vous. s3nd, ce sont quelques petits objets dans un bucket que vous possédez déjà, sans service au milieu.',
      },
      {
        title: 'Dexie ou n’importe quoi',
        body: 'Dexie Cloud a besoin de Dexie. s3nd stocke ce que votre app exporte, depuis Dexie, IndexedDB brut, SQLite en WASM, ou un simple objet.',
      },
    ],
    pickThem: [
      'Vous utilisez Dexie et voulez une synchronisation multi-appareils continue avec partage et permissions.',
      'De la collaboration en temps réel entre utilisateurs.',
      'Un backend hébergé vous va, et même vous arrange.',
    ],
    pickS3nd: [
      'L’app n’a pas de comptes et vous voulez que ça reste ainsi.',
      'Une migration unique vers un nouvel appareil, ou une sauvegarde, pas de la synchronisation en direct.',
      'Les données doivent rester dans votre propre bucket.',
      'Vous n’utilisez pas Dexie.',
    ],
    matrix: {
      shape: 'Service de synchronisation continue pour Dexie.js',
      storage: 'Les serveurs de Dexie Cloud',
      online: 'Non',
      browser: 'Oui, c’est le but',
      accounts: 'Requis',
      hosting: 'Hébergé par Dexie ; une option sur site est proposée',
      price: 'Offre gratuite, offres payantes',
      license: 'Service propriétaire ; l’addon client est open source',
    },
    keywords: ['alternative à dexie cloud', 'alternative dexie sync', 'synchronisation indexeddb sans comptes'],
  },
  powersync: {
    headline: 'Une alternative à PowerSync quand il n’y a pas de base de données backend',
    what: 'Un moteur de synchronisation qui garde une base SQLite côté client alignée sur votre Postgres, MongoDB ou MySQL. Des règles de synchronisation décident quelles lignes chaque utilisateur reçoit, les écritures repassent par votre propre backend, et les SDK clients couvrent le web, React Native, Flutter, Swift et Kotlin. Disponible en cloud hébergé ou auto-hébergé.',
    overlap:
      'Les deux sont offline-first : l’app lit et écrit localement et le réseau est un souci d’arrière-plan. Les deux laissent un utilisateur reprendre sur un autre appareil.',
    differences: [
      {
        title: 'Une base sur le serveur ou aucune',
        body: 'PowerSync réplique depuis une base backend qui est la source de vérité. s3nd suppose que le navigateur est la source de vérité et qu’il n’y a peut-être aucune base backend ; le bucket contient un snapshot, pas une réplique.',
      },
      {
        title: 'Réplication partielle et continue ou snapshot entier',
        body: 'PowerSync streame les lignes qu’un utilisateur a le droit de voir, au fil des changements. s3nd déplace toute la base locale une fois, ou réécrit un objet de sauvegarde par utilisateur.',
      },
      {
        title: 'Un service ou un bucket',
        body: 'PowerSync est un service à faire tourner ou à louer, avec des règles de synchronisation à écrire. s3nd, c’est une route et un bucket, et une journée de travail.',
      },
      {
        title: 'Des utilisateurs ou des codes',
        body: 'PowerSync authentifie chaque client avec un JWT. s3nd fonctionne sans aucune identité : un code, une expiration, une limite de débit.',
      },
    ],
    pickThem: [
      'Vous avez un Postgres et le voulez côté client, offline-first.',
      'Beaucoup d’utilisateurs, des permissions par ligne, des mises à jour en direct.',
      'Des SDK mobiles natifs sont une exigence.',
    ],
    pickS3nd: [
      'Il n’y a pas de base backend ; le navigateur détient les données.',
      'Un code, pas une connexion.',
      'Toute la fonctionnalité doit tenir en un après-midi.',
    ],
    matrix: {
      shape: 'Moteur de synchronisation Postgres, MongoDB ou MySQL vers SQLite côté client',
      storage: 'Votre base, répliquée sur chaque client',
      online: 'Non',
      browser: 'Oui, SDK web',
      accounts: 'Requis, JWT',
      hosting: 'Cloud hébergé ou auto-hébergé',
      price: 'Offre gratuite et offres payantes ; l’auto-hébergement est gratuit',
      license: 'SDK clients Apache-2.0 ; le service est source-available',
    },
    keywords: [
      'alternative à powersync',
      'synchronisation offline-first sans postgres',
      'synchronisation local-first simple',
    ],
  },
  electricsql: {
    headline: 'Une alternative à ElectricSQL pour les apps sans Postgres',
    what: 'Un moteur de synchronisation Postgres. Electric tourne à côté de votre base et expose des shapes, des sous-ensembles filtrés d’une table, via HTTP ; les clients s’abonnent et gardent les lignes localement, et les lectures passent à l’échelle via des CDN ordinaires. Les écritures passent par votre propre API. Open source, avec un Electric Cloud hébergé.',
    overlap:
      'Des données locales, des lectures hors ligne, et un utilisateur qui attend le même état sur chaque appareil. Les deux gardent le chemin d’écriture entre vos mains.',
    differences: [
      {
        title: 'Postgres ou un bucket',
        body: 'Electric a besoin d’un Postgres depuis lequel synchroniser et y excelle. s3nd a besoin d’un bucket S3 dans lequel stocker et reste tout petit. Ils résolvent la même histoire utilisateur aux deux extrémités du spectre de l’infrastructure.',
      },
      {
        title: 'Des lignes vivantes ou un snapshot',
        body: 'Une shape est une vue vivante qui continue de se mettre à jour. Un snapshot est toute la base locale à un instant, transportée avec un code ou réécrite comme sauvegarde.',
      },
      {
        title: 'Un composant à déployer ou une route à ajouter',
        body: 'Electric est un service entre Postgres et vos clients. s3nd est une fonction dans l’API que vous avez déjà, ou une CLI sans rien de déployé.',
      },
    ],
    pickThem: [
      'Postgres est la source de vérité et vous le voulez côté client.',
      'Beaucoup d’utilisateurs qui lisent des données qui se recoupent, avec des mises à jour en direct.',
      'Un chemin de lecture qui passe à l’échelle via un CDN.',
    ],
    pickS3nd: [
      'Pas de Postgres, ou aucune base backend du tout.',
      'Migration vers un nouvel appareil, sauvegarde, export chiffré : les cas en un coup.',
      'La plus petite chose qui marche.',
    ],
    matrix: {
      shape: 'Moteur de synchronisation Postgres en lecture, shapes via HTTP',
      storage: 'Votre Postgres, répliqué vers les clients',
      online: 'Non',
      browser: 'Oui',
      accounts: 'Ce que votre API exige',
      hosting: 'Auto-hébergé ou Electric Cloud',
      price: 'Gratuit ; le cloud est payant',
      license: 'Apache-2.0',
    },
    keywords: ['alternative à electricsql', 'electric sql vs', 'local-first sans moteur de synchronisation'],
  },
  replicache: {
    headline: 'Une alternative à Replicache pour des migrations en un coup plutôt que du multijoueur',
    what: 'Un framework de synchronisation côté client de Rocicorp. Votre app écrit dans un cache local via des mutateurs, Replicache les pousse vers votre backend et tire les mises à jour en retour, et vous implémentez push et pull sur votre serveur contre votre propre base. Rocicorp construit maintenant Zero, un successeur piloté par les requêtes avec son propre serveur de synchronisation.',
    overlap:
      'Des écritures locales optimistes, une app qui continue de fonctionner hors ligne, et des données qui apparaissent sur l’autre appareil de l’utilisateur.',
    differences: [
      {
        title: 'Un framework avec un contrat backend ou une primitive',
        body: 'Replicache vous demande d’implémenter push et pull, de garder une version par client et par espace, et de tout stocker dans une base backend. s3nd demande un bucket et vous donne put et get.',
      },
      {
        title: 'Multijoueur ou transfert personnel',
        body: 'Replicache est bâti pour beaucoup de clients qui éditent des données partagées en temps réel avec rebase et résolution de conflits. s3nd est bâti pour une personne qui emporte ses propres données sur son prochain appareil.',
      },
      {
        title: 'Identité implicite ou aucune',
        body: 'Push et pull ont besoin de savoir qui est le client. Un code de synchronisation n’a besoin de rien savoir.',
      },
    ],
    pickThem: [
      'Multijoueur, temps réel, UI optimiste contre votre propre backend.',
      'Vous êtes prêt à implémenter push et pull, ou à adopter Zero.',
    ],
    pickS3nd: [
      'Il n’y a pas de base backend contre laquelle synchroniser.',
      'La migration se fait une fois, ou une sauvegarde est réécrite de temps en temps.',
      'Des codes, pas des comptes.',
    ],
    matrix: {
      shape: 'Framework de synchronisation client avec push et pull sur votre backend',
      storage: 'Votre base backend, mise en cache sur le client',
      online: 'Non',
      browser: 'Oui',
      accounts: 'Ce que votre backend exige',
      hosting: 'Votre backend ; Zero ajoute un serveur de synchronisation',
      price: 'Gratuit',
      license: 'Source available ; Zero est Apache-2.0',
    },
    keywords: ['alternative à replicache', 'replicache vs', 'alternative simple à zero sync'],
  },
  pouchdb: {
    headline: 'Une alternative à PouchDB qui n’a pas besoin d’un CouchDB',
    what: 'Une base de données JavaScript qui tourne dans le navigateur, sur IndexedDB, et se réplique avec CouchDB ou tout ce qui parle son protocole de réplication. Bidirectionnelle, incrémentale, avec détection de conflits par arbres de révisions, et présente depuis plus de dix ans.',
    overlap:
      'IndexedDB dans le navigateur, les mêmes données sur un autre appareil, et une conception qui traite le hors-ligne comme normal plutôt que comme une erreur.',
    differences: [
      {
        title: 'Une base ou un snapshot de la vôtre',
        body: 'PouchDB est la base, avec son modèle de documents et ses révisions. s3nd laisse votre base tranquille, quelle qu’elle soit, et en déplace un export.',
      },
      {
        title: 'Un CouchDB ou un bucket',
        body: 'La réplication a besoin d’un CouchDB, ou d’un serveur compatible, qui tourne quelque part. s3nd a besoin de stockage objet et de rien d’autre.',
      },
      {
        title: 'Réplication continue ou code',
        body: 'PouchDB synchronise tant qu’il est connecté. s3nd déplace les données une fois, quand l’utilisateur le demande, et le code est le seul identifiant.',
      },
    ],
    pickThem: [
      'Vous voulez une base qui se synchronise, avec les révisions et les conflits comme concepts de premier ordre.',
      'Un CouchDB que vous faites déjà tourner, ou un hébergé que vous êtes content de louer.',
      'La réplication bidirectionnelle continue est la fonctionnalité.',
    ],
    pickS3nd: [
      'Vous gardez votre propre schéma IndexedDB et votre propre wrapper.',
      'Du stockage objet est tout ce que vous voulez faire tourner.',
      'Nouvel appareil avec un code, sauvegarde, ou export chiffré.',
    ],
    matrix: {
      shape: 'Base de données navigateur avec réplication CouchDB',
      storage: 'Un serveur CouchDB, ou un compatible',
      online: 'Non',
      browser: 'Oui',
      accounts: 'Authentification CouchDB',
      hosting: 'CouchDB auto-hébergé ou hébergé',
      price: 'Gratuit',
      license: 'Apache-2.0',
    },
    keywords: ['alternative à pouchdb', 'alternative pouchdb couchdb s3', 'réplication indexeddb simple'],
  },
  firebase: {
    headline: 'Une alternative à Firebase pour les apps local-first qui gardent leurs données',
    what: 'La base de documents hébergée de Google, Cloud Firestore, avec des écouteurs en temps réel et une persistance hors ligne sur web et mobile. Le SDK met en cache localement, met les écritures en file hors ligne et réconcilie à la reconnexion. Facturée par lecture, écriture et suppression de document, et par gigaoctet stocké, avec le reste de la plateforme Firebase : auth, règles, fonctions, hébergement.',
    overlap:
      'Un utilisateur qui ouvre l’app sur un second appareil et y retrouve ses données. Les deux gèrent le cas hors ligne sans que l’app s’en aperçoive.',
    differences: [
      {
        title: 'Les serveurs de Google ou votre bucket',
        body: 'Firestore est la source de vérité et vit sur Google Cloud. Avec s3nd, la source de vérité est l’appareil, et le bucket est à vous : S3, R2, MinIO, où vous décidez.',
      },
      {
        title: 'Facturation à l’opération ou quelques objets',
        body: 'Firestore facture chaque lecture et chaque écriture. Un snapshot est un objet, écrit quand l’utilisateur le demande ou après temporisation, et le coût ne vaut pas la peine d’être calculé.',
      },
      {
        title: 'Une plateforme ou une primitive',
        body: 'Firebase, c’est de l’auth, des règles, des fonctions et une console. s3nd, c’est put, get et un code. Aucun des deux n’est une critique de l’autre.',
      },
    ],
    pickThem: [
      'Du temps réel entre beaucoup d’utilisateurs et vous voulez que Google fasse tout tourner.',
      'Vous voulez aussi l’auth, les règles, les fonctions et l’hébergement.',
      'Du mobile natif avec persistance hors ligne prête à l’emploi.',
    ],
    pickS3nd: [
      'Les données ne doivent pas vivre sur les serveurs d’un tiers.',
      'Un coût prévisible : quelques objets, pas un milliard de lectures.',
      'Du local-first avec le navigateur comme source de vérité et sans connexion.',
    ],
    matrix: {
      shape: 'Base de documents hébergée en temps réel avec un cache hors ligne',
      storage: 'Google Cloud',
      online: 'Non',
      browser: 'Oui',
      accounts: 'Firebase Auth, anonyme autorisé',
      hosting: 'Hébergé uniquement',
      price: 'Offre gratuite, puis à l’opération',
      license: 'Service propriétaire ; SDK Apache-2.0',
    },
    keywords: [
      'alternative à firebase local-first',
      'alternative à firestore auto-hébergée',
      'alternative firebase hors ligne',
    ],
  },
  rclone: {
    headline: 'Une alternative à rclone pour donner un code à quelqu’un',
    what: 'Le rsync du stockage cloud : un programme en ligne de commande qui copie, synchronise, déplace et monte des fichiers sur environ soixante-dix backends de stockage, S3 compris. Il gère les limites de bande passante, les sommes de contrôle, les filtres, le chiffrement et bien plus. Quand le travail est de déplacer des arborescences de fichiers entre une machine et un bucket, c’est l’outil standard.',
    overlap:
      'Les deux mettent un fichier dans votre bucket depuis un terminal avec des identifiants sur la machine, et les deux sont open source sous licence MIT.',
    differences: [
      {
        title: 'Un chemin ou un code',
        body: 'Avec rclone, vous nommez la destination et l’autre côté doit la connaître. Avec s3nd, la destination est un code que l’outil a choisi, que quelqu’un peut lire à voix haute, qui expire, et que l’autre côté peut taper n’importe comment.',
      },
      {
        title: 'Tout ou une seule chose',
        body: 'rclone est une boîte à outils pour le stockage. s3nd fait une chose : mettre quelque chose sous un code, le récupérer, le brûler, et vérifier que le bucket est prêt à recevoir des transferts.',
      },
      {
        title: 'Pas seulement une CLI',
        body: 'La CLI s3nd est une fine couche sur une bibliothèque qui tourne aussi dans votre API et derrière des hooks React, donc le même code fonctionne pour les utilisateurs d’une app web.',
      },
    ],
    pickThem: [
      'Synchroniser des répertoires, monter un bucket, des copies en masse.',
      'Des backends qui ne sont pas S3.',
      'Contrôle de bande passante, sommes de contrôle, filtres, et le reste de la boîte à outils.',
    ],
    pickS3nd: [
      'Donner un code à quelqu’un plutôt qu’un chemin.',
      'Expiration, écritures conditionnelles et une commande doctor, avec une seule commande à apprendre.',
      'La même primitive dans une application.',
    ],
    matrix: {
      shape: 'CLI de stockage cloud : copier, synchroniser, monter',
      storage: 'Votre bucket, et soixante-dix autres backends',
      online: 'Non',
      browser: 'Non',
      accounts: 'Identifiants du fournisseur sur chaque machine',
      hosting: 'Aucun, c’est un binaire',
      price: 'Gratuit',
      license: 'MIT',
    },
    keywords: ['alternative simple à rclone', 'rclone vs', 'envoyer un fichier vers s3 avec un code'],
  },
}
