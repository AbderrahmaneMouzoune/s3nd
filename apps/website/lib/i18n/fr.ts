import { docs, packages, repositoryUrl } from '@/lib/site'

import type { Dictionary } from './en'

/** Le site en français. Même forme que `en.ts`, clé pour clé. */
export const fr: Dictionary = {
  site: {
    tagline: 'Envoyez n’importe quoi avec un code, via votre propre bucket.',
    description:
      'Envoyez un fichier, un dossier ou les données d’une application d’une machine à une autre avec un code de huit caractères, via un bucket S3 qui vous appartient. Une CLI, une bibliothèque TypeScript et des hooks React. Sans compte, sans relais, rien à déployer. Compatible AWS S3, Cloudflare R2, MinIO, Scaleway et Wasabi.',
  },

  ui: {
    skipToContent: 'Aller au contenu',
    copy: 'Copier',
    copied: 'Copié',
    copyCommand: 'Copier la commande',
    copyCode: 'Copier le code',
    menu: 'Menu',
    closeMenu: 'Fermer le menu',
    primaryNavigation: 'Principale',
    language: 'Langue',
    github: 'GitHub',
    docs: 'Docs',
    npm: 'npm',
    home: 'Accueil',
    breadcrumb: 'Fil d’Ariane',
    inShort: 'En bref',
    installCli: 'Installer la CLI',
    howItWorks: 'Comment ça marche',
    packages: 'Packages',
    then: 'Ensuite',
    worthNoticing: 'À remarquer',
    sourceOnGithub: 'Le code sur GitHub',
    runIt: 'lancer',
    expectedOutput: 'sortie attendue',
    codeLabel: 'Code',
    theCode: 'Le code',
    normalizedCode: 'Code normalisé',
    codePrinted: 'Le code affiché par s3nd',
    empty: 'vide',
  },

  nav: {
    product: {
      label: 'Produit',
      items: [
        {
          label: 'Comment ça marche',
          description: 'Un objet dans votre bucket, un code dans la main de quelqu’un.',
          href: '/how-it-works',
        },
        {
          label: 'La CLI',
          description: 'put, get, rm, et un doctor qui prouve que le bucket fonctionne.',
          href: '/cli',
        },
        {
          label: 'La bibliothèque',
          description: 'Fichiers, snapshots et le handler de transfert, côté Node.',
          href: '/library',
        },
        {
          label: 'Hooks React',
          description: 'Envoyer, recevoir, et un champ de code qui répare les fautes de frappe.',
          href: '/react',
        },
        {
          label: 'Fournisseurs de stockage',
          description: 'S3, R2, MinIO, Scaleway, Wasabi : seul l’endpoint change.',
          href: '/providers',
        },
        { label: 'Exemples', description: 'Exécutables, dans le dépôt, contre un MinIO local.', href: '/examples' },
        {
          label: 'Déployer une drop box',
          description: 'Un petit WeTransfer sur votre bucket, en un clic sur Vercel.',
          href: '/drop',
        },
      ],
      aside: {
        title: 'Démarrez en une minute',
        body: 'Installez la CLI, pointez-la sur un bucket que vous avez déjà, et donnez un code à quelqu’un.',
        command: 'npm i -g @s3nd/cli',
        link: 'Toutes les commandes',
      },
    },
    useCases: {
      label: 'Cas d’usage',
      files: 'Fichiers',
      appState: 'État d’application',
      all: 'Tous les cas d’usage',
    },
    compare: {
      label: 'Comparer',
      all: 'Toutes les comparaisons',
      lead: 'Parfois, c’est l’autre outil qu’il vous faut. Chaque page le dit franchement.',
    },
    docs: 'Docs',
    github: 'GitHub',
    cta: 'Installer',
  },

  footer: {
    columns: [
      {
        title: 'Produit',
        links: [
          { label: 'Comment ça marche', href: '/how-it-works' },
          { label: 'La CLI', href: '/cli' },
          { label: 'La bibliothèque', href: '/library' },
          { label: 'Hooks React', href: '/react' },
          { label: 'Fournisseurs de stockage', href: '/providers' },
          { label: 'Exemples', href: '/examples' },
          { label: 'Déployer une drop box', href: '/drop' },
        ],
      },
      {
        title: 'Cas d’usage',
        links: [
          { label: 'Un fichier entre deux machines', href: '/use-cases/file-between-machines' },
          { label: 'Une drop box pour votre équipe', href: '/use-cases/team-drop-box' },
          { label: 'Des sauvegardes depuis la CI', href: '/use-cases/ci-backups' },
          { label: 'Migrer une app sur un nouvel appareil', href: '/use-cases/new-device' },
          { label: 'Sauvegarde continue', href: '/use-cases/continuous-backup' },
          { label: 'Chiffré de bout en bout', href: '/use-cases/encrypted-sync' },
        ],
      },
      {
        title: 'Comparer',
        links: [
          { label: 'Toutes les comparaisons', href: '/alternatives' },
          { label: 'vs croc', href: '/alternatives/croc' },
          { label: 'vs Magic Wormhole', href: '/alternatives/magic-wormhole' },
          { label: 'vs WeTransfer', href: '/alternatives/wetransfer' },
          { label: 'vs transfer.sh', href: '/alternatives/transfer-sh' },
          { label: 'vs rclone', href: '/alternatives/rclone' },
        ],
      },
      {
        title: 'Ressources',
        links: [
          { label: 'Documentation', href: docs(), external: true },
          { label: 'Sans serveur', href: docs('/no-server'), external: true },
          { label: 'Mettre en place un serveur', href: docs('/server'), external: true },
          { label: 'Le protocole', href: docs('/protocol'), external: true },
          { label: 'GitHub', href: repositoryUrl, external: true },
          { label: 'npm', href: packages.cli.npm, external: true },
        ],
      },
    ],
    legal: 'Pas de service hébergé. Pas de télémétrie. Pas de compte.',
    madeBy: 'MIT ©',
  },

  cta: {
    title: 'Déposez un fichier. Donnez le code.',
    body: 'Pointez-le sur le bucket que vous payez déjà. Rien à déployer, aucune inscription, personne au milieu.',
    primary: 'Installer la CLI',
    secondary: 'L’intégrer à votre app',
    ghost: 'GitHub',
    commands: ['npm install -g @s3nd/cli', 's3nd init --provider r2 --bucket drop', 's3nd put ./anything.zip'],
  },

  notFound: {
    title: 'Introuvable',
    heading: 'Code inconnu ou expiré.',
    body: 'Rien n’est stocké à cette adresse. La page a peut-être bougé, ou n’a jamais existé.',
    back: 'Retour à l’accueil',
    docs: 'Documentation',
  },

  home: {
    eyebrow: 'Votre bucket · Un code · Pas de compte',
    title: 'Envoyez n’importe quoi avec un code.',
    lead: 's3nd dépose un fichier dans un bucket S3 qui vous appartient et vous remet huit caractères. Quiconque a le code le récupère, depuis n’importe quelle machine, jusqu’à son expiration. Depuis un terminal, depuis votre propre app, ou depuis curl.',
    primary: 'Installer la CLI',
    secondary: 'Comment ça marche',
    ghost: 'GitHub',
    commands: ['npm i -g @s3nd/cli', 's3nd put ./anything.zip'],
    ticker: [
      's3nd.sh',
      'Pas de compte',
      'Pas de relais',
      'Rien à déployer',
      'Votre bucket',
      'AWS S3',
      'Cloudflare R2',
      'MinIO',
      'Scaleway',
      'Wasabi',
      'Expire tout seul',
      'Codes de 40 bits',
      'CLI · Bibliothèque · React',
      'MIT',
    ],
    how: {
      eyebrow: 'Put. Code. Get.',
      title: 'Tout le produit tient en trois commandes.',
      lead: 'Les octets vont d’une machine à votre bucket, puis de votre bucket à l’autre machine. Rien ne transite par le serveur de quelqu’un d’autre, et personne ne s’inscrit nulle part.',
      steps: [
        {
          stamp: 'put',
          title: 'Déposez-le dans votre bucket.',
          body: 'Un fichier, un dossier sous forme d’archive, tout ce qui arrive sur stdin. Un seul PutObject dans un bucket à vous, sous un code neuf, avec une expiration inscrite sur l’objet. Le code est affiché et rien d’autre, donc ça se compose.',
          href: docs('/cli'),
          label: 'La référence de la CLI',
        },
        {
          stamp: 'code',
          title: 'Dictez-le au téléphone.',
          body: 'Huit caractères, quarante bits, ni I, ni L, ni O, ni U. Écrivez-le sur un post-it, tapez-le dans la mauvaise casse avec un tiret au milieu : il se résout quand même. Le serveur le choisit et le réserve avec une écriture conditionnelle.',
          href: docs('/sync-codes'),
          label: 'Les codes de synchronisation',
        },
        {
          stamp: 'get',
          title: 'Récupérez-le n’importe où.',
          body: 'Toute machine qui a le code et l’accès au bucket, ou un jeton pour votre serveur, récupère le fichier. Jusqu’à l’expiration du transfert, ou jusqu’à ce que vous le brûliez. L’autre machine n’avait pas besoin d’être allumée au moment de l’envoi.',
          href: docs('/no-server'),
          label: 'Sans serveur',
        },
      ],
    },
    waysIn: {
      eyebrow: 'Trois façons d’envoyer',
      title: 'Un terminal, votre propre app, ou n’importe quoi qui parle HTTP.',
      lead: 'Une seule primitive sous les trois. Le package côté serveur détient les clés ; tout ce qui tourne dans un navigateur ne dépend que de fetch.',
      terminal: {
        title: 'Depuis un terminal',
        body: 'Directement vers le bucket avec les identifiants de cette machine, rien à déployer. Ou via votre serveur avec un jeton et `--remote`. Une commande doctor prouve que la configuration fonctionne.',
        link: 'Toutes les commandes',
      },
      app: {
        title: 'Dans votre app',
        body: 'Un seul fichier de route sert le protocole à quatre routes sur votre domaine, avec votre authentification. Les hooks React envoient un fichier, relisent un code, et réparent ce que l’utilisateur a tapé.',
        libraryLink: 'La bibliothèque',
        hooksLink: 'Les hooks',
      },
      http: {
        title: 'Tout ce qui parle HTTP',
        body: 'Le protocole, ce sont quatre routes et un format d’erreur, écrits noir sur blanc. curl fonctionne, un client Go fonctionne, et un serveur Rails fonctionne avec tous les clients s3nd.',
        link: 'La spec du protocole',
      },
    },
    bucket: {
      eyebrow: 'Votre bucket',
      title: 'Personne au milieu.',
      lead: 'Tous les autres outils du domaine font tourner un relais, hébergent vos fichiers, ou demandent un compte. s3nd est une fine couche au-dessus du stockage objet que vous payez déjà.',
      facts: [
        {
          label: 'Pas de relais',
          value:
            'De la machine au bucket, du bucket à la machine. La durabilité de votre fournisseur, sa facture, et sur R2 aucun frais de sortie.',
        },
        {
          label: 'Pas de compte',
          value:
            'Un code, c’est toute la poignée de main. Sur votre propre serveur, un jeton par personne est le maximum d’identité que s3nd demandera jamais.',
        },
        {
          label: 'Rien à déployer',
          value:
            'La CLI parle directement au bucket. Un serveur n’entre en scène que lorsqu’un navigateur l’exige, et c’est un seul fichier de route.',
        },
        {
          label: 'Expire tout seul',
          value:
            'Chaque transfert porte une expiration, vérifiée à chaque lecture. Une règle de cycle de vie supprime l’objet, et s3nd doctor vérifie que vous en avez une.',
        },
      ],
    },
    codes: {
      eyebrow: 'Codes de synchronisation',
      title: 'Un code que l’on peut dicter au téléphone.',
      lead: 'Toute l’expérience d’un transfert, c’est quelqu’un qui lit un code sur un écran et le tape sur un autre. Tout dans le code découle de là.',
      paragraphs: [
        'Par défaut, huit caractères en base32 Crockford : ni `I`, ni `L`, ni `O`, ni `U`, pour qu’un code survive au papier, au clavier d’un téléphone et à un appel. La génération et la normalisation vivent sur le même objet, donc les deux côtés ne peuvent jamais être en désaccord sur l’alphabet.',
        'Quatre chiffres pour une app pensée pour le téléphone, douze caractères alphanumériques pour un dépôt de longue durée : les deux moitiés sont configurables, et `entropyBits` vous dit ce que le code vaut face à une attaque par devinette, pour que la limitation de débit fasse le reste.',
        'Un code est un jeton au porteur. Donnez-lui une expiration courte, limitez le débit de la route de lecture, et pour les données sensibles, chiffrez avant que quoi que ce soit n’atteigne le bucket.',
      ],
      links: [
        { label: 'Codes de synchronisation', href: docs('/sync-codes') },
        { label: 'Configurer les codes', href: docs('/code-configuration') },
      ],
    },
    appState: {
      eyebrow: 'Et aussi',
      title: 'Pas seulement des fichiers. Tout l’état d’une app.',
      lead: 'Un transfert peut être des données structurées autant que des octets. C’est ainsi qu’une app local-first sans comptes emporte sa base de données sur le nouveau téléphone de l’utilisateur : le navigateur exporte IndexedDB, le serveur en fait un snapshot, l’autre téléphone tape le code.',
      cards: [
        {
          title: 'Une enveloppe qui se décrit elle-même',
          body: 'Le nom de votre app, votre version de schéma, l’appareil, une expiration, puis les données, gzippées. Une restauration refuse un snapshot issu d’une version plus récente au lieu de le mal lire, et montre quand et où il a été fait avant de remplacer quoi que ce soit.',
        },
        {
          title: 'Deux appareils, une sauvegarde, aucune perte silencieuse',
          body: 'Passez l’ETag lu en dernier comme `ifMatch`, et un appareil qui écrit après un autre reçoit une erreur au lieu d’écraser son travail.',
        },
      ],
      links: {
        newDevice: 'Migrer une app sur un nouvel appareil',
        hooks: 'Les hooks React',
        snapshots: 'Les snapshots',
      },
    },
    useCases: {
      eyebrow: 'Cas d’usage',
      title: 'Ce que les gens déplacent avec.',
      files: 'Fichiers',
      appState: 'État d’application',
    },
    compare: {
      eyebrow: 'Comparé',
      title: 'Pourquoi pas croc, WeTransfer ou rclone ?',
      lead: 'Parfois, ce sont eux la bonne réponse. Les pages de comparaison le disent, outil par outil, dans les termes de l’autre outil.',
      all: 'Toutes les comparaisons',
      vs: 'vs',
    },
    faq: { eyebrow: 'Questions', title: 'Celles qui reviennent.' },
  },

  howItWorks: {
    metaTitle: 'Comment ça marche',
    metaDescription:
      'Un transfert est un objet dans votre bucket sous un code de huit caractères, avec une expiration vérifiée à chaque lecture. Fichiers, snapshots, le protocole à quatre routes, les écritures conditionnelles, et pourquoi les packages sont découpés ainsi.',
    keywords: [
      'comment fonctionne s3nd',
      'transfert de fichier code bucket s3',
      'protocole de transfert code de synchronisation',
      'snapshot indexeddb s3',
    ],
    crumb: 'Comment ça marche',
    eyebrow: 'Architecture',
    title: 'Un objet dans votre bucket, un code dans la main de quelqu’un.',
    lead: 's3nd est délibérément petit. Cette page en fait le tour complet : ce qu’est un transfert, ce qu’est un code, le protocole entre un serveur et ses clients, et pourquoi les packages sont découpés ainsi.',
    primary: 'Installer la CLI',
    secondary: 'La spec du protocole',
    transfer: {
      eyebrow: 'Un transfert',
      title: 'Un objet, un code, une expiration.',
      lead: 'Un fichier est stocké tel quel, avec le nom, le type de contenu et l’expiration dans les métadonnées de l’objet. Des données structurées sont stockées comme un snapshot : une enveloppe qui se décrit elle-même, gzippée. Les deux vivent sous le code.',
      fileTitle: 'un fichier, tel qu’il arrive dans le bucket',
      snapshotTitle: 'un snapshot, tel qu’il arrive dans le bucket',
      cards: [
        {
          stamp: 'expiration à la lecture',
          body: 'Un transfert expiré n’est jamais remis, même si l’objet est encore dans le bucket. Un code expiré répond le même `NOT_FOUND` qu’un code qui n’a jamais existé, donc personne ne peut sonder quels codes ont servi.',
        },
        {
          stamp: 'règle de cycle de vie',
          body: 'Supprimer l’objet est le travail de votre bucket, via une règle de cycle de vie sur le préfixe. `s3nd doctor` vérifie que vous en avez une, parce qu’un bucket qui se remplit discrètement de transferts expirés est la façon la plus courante de se tromper.',
        },
        {
          stamp: 'versions de schéma',
          body: 'Un snapshot porte votre version de schéma. Passez `maxVersion` à la lecture et un snapshot issu d’une version plus récente lève `SNAPSHOT_TOO_NEW` au lieu d’atterrir dans une app qui va le mal lire.',
        },
      ],
      links: [
        { label: 'Les snapshots', href: docs('/snapshots') },
        { label: 'Quelle taille peut faire un transfert', href: docs('/limits') },
      ],
    },
    codes: {
      eyebrow: 'Codes de synchronisation',
      title: 'Quarante bits qui survivent à un appel téléphonique.',
      lead: 'Un code, c’est toute l’expérience utilisateur d’un transfert. Il apparaît sur un écran, quelqu’un le tape sur un autre, et tout dans le code découle de là.',
      cards: [
        {
          title: 'Base32 Crockford',
          body: 'Ni `I`, ni `L`, ni `O`, ni `U`. Les trois premiers sont ceux que l’on confond ; retirer le quatrième évite qu’un code aléatoire n’épelle quelque chose de malheureux.',
        },
        {
          title: 'Normalisé au retour',
          body: 'Séparateurs retirés, casse repliée, et `O` lu comme zéro uniquement quand il n’y a aucune lettre O avec laquelle le confondre. La réparation se fait dans le navigateur, avant toute requête.',
        },
        {
          title: 'Réservé par une écriture conditionnelle',
          body: 'Le serveur choisit le code et écrit avec `ifAbsent`, donc une collision échoue bruyamment et réessaie avec un code neuf au lieu d’écraser le transfert d’un inconnu.',
        },
      ],
      links: [
        { label: 'Codes de synchronisation', href: docs('/sync-codes') },
        { label: 'Longueur, alphabet, et ce que chacun coûte', href: docs('/code-configuration') },
      ],
    },
    protocol: {
      eyebrow: 'Le protocole',
      title: 'Quatre routes, un format d’erreur. Écrits noir sur blanc.',
      lead: 'Un navigateur ne peut pas détenir vos identifiants S3, donc dès qu’il participe, un serveur se place au milieu. La forme de ce milieu est un protocole, pas ce que le handler fait par hasard.',
      routesTitle: 'relatives à l’endroit où vous l’avez monté',
      clientTitle: 'le client, dans un navigateur',
      paragraphs: [
        'Un client fonctionne avec n’importe quel serveur qui répond à ces routes, pas seulement avec `createTransferHandler()`. Un serveur en Go ou en Rails fonctionne avec tous les clients s3nd. Et la CLI pointée sur `--remote` ne peut pas savoir à qui elle parle, ce qui est exactement pourquoi `s3nd put` fonctionne contre votre propre déploiement.',
        'Ce que vous envoyez décide de ce que contient un transfert : un corps JSON est un snapshot, tout autre type de contenu est un fichier avec son nom dans `X-S3nd-Filename`. Les clients lèvent une `TransferError` qui porte le code d’erreur ; branchez sur le code, jamais sur le message.',
      ],
      link: 'Le protocole de transfert, route par route',
    },
    writers: {
      eyebrow: 'Deux écrivains',
      title: 'Quand deux machines écrivent, « le dernier gagne » est une perte de données.',
      lead: 'Un transfert unique a un seul écrivain. Une sauvegarde par utilisateur en a deux, et le comportement par défaut de S3 garde silencieusement celui qui est arrivé en dernier.',
      body: 'Les deux options sont de simples en-têtes conditionnels S3. `ifAbsent` est la façon de réserver un code neuf ; `ifMatch` est la façon dont un second appareil apprend qu’il a perdu la course. Elles fonctionnent chez tous les fournisseurs qui les implémentent, et l’exemple Node est là pour vérifier que le vôtre en fait partie.',
      link: 'Deux appareils, un snapshot',
    },
    packages: {
      eyebrow: 'Les packages',
      title: 'Une seule contrainte décide du découpage.',
      lead: 'Un navigateur ne doit jamais se retrouver avec un client de stockage dans son arbre de dépendances. Le package protocol est ce que les deux moitiés partagent, et c’est la seule raison de son existence.',
      items: [
        {
          name: packages.cli.name,
          role: 'Le binaire',
          deps: 's3nd',
          body: 'put, get, rm, doctor, init et config. Une seule implémentation, le client du protocole, branchée soit sur fetch, soit directement sur le handler dans le même processus.',
        },
        {
          name: packages.s3nd.name,
          role: 'La primitive',
          deps: 'aws-sdk, protocol',
          body: 'Fichiers, snapshots, écritures conditionnelles et le handler de transfert. Le seul package qui détient des identifiants, donc le seul qui tourne sur un serveur.',
        },
        {
          name: packages.protocol.name,
          role: 'Le contrat',
          deps: 'nanoid',
          body: 'Le format sur le fil, un client basé sur fetch, et les codes de synchronisation. Rien ici n’importe de client de stockage, et c’est ce qui permet à un navigateur de le partager.',
        },
        {
          name: packages.react.name,
          role: 'Les hooks',
          deps: 'protocol, react (peer)',
          body: 'Envoyer, recevoir, et un champ de code. Dépend du protocole et jamais de S3, donc aucun chemin de votre bundle n’atteint le SDK AWS.',
        },
      ],
      facts: [
        { label: 'Runtime serveur', value: 'Node 20 ou plus, ce que le SDK AWS v3 exige' },
        { label: 'Handler', value: 'Request en entrée, Response en sortie : Next.js, Hono, Bun.serve, Deno, workers' },
        { label: 'Packages navigateur', value: 'fetch et rien d’autre : navigateur, worker, React Native, Deno' },
        { label: 'Tests', value: 'Hors ligne, contre un S3 en mémoire qui honore les en-têtes conditionnels' },
      ],
    },
  },

  cli: {
    metaTitle: 'La CLI',
    metaDescription:
      'La ligne de commande s3nd : déplacer un fichier entre machines avec un code, vérifier qu’un bucket est réellement prêt à recevoir des transferts, et garder les réglages dans un fichier versionnable plutôt que dans l’historique du shell. Directement vers S3 ou via votre propre serveur.',
    keywords: [
      'envoyer un fichier entre ordinateurs cli',
      'transfert de fichier s3 ligne de commande',
      'transfert de fichier par code cli',
      's3nd cli',
    ],
    crumb: 'La CLI',
    title: 'Un fichier entre deux machines, avec un code.',
    lead: 'Déplacez un fichier avec put et get, vérifiez qu’un bucket est réellement prêt à recevoir des transferts avec doctor, et gardez les réglages dans un fichier que vous pouvez versionner. Directement vers S3 sans rien déployer, ou via votre propre serveur avec un jeton.',
    primary: 'Référence de la CLI',
    secondary: 'Sans serveur',
    ghost: 'npm',
    initDoctor: {
      eyebrow: 'init et doctor',
      title: 'La commande à lancer en premier.',
      lead: 'Une mauvaise configuration S3 échoue tard et vaguement. doctor effectue les opérations dont s3nd a réellement besoin et rapporte ce qui s’est passé, plutôt que de lire votre policy et de raisonner dessus. L’objet sonde est supprimé avant de rendre la main.',
      initTitle: 'un point de départ par fournisseur',
      doctorTitle: 'et la vérification qui justifie la commande',
      body: 'Cette dernière vérification est celle que personne ne découvre avant l’arrivée d’une facture. `expiresIn` empêche un transfert d’être remis ; seule une règle de cycle de vie supprime l’objet. Pointé sur un serveur, `doctor` vérifie la seule chose qui compte là-bas, un vrai aller-retour, et sort avec un code non nul en cas d’échec, donc il sert de smoke test de déploiement.',
    },
    config: {
      eyebrow: 'Configuration',
      title: 'Des réglages versionnables, des clés qui ne le sont pas.',
      lead: '${VAR} est lu depuis l’environnement, et envFile nomme un fichier à charger d’abord sans écraser ce que le shell a déjà défini. Les profils tiennent plusieurs configurations dans un seul fichier. Un flag bat une variable, qui bat le fichier.',
      body: 'Le fichier est cherché depuis le répertoire courant vers le haut, puis dans `~/.config/s3nd/config.json`. `s3nd config` masque l’identifiant de clé et n’affiche jamais le secret ni le jeton. L’environnement seul fonctionne aussi, ce qui est la forme que veut la CI.',
      link: 'Des sauvegardes depuis la CI',
    },
    remote: {
      eyebrow: 'Contre votre propre serveur',
      title: 'Une implémentation, deux câblages.',
      lead: 'Chaque commande accepte --remote, qui la pointe sur un déploiement du protocole de transfert au lieu de S3. La CLI a exactement une implémentation, le client du protocole, branchée soit sur fetch, soit directement sur le handler dans le même processus. Les deux modes ne peuvent pas diverger.',
      paragraphs: [
        'Conséquence pratique : la machine d’où vous lancez ça a besoin d’un jeton pour votre propre déploiement plutôt que d’identifiants S3. C’est la forme qui convient à une équipe, où donner les clés du bucket à chaque laptop ne convient pas.',
        '`s3nd init --provider remote` écrit le point de départ correspondant, et `doctor --remote` prouve que le serveur répond avant que quiconque n’en dépende.',
      ],
      link: 'Mettre en place un serveur',
    },
    reference: {
      eyebrow: 'Référence',
      title: 'Six commandes, une douzaine d’options.',
      commandsTitle: 'Commandes',
      optionsTitle: 'Options',
      commands: [
        { term: 'put <file>', body: 'Stocke un fichier et affiche le code à transmettre. "-" lit stdin' },
        { term: 'get <code>', body: 'Récupère ce qu’un code désigne, vers le nom de fichier stocké, -o, ou stdout' },
        { term: 'rm <code>', body: 'Brûle un code' },
        {
          term: 'doctor',
          body: 'Vérifie que cette configuration peut réellement stocker des transferts. Code de sortie non nul quand une vérification échoue',
        },
        { term: 'init', body: 'Écrit un s3nd.config.json de départ pour aws, r2, minio, scaleway, wasabi ou remote' },
        { term: 'config', body: 'Affiche la configuration résolue, et d’où vient chaque valeur' },
      ],
      options: [
        { term: '-c, --config', body: 'Fichier de configuration à lire' },
        { term: '-p, --profile', body: 'Profil à utiliser dedans' },
        { term: '--env-file', body: 'Lit d’abord des paires KEY=value depuis ce fichier' },
        {
          term: '--bucket, --prefix, --region, --endpoint',
          body: 'Réglages du bucket, prioritaires sur le fichier et l’environnement',
        },
        { term: '--expires-in', body: '3600, 30m, 24h, 7d, ou never' },
        { term: '--remote, --token', body: 'Parle à un serveur s3nd plutôt qu’à S3 directement' },
        { term: '--name', body: 'Nom de fichier sous lequel stocker le transfert' },
        { term: '--json', body: 'Sortie lisible par une machine, pour les scripts et pour doctor en CI' },
      ],
      body: 'Sinon, la configuration vient des mêmes variables d’environnement que la bibliothèque : `S3ND_BUCKET`, `S3ND_ENDPOINT`, `S3ND_REMOTE`, `S3ND_TOKEN` et les identifiants AWS habituels. Node 20 ou plus ; l’analyse des arguments est le `parseArgs` de `node:util`, donc il n’y a rien d’autre à installer.',
    },
  },

  library: {
    metaTitle: 'La bibliothèque',
    metaDescription:
      'Le package Node s3nd : une API de fichiers sur votre bucket, un handler de transfert qui tient dans un fichier de route, des snapshots avec une enveloppe auto-descriptive, des écritures conditionnelles et des codes d’erreur stables. Compatible AWS S3, Cloudflare R2, MinIO, Scaleway et Wasabi.',
    keywords: [
      's3nd npm',
      'bibliothèque upload s3 typescript',
      'route de dépôt de fichier next.js',
      'handler de transfert s3 node',
    ],
    crumb: 'La bibliothèque',
    title: 'Des fichiers et des snapshots, dans votre bucket.',
    lead: 'Une petite API de fichiers sur du stockage objet, un handler de transfert qui tient dans un fichier de route, et des snapshots pour l’état structuré. Le seul package qui détient des identifiants, donc le seul qui tourne sur votre serveur.',
    primary: 'Mettre en place un serveur',
    secondary: 'Référence de l’API',
    ghost: 'npm',
    files: {
      eyebrow: 'L’API de fichiers',
      title: 'Cinq verbes sur votre bucket.',
      lead: 'Chaînes, buffers, Blobs et streams sont tous acceptés. Les clés font l’aller-retour : ce que upload() renvoie est ce que vous redonnez à get(), getUrl() et delete(). Le préfixe configuré est un espace de noms interne.',
      paragraphs: [
        '`getUrl()` renvoie une URL présignée par défaut, ou une URL non signée quand un `publicUrl` est configuré, avec une option `download` qui fixe le nom de fichier que le navigateur enregistre.',
        'Un stream a besoin d’un `contentLength`, parce qu’un PutObject unique ne peut pas utiliser l’encodage par morceaux. Définissez `maxSize` et un corps trop gros est refusé avant que quoi que ce soit n’atteigne le réseau.',
        'Tout ce que le package n’enveloppe pas est à une commande de distance via `store.client`, le `S3Client` brut.',
      ],
      link: 'La référence de l’API',
    },
    handler: {
      eyebrow: 'Le handler',
      title: 'Une drop box sur votre domaine, en un fichier de route.',
      lead: 'createTransferHandler() sert le protocole à quatre routes : créer, lire, télécharger, brûler. Il prend une Request et renvoie une Response, donc c’est une route Next, une route Hono, Bun.serve ou un worker, sans adaptateur.',
      titles: { next: 'Next.js App Router', hono: 'Hono', bun: 'Bun.serve' },
      body: "Chaque route est publique tant que vous ne passez pas `authorize` : très bien pour une drop box personnelle derrière un proxy, pas pour le reste. Renvoyez `false` pour un simple 401 ou une `Response` pour répondre à votre façon. Avec `raw: 'redirect'`, un téléchargement répond 302 avec une URL présignée, donc les octets ne transitent jamais deux fois par votre serveur.",
      links: {
        server: 'Mettre en place un serveur',
        protocol: 'Le protocole de transfert',
        teamDropBox: 'Une drop box pour votre équipe',
      },
    },
    snapshots: {
      eyebrow: 'Snapshots',
      title: 'De l’état structuré, avec une restauration sûre plutôt qu’optimiste.',
      lead: 'putSnapshot() enveloppe votre valeur avec le nom de votre app, la version de schéma, l’appareil et l’expiration, puis la gzippe. getSnapshot() relit l’enveloppe et refuse ce qu’il doit refuser.',
      cards: [
        {
          title: 'null quand c’est expiré',
          body: 'Un snapshot expiré n’est jamais remis, même si l’objet est encore dans le bucket. L’appareil qui reçoit n’a pas à distinguer « n’a jamais existé » de « expiré ».',
        },
        {
          title: 'SNAPSHOT_TOO_NEW',
          body: 'Passez `maxVersion` et un snapshot écrit par une version plus récente lève une erreur au lieu d’atterrir dans une app qui va le mal lire.',
        },
      ],
      link: 'Les snapshots, en détail',
    },
    conditional: {
      eyebrow: 'Écritures conditionnelles',
      title: 'Aucun écrasement silencieux, chez tout fournisseur qui les implémente.',
      lead: 'Les deux options sont de simples en-têtes conditionnels S3, et les deux échouent avant que quoi que ce soit ne soit remplacé.',
      paragraphs: [
        '`ifAbsent` est la façon de réserver un code fraîchement généré sans risquer d’en piétiner un déjà en usage. Le handler réessaie avec un code neuf lors de la rare collision.',
        '`ifMatch` est la façon dont un second appareil apprend qu’il a perdu la course. Il reçoit `PRECONDITION_FAILED`, relit, et fusionne, ce qui est du code applicatif parce que seule votre app sait ce qu’une fusion veut dire.',
      ],
      link: 'Deux appareils, un snapshot',
    },
    errors: {
      eyebrow: 'Erreurs',
      title: 'Tout lève une S3ndError avec un code stable.',
      lead: 'Les échecs détectables localement, un mauvais code, un corps trop gros, des données non sérialisables, sont levés avant que quoi que ce soit n’atteigne le réseau.',
      codes: [
        { term: 'INVALID_SYNC_CODE', body: 'Vide, ou des caractères hors de l’alphabet' },
        { term: 'FILE_TOO_LARGE', body: 'Corps au-dessus du maxSize configuré' },
        { term: 'PRECONDITION_FAILED', body: 'Une écriture ifMatch ou ifAbsent a perdu la course' },
        { term: 'SNAPSHOT_TOO_NEW', body: 'Version de schéma au-dessus du maxVersion donné' },
        { term: 'INVALID_KEY / INVALID_BODY', body: 'Une clé ou un type de corps que le bucket ne peut pas prendre' },
        { term: 'UPLOAD_FAILED / GET_FAILED / …', body: 'S3 a rejeté la requête ; l’erreur d’origine est dans cause' },
      ],
      link: 'Tous les codes d’erreur',
    },
    config: {
      eyebrow: 'Configuration',
      title: 'Chaque option, et la variable d’environnement derrière.',
      lead: 'createBucket() sans argument fonctionne dès que S3_BUCKET et les variables AWS habituelles sont définies. Avec un endpoint, la région vaut auto par défaut et l’adressage path-style s’active, ce qu’attendent R2, MinIO et Scaleway.',
      paragraphs: [
        'Via votre serveur, un transfert est borné par la limite de requête de votre runtime : 4,5 Mo sur les fonctions Vercel, 6 Mo sur Lambda. Définissez `maxSize` juste en dessous et un upload trop gros coûte une comparaison au lieu d’une requête tronquée.',
        '`createBucket()` ne coûte rien : le client sous-jacent est construit à la première requête, donc l’appeler au niveau du module est très bien.',
      ],
      links: { configuration: 'Configuration', limits: 'Limites', providers: 'Fournisseurs' },
    },
  },

  react: {
    metaTitle: 'Hooks React',
    metaDescription:
      '@s3nd/react : des hooks pour envoyer un fichier ou un snapshot, relire un code, et un champ de code de synchronisation qui répare ce que l’utilisateur a tapé. Ne voit jamais un identifiant de stockage, n’embarque jamais le SDK AWS dans votre bundle.',
    keywords: [
      'upload de fichier react par code',
      's3nd react',
      'hook react transfert par code',
      'champ de code à usage unique react',
    ],
    crumb: 'Hooks React',
    title: 'Des hooks qui ne voient jamais un identifiant.',
    lead: 'Envoyez un fichier ou un snapshot, relisez un code, et un champ qui répare le code au fil de la frappe. Tout son arbre de dépendances, c’est le package protocol et nanoid, avec React en peer. Le SDK AWS reste sur votre serveur.',
    primary: 'Guide React',
    secondary: 'npm',
    providerTitle: 'pointez-le sur les routes de transfert',
    sending: {
      eyebrow: 'Envoyer',
      title: 'Un champ de fichier, un code.',
      lead: 'sendFile() prend un File directement depuis un input, en gardant son nom et son type. Les échecs atterrissent dans error au lieu de rejeter, parce qu’un gestionnaire d’événement ne devrait pas avoir besoin d’un try/catch.',
      paragraphs: [
        'Le hook poste vers les routes de transfert de votre serveur, qui détient les identifiants du bucket. Le navigateur ne voit jamais une clé, et votre fonction `authorize` décide qui peut envoyer.',
        '`transfer` porte le code, le type, la taille et l’expiration. Affichez le code groupé par quatre ; le côté récepteur l’accepte avec ou sans les espaces.',
      ],
      link: 'Une drop box pour votre équipe',
    },
    receiving: {
      eyebrow: 'Recevoir',
      title: 'Chercher, montrer, puis télécharger.',
      lead: 'load() récupère ce qu’un code contient sans déplacer les octets, donc l’utilisateur voit un nom de fichier et une taille avant tout téléchargement. loadBytes() rapatrie le fichier.',
    },
    input: {
      eyebrow: 'Le champ de code',
      title: 'Ce que l’utilisateur a tapé reste intact.',
      lead: 'useSyncCodeInput fait la réparation dans le navigateur, avant toute requête. Réécrire le champ sous le curseur est la chose qui rend ces champs pénibles, donc il ne le fait jamais.',
      paragraphs: [
        '`value` est mot pour mot. `code` est la forme canonique à soumettre, `null` tant que ce qui est tapé ne peut pas en être une. `isComplete` est le moment d’activer le bouton.',
        '`inputProps` porte les indications de clavier et de remplissage automatique qu’un code à usage unique veut : `autoComplete="one-time-code"`, majuscules, pas d’autocorrection, et un clavier numérique quand l’alphabet est fait de chiffres.',
        'Passez la même forme que celle configurée sur votre serveur, `{ length: 4, alphabet }`, et les deux moitiés suivent.',
      ],
    },
    appState: {
      eyebrow: 'État d’application',
      title: 'Les mêmes hooks transportent un snapshot.',
      lead: 'L’état structuré passe par send() comme un snapshot, et revient en ligne dans data. Charger et appliquer sont délibérément séparés : seul votre code connaît ses object stores, et l’utilisateur doit voir ce qui va remplacer ses données.',
      body: 'L’exemple IndexedDB du dépôt contient une paire export/import complète contre un vrai object store, et la page de cas d’usage déroule tout le flux.',
      links: { newDevice: 'Migrer une app sur un nouvel appareil', examples: 'Les exemples' },
    },
    guarantees: {
      eyebrow: 'Garanties',
      title: 'Un utilisateur qui martèle un bouton obtient une seule réponse.',
      lead: 'Chaque appel annule le précédent, une réponse tardive d’un appel remplacé est ignorée plutôt que publiée, et rien n’est écrit après le démontage.',
      cards: [
        {
          title: 'Hooks client, prêts pour l’App Router',
          body: "Chaque export est un hook client et le build porte `'use client'`, donc ça s’insère directement dans l’App Router de Next.js. React 18 ou plus.",
        },
        {
          title: 'Jetons et clients personnalisés',
          body: 'Passez `headers` au provider pour un jeton, ou `client` pour apporter le vôtre, ce qui est aussi la façon de le piloter en test sans aucun réseau.',
        },
        {
          title: 'Un statut que vous pouvez afficher',
          body: '`status` vaut idle, pending, success ou error, et `notFound` couvre à la fois un code inconnu et un code expiré, comme le protocole.',
        },
      ],
      hooks: [
        { term: 'useSendTransfer()', body: 'send, sendFile, transfer, status, isPending, error, reset' },
        {
          term: 'useReceiveTransfer()',
          body: 'load, loadBytes, burn, transfer, data, notFound, status, isPending, error, reset',
        },
        { term: 'useSyncCodeInput()', body: 'value, setValue, code, isComplete, error, reset, inputProps' },
        { term: 'useTransferClient()', body: 'le client sous-jacent, pour tout ce que les hooks ne couvrent pas' },
      ],
    },
  },

  examples: {
    metaTitle: 'Exemples',
    metaDescription:
      'Des exemples s3nd exécutables : une app de notes Next.js qui déplace son IndexedDB entre navigateurs avec un code, et un script Node qui fait l’aller-retour d’un snapshot et prouve les écritures conditionnelles. Plus les guides pas à pas de la documentation.',
    keywords: ['exemple s3nd', 'exemple synchronisation indexeddb nextjs', 'exemple snapshot s3 node'],
    crumb: 'Exemples',
    eyebrow: 'Exemples',
    title: 'Exécutables, dans le dépôt.',
    lead: 'Deux exemples à cloner et lancer, et les guides pas à pas de la documentation. Les deux exemples pointent sur un MinIO local par défaut, donc le vrai chemin de code tourne sur votre laptop sans inscription nulle part.',
    primary: 'Parcourir les exemples',
    secondary: 'GitHub',
    minioTitle: 'un bucket sur votre laptop',
    guides: {
      eyebrow: 'Guides',
      title: 'Des exemples pas à pas dans la documentation.',
      lead: 'Chaque guide se copie-colle de bout en bout : le store, les routes, la moitié cliente, et ce qui casse si vous sautez une étape.',
    },
    tryIt: {
      eyebrow: 'Essayez en une minute',
      title: 'Sans rien cloner.',
      steps: [
        'Lancez MinIO avec la commande ci-dessus et créez un bucket.',
        'Écrivez une configuration de départ et vérifiez-la.',
        'Déplacez un fichier, et récupérez-le avec un code tapé n’importe comment.',
      ],
    },
  },

  useCases: {
    metaTitle: 'Cas d’usage',
    metaDescription:
      'Ce que les gens déplacent avec s3nd : un fichier entre deux machines, une drop box pour une équipe, des sauvegardes depuis la CI, et une app local-first emportée sur un nouvel appareil, sauvegardée en continu, ou chiffrée de bout en bout.',
    keywords: [
      'cas d’usage transfert de fichiers',
      'dépôt de fichiers auto-hébergé',
      'cas d’usage synchronisation local-first',
    ],
    crumb: 'Cas d’usage',
    eyebrow: 'Cas d’usage',
    title: 'Une primitive, sept formes.',
    lead: 'Un fichier entre deux machines est le cas simple. Le même put, code, get couvre une équipe, un workflow, et une application qui emporte son propre état sur le prochain appareil de l’utilisateur.',
    primary: 'Installer la CLI',
    files: {
      eyebrow: 'Fichiers',
      title: 'Machines, personnes, pipelines.',
      lead: 'La CLI directement vers le bucket quand chaque participant est une machine que vous contrôlez, et une route sur votre serveur quand ce n’est pas le cas.',
    },
    appState: {
      eyebrow: 'État d’application',
      title: 'Une app local-first, sur leur autre appareil.',
      lead: 'Le navigateur détient les données, votre serveur détient les clés, et votre bucket détient un snapshot aussi longtemps que nécessaire. Aucun compte requis.',
    },
    detail: {
      eyebrow: 'Cas d’usage',
      metaSuffix: 'Comment le construire avec s3nd, à quoi faire attention, et le guide complet.',
      situation: {
        eyebrow: 'La situation',
        title: 'Ce qui se passe vraiment.',
        problem: 'Le problème',
        approach: 'Ce que s3nd y fait',
      },
      watch: { eyebrow: 'À surveiller', title: 'Les choses faciles à rater.' },
      related: { eyebrow: 'Voir aussi', title: 'D’autres formes de la même primitive.' },
    },
  },

  providers: {
    metaTitle: 'Fournisseurs de stockage',
    metaDescription:
      's3nd fonctionne avec AWS S3 et tout stockage compatible S3 : Cloudflare R2, MinIO, Scaleway Object Storage, Wasabi. L’endpoint est la seule différence, et la CLI écrit une configuration de départ pour chacun.',
    keywords: ['stockage compatible s3', 'cloudflare r2 minio scaleway wasabi', 'fournisseurs s3nd'],
    crumb: 'Fournisseurs',
    eyebrow: 'Votre bucket',
    title: 'Tout stockage qui parle S3.',
    lead: 'Définissez un endpoint et s3nd ajuste les deux valeurs par défaut qu’attendent les fournisseurs compatibles S3. Les deux restent surchargeables. La CLI écrit une configuration de départ pour chaque fournisseur, et doctor vous dit si ça fonctionne vraiment.',
    primary: 'Les fournisseurs dans la doc',
    pick: { eyebrow: 'Fournisseurs', title: 'Choisissez le vôtre.' },
    notListed:
      'Pas dans la liste ? Ceph, Garage, SeaweedFS, Backblaze B2, DigitalOcean Spaces et les autres fonctionnent de la même façon : un endpoint, une paire de clés, et `s3nd doctor` pour confirmer que les écritures conditionnelles sont honorées. [La CLI](/cli) a les détails.',
    detail: {
      eyebrow: 'Fournisseur de stockage',
      titlePrefix: 's3nd avec',
      metaDescription: (name: string) =>
        `Déplacer des fichiers et des données d’app local-first via un bucket ${name} avec s3nd : la configuration createBucket(), le point de départ de la CLI, et ce qu’il faut savoir sur ce fournisseur.`,
      primary: 'Dans la documentation',
      secondary: 'La CLI',
      why: 'Pourquoi celui-ci',
      cli: {
        eyebrow: 'Depuis la ligne de commande',
        title: 'Une configuration de départ, et ce qu’il reste à faire.',
        lead: 'init écrit le fichier avec des références ${VAR} plutôt que des secrets, donc il est fait pour être versionné ; le fichier d’environnement qu’il désigne, non.',
        doctor: 'Lancez `s3nd doctor`. Il effectue les opérations dont s3nd a besoin et rapporte ce qui s’est passé.',
      },
      notes: { eyebrow: 'Bon à savoir', title: (short: string) => `Notes sur ${short}.`, link: 'Le guide complet' },
      others: { eyebrow: 'Autres fournisseurs', title: 'L’endpoint est la seule différence.' },
    },
  },

  alternatives: {
    metaTitle: 'Alternatives et comparaisons',
    metaDescription:
      'Comment s3nd se compare à Magic Wormhole, croc, WeTransfer, PairDrop, Dexie Cloud, PowerSync, ElectricSQL, Replicache, PouchDB, Firebase et rclone. Où ils se recoupent, où ils diffèrent, et lequel choisir.',
    keywords: [
      'alternatives à s3nd',
      'comparatif outils de transfert de fichiers',
      'comparatif synchronisation local-first',
    ],
    crumb: 'Alternatives',
    eyebrow: 'Comparé',
    title: 'Parfois, c’est un autre outil qu’il vous faut.',
    lead: 's3nd se situe entre trois familles d’outils : le transfert de fichiers par code, le partage de fichiers pour les gens, et les moteurs de synchronisation local-first. Chaque page décrit d’abord l’autre outil dans ses propres termes, puis où les deux se séparent, et dit franchement quand le choisir.',
    secondary: 'Comment s3nd fonctionne',
    vs: 's3nd vs',
    detail: {
      metaDescription: (name: string, headline: string) =>
        `${headline}. Ce qu’est ${name}, où les deux se recoupent, où ils diffèrent, et quand choisir l’un ou l’autre.`,
      primary: 'Comment s3nd fonctionne',
      what: { eyebrow: (name: string) => `Ce qu’est ${name}`, title: 'Dans ses propres termes.' },
      matrix: { eyebrow: 'Côte à côte', title: 'Où ils se séparent.' },
      differences: { eyebrow: 'Les différences', title: 'Ce qui change vraiment.' },
      decision: {
        eyebrow: 'La décision',
        title: 'Choisissez celui qui convient.',
        pickThem: (name: string) => `Choisissez ${name} quand`,
        pickS3nd: 'Choisissez s3nd quand',
        link: 'Voir les cas d’usage',
      },
      more: { eyebrow: 'Plus de comparaisons', title: 'Outil par outil.' },
    },
  },

  board: {
    yourBucket: 'votre bucket',
    expires: 'expire 1h',
    anyOtherMachine: 'n’importe quelle autre machine',
    gone: 'brûlé',
  },

  diagram: {
    machineA: 'Machine A',
    bucket: 'Votre bucket',
    machineB: 'Machine B',
    putLines: ['s3nd put ./report.pdf', 'ou POST /api/transfers depuis votre app', '→ K7QP2M4X'],
    bucketLines: ['drop/K7QP2M4X', '284 ko · expire dans 1 h', 'S3, R2, MinIO, Scaleway, Wasabi'],
    getLines: ['s3nd get k7qp-2m4x', 'ou GET /api/transfers/:code/raw', '→ report.pdf, puis rm'],
    connectorUp: 'un PutObject · ifAbsent · expiration inscrite sur l’objet',
    connectorDown: 'code normalisé · expiration vérifiée à la lecture',
    caption: 'Huit caractères lus sur un écran et tapés sur un autre.',
    bits: '40 bits',
  },

  demo: {
    typed: 'Ce que l’utilisateur a tapé',
    lookedUpPrefix: 'Ce que',
    lookedUpSuffix: 'cherche',
    placeholder: 'K7QP 2M4X',
    typeACode: 'Tapez un code.',
    complete: 'Complet.',
    completeBody:
      'Séparateurs retirés, casse repliée, et O, I et L lus comme 0, 1 et 1, parce que la base32 Crockford n’a ni O, ni I, ni L avec lesquels les confondre.',
    partial:
      '{have} caractères sur {need}. La saisie reste exactement telle que tapée ; seule la recherche est réparée.',
    alphabet: 'Alphabet',
    chars: 'caractères',
    bits: 'bits',
  },

  drop: {
    metaTitle: 'Déployer une drop box',
    metaDescription:
      'Un petit WeTransfer sur votre propre bucket : déposez un fichier, obtenez un code et un lien, récupérez-le sur n’importe quel appareil jusqu’à expiration. Un template Next.js bâti sur s3nd, déployé sur Vercel en un clic.',
    keywords: [
      'wetransfer auto-hébergé',
      'template vercel transfert de fichiers',
      'template nextjs dépôt de fichiers s3',
      's3nd drop',
    ],
    crumb: 'Déployer une drop box',
    eyebrow: 'Template',
    title: 'Votre propre WeTransfer, sur votre propre bucket.',
    lead: 'Déposez un fichier, obtenez un code de huit caractères et un lien, récupérez-le sur n’importe quel appareil jusqu’à expiration. Une app Next.js bâtie sur la bibliothèque et les hooks, déployée sur Vercel en un clic avec cinq variables d’environnement.',
    primary: 'Déployer sur Vercel',
    secondary: 'Le template sur GitHub',
    what: {
      eyebrow: 'Ce que vous obtenez',
      title: 'Deux pages et une route.',
      lead: 'La page de dépôt, la page de récupération, et le handler de transfert entre les deux. Tout le reste est à vous pour le restyler.',
      cards: [
        {
          title: 'Une zone de dépôt',
          body: 'Glissez un fichier ou choisissez-en un. Il atterrit dans votre bucket sous un code neuf avec une expiration inscrite sur l’objet, et la page affiche le code sur un panneau à volets à côté du lien à partager.',
        },
        {
          title: 'Une page de récupération',
          body: '`/K7QP2M4X` montre le nom du fichier, la taille et le temps restant, puis remet les octets. Un code inconnu ou expiré obtient le même 404, donc personne ne peut sonder quels codes ont servi.',
        },
        {
          title: 'Un seul fichier de route',
          body: '`createTransferHandler()` sert le protocole à quatre routes, donc la CLI fonctionne aussi contre votre déploiement : `s3nd put --remote https://your.drop/api/transfers`.',
        },
        {
          title: 'Un mot de passe optionnel',
          body: 'Définissez `DROP_PASSWORD` et le dépôt le demande ; la récupération, jamais. Sans lui, quiconque trouve la page peut déposer un fichier dans votre bucket, ce qui va très bien derrière un proxy et pas du tout sur l’internet ouvert.',
        },
      ],
    },
    setup: {
      eyebrow: 'Mise en place',
      title: 'Cinq variables, une règle de cycle de vie.',
      lead: 'Le bucket et une paire de clés limitée à celui-ci. Vercel les demande au déploiement ; en local, elles vont dans .env.local.',
      envTitle: '.env.local',
      steps: [
        'Créez un bucket sur R2, S3, Scaleway, Wasabi ou un MinIO que vous hébergez, et une paire de clés avec lecture et écriture sur ce bucket et rien d’autre.',
        'Cliquez sur Déployer, collez les cinq valeurs, attendez le build.',
        'Ajoutez une règle de cycle de vie qui supprime les objets sous le préfixe après un jour ou deux : l’expiration empêche un transfert d’être remis, seule la règle supprime l’objet.',
        'Lancez `npx @s3nd/cli doctor --remote https://your.drop/api/transfers` et regardez-le faire l’aller-retour d’un vrai transfert.',
      ],
    },
    limits: {
      eyebrow: 'Bon à savoir',
      title: 'Ce qu’il ne fait pas, pour l’instant.',
      cards: [
        {
          title: '4,5 Mo sur Vercel',
          body: 'Un fichier passe par la fonction, donc la limite de requête de Vercel s’applique. `DROP_MAX_SIZE_MB` fixe le plafond en dessous, et un fichier trop gros est refusé avant tout upload. Les uploads présignés depuis le navigateur, qui lèvent la limite, sont sur la feuille de route.',
        },
        {
          title: 'Pas de comptes',
          body: 'Le code est toute la poignée de main, et c’est un jeton au porteur. L’expiration par défaut est d’un jour ; raccourcissez-la avec `DROP_EXPIRES_IN` pour tout ce qui est sensible, ou chiffrez avant de déposer.',
        },
        {
          title: 'Restylez librement',
          body: 'Tailwind, deux pages, aucun design system à apprendre. Le panneau à volets et l’ambre sont l’identité du site, pas le contrat du template.',
        },
      ],
    },
    localTitle: 'lancer en local',
  },
}
