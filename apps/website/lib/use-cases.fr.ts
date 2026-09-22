import type { UseCaseCopy, UseCaseSlug } from './use-cases'

export const useCasesFr: Record<UseCaseSlug, UseCaseCopy> = {
  'file-between-machines': {
    title: 'Un fichier entre deux machines',
    summary: 'Un laptop, un poste fixe, un code. Pas de serveur, pas de compte, via le bucket que vous avez déjà.',
    keywords: [
      'envoyer un fichier entre ordinateurs cli',
      'transférer un fichier avec un code terminal',
      'transfert de fichier cli bucket s3',
    ],
    problem:
      'Vous avez un fichier ici et il vous le faut là-bas. L’e-mail s’étouffe dessus, une messagerie le recompresse et en garde une copie, la clé USB est dans une autre pièce, et les services hébergés veulent un compte.',
    approach:
      'Les deux machines ont des identifiants pour un bucket qui vous appartient. s3nd put envoie le fichier et affiche un code ; s3nd get de l’autre côté le télécharge ; s3nd rm le brûle. Les octets vont d’une machine au bucket et du bucket à l’autre, et rien ne transite par un service au milieu. L’autre machine n’a pas besoin d’être allumée au moment de l’envoi.',
    watch: [
      {
        title: 'Lancez doctor en premier',
        body: 'Il effectue les opérations dont s3nd a besoin et rapporte ce qui s’est passé, y compris si une règle de cycle de vie supprimera les transferts expirés, la chose que personne ne découvre avant l’arrivée d’une facture.',
      },
      {
        title: 'Chaque machine détient les clés',
        body: 'Très bien pour deux ou trois machines à vous. Pour une équipe, mettez un serveur devant et distribuez des jetons plutôt que des identifiants S3.',
      },
      {
        title: 'Les dossiers voyagent en archives',
        body: 'tar cz ./project | s3nd put - --name project.tar.gz. Le code sort sur stdout et tout le reste sur stderr, donc ça se compose.',
      },
    ],
    guideLabel: 'Sans serveur, en détail',
  },
  'team-drop-box': {
    title: 'Une drop box pour votre équipe',
    summary:
      'Une route sur votre propre domaine, un jeton par personne, et un code au lieu d’un envoi dans la messagerie.',
    keywords: [
      'dépôt de fichiers auto-hébergé',
      'transfert de fichiers équipe cli',
      'partage de fichiers interne bucket s3',
      'wetransfer pour équipes auto-hébergé',
    ],
    problem:
      'Dans une équipe, les fichiers circulent en pièces jointes et en envois dans la messagerie, chacun une copie sur les serveurs de quelqu’un d’autre. Donner les clés du bucket à tout le monde n’est pas une option, et un lecteur partagé est un autre genre de désordre.',
    approach:
      'Montez le handler de transfert sur un domaine à vous et passez une fonction authorize qui vérifie un jeton. Chaque personne a un jeton, pas une clé. La CLI le vise avec --remote, un navigateur utilise les mêmes quatre routes via les hooks React, et curl fonctionne aussi. Les fichiers atterrissent dans votre bucket sous un code et expirent tout seuls.',
    watch: [
      {
        title: 'Limitez le débit de la lecture',
        body: 'Un code est un jeton au porteur et quarante bits sont tout le secret. Une limite de débit sur GET /:code est ce qui rend la devinette inutile.',
      },
      {
        title: 'raw: redirect pour les gros fichiers',
        body: 'Avec, un téléchargement répond 302 avec une URL présignée, donc les octets ne transitent jamais deux fois par votre serveur. Sans, ils y passent en streaming, ce qui va bien pour de petits fichiers et coûte cher pour de gros.',
      },
      {
        title: 'doctor --remote comme smoke test',
        body: 'Il fait l’aller-retour d’un vrai transfert contre le déploiement et sort avec un code non nul en cas d’échec. Mettez-le dans le pipeline de déploiement.',
      },
    ],
    guideLabel: 'Mettre en place un serveur, en détail',
  },
  'ci-backups': {
    title: 'Des sauvegardes depuis la CI',
    summary:
      'Une archive nocturne vers votre bucket depuis un workflow, avec les secrets du runner et aucun fichier à versionner.',
    keywords: ['sauvegarde github actions vers s3', 'upload ci vers r2', 'sauvegarde nocturne cli s3'],
    problem:
      'Un workflow produit quelque chose qui vaut la peine d’être gardé : un dump de base de données, un build, un rapport généré. Il doit atterrir dans votre bucket chaque nuit, sans fichier de configuration dans le dépôt et sans bibliothèque cliente dans le workflow.',
    approach:
      'npx @s3nd/cli put, avec le bucket et les identifiants dans des variables d’environnement issues du coffre de secrets du runner. Deux flags transforment un transfert en sauvegarde : --expires-in never, et un préfixe à part pour que la règle de cycle de vie des transferts ne puisse pas l’atteindre.',
    watch: [
      {
        title: '--json pour les logs',
        body: 'Une sortie lisible par une machine, et s3nd doctor --json sort avec un code non nul quand une vérification échoue, donc il sert aussi de smoke test de déploiement.',
      },
      {
        title: 'Un préfixe par politique',
        body: 'Les transferts expirent, les sauvegardes non. Les garder sous des préfixes différents est ce qui permet à un seul bucket de contenir les deux.',
      },
    ],
    guideLabel: 'La référence de la CLI',
  },
  'new-device': {
    title: 'Migrer une app sur un nouvel appareil',
    summary:
      'Une app local-first sans comptes. Un code sur l’ancien téléphone, tapé sur le nouveau, et toute la base de données suit.',
    keywords: [
      'synchroniser indexeddb entre appareils',
      'app local-first nouvel appareil',
      'transférer indexeddb vers un autre navigateur',
    ],
    problem:
      'L’utilisateur a un nouveau téléphone. L’app sur l’ancien contient tout, dans IndexedDB, et il n’y a aucun compte où se connecter parce que l’app n’en a jamais eu besoin. IndexedDB ne quitte pas le navigateur dans lequel il a été écrit.',
    approach:
      'L’ancien appareil exporte ses object stores, les poste à votre API, et reçoit un code de huit caractères. Le nouvel appareil tape le code, voit ce qu’il s’apprête à restaurer, et remplace sa base vide en une seule transaction. Le snapshot expire dans l’heure et le code est brûlé en cas de succès.',
    watch: [
      {
        title: 'Confirmer avant de remplacer',
        body: 'Renvoyez createdAt et device depuis la lecture, et affichez-les. L’erreur la plus courante est de restaurer sur l’appareil qui avait déjà les données.',
      },
      {
        title: 'Versionner le snapshot',
        body: 'Passez maxVersion à la lecture. Un snapshot issu d’une version plus récente de l’app échoue avec une erreur claire au lieu d’atterrir dans une version qui va le mal lire.',
      },
      {
        title: 'Brûler le code',
        body: 'Un DELETE après un import réussi est le chemin propre ; l’expiration est le filet de sécurité. Les deux tiennent en une ligne.',
      },
    ],
    guideLabel: 'Migrer sur un nouvel appareil, en détail',
  },
  'continuous-backup': {
    title: 'Sauvegarde continue',
    summary:
      'Un snapshot par compte, réécrit au fil des changements de la base locale, avec des écritures conditionnelles pour que deux appareils ne s’écrasent pas en silence.',
    keywords: ['sauvegarde indexeddb vers s3', 'sauvegarde local-first', 'sauvegarde base de données navigateur'],
    problem:
      'Dès que l’app a des comptes, un code de transfert n’a plus la bonne forme. Il y a une session, donc le serveur sait déjà qui demande. Ce que l’utilisateur veut, c’est que ses données survivent à la perte du laptop, sans rien faire.',
    approach:
      'Indexez le snapshot par identifiant utilisateur plutôt que par code, et réécrivez-le à chaque changement de la base locale. Passez l’ETag lu en dernier comme ifMatch : un second appareil qui a écrit entre-temps fait échouer l’écriture avec PRECONDITION_FAILED au lieu de jeter silencieusement son travail, et votre app relit et fusionne.',
    watch: [
      {
        title: 'Une règle de cycle de vie différente',
        body: 'Les sauvegardes ne doivent pas expirer. Gardez-les sous leur propre préfixe pour que la règle qui nettoie les transferts ne puisse pas les atteindre.',
      },
      {
        title: 'Temporiser les écritures',
        body: 'Un snapshot par frappe de touche, c’est une facture. Écrivez sur un minuteur, au changement de visibilité, et avant la fermeture.',
      },
      {
        title: 'La fusion vous appartient',
        body: 's3nd vous dit que vous avez perdu la course. Décider ce qu’une fusion veut dire pour vos données est du code applicatif, et c’est pour ça que ce n’est pas caché.',
      },
    ],
    guideLabel: 'Sauvegarde continue, en détail',
  },
  'encrypted-sync': {
    title: 'Chiffré de bout en bout',
    summary:
      'Chiffrez dans le navigateur avec une phrase secrète. Votre serveur et votre bucket stockent des octets qu’ils ne peuvent pas lire.',
    keywords: [
      'synchronisation chiffrée de bout en bout',
      'sauvegarde zero-knowledge s3',
      'transfert de fichier chiffré par code',
    ],
    problem:
      'Par défaut, votre serveur peut lire chaque transfert qu’il stocke. Pour un journal, un gestionnaire de mots de passe, des données de santé ou un contrat, c’est le mauvais défaut, et une responsabilité que vous ne voulez peut-être pas porter.',
    approach:
      's3nd stocke ce que vous lui donnez. Dérivez une clé d’une phrase secrète avec WebCrypto, chiffrez la charge utile dans le navigateur, et envoyez le texte chiffré. Le bucket, votre serveur et quiconque devine le code voient des octets inutilisables ; la phrase secrète voyage avec la personne, pas sur le fil. Ça marche pareil pour un fichier que pour un snapshot.',
    watch: [
      {
        title: 'La compression vient après le chiffrement',
        body: 'Le texte chiffré ne se compresse pas. Attendez-vous à une taille stockée égale à la taille brute, et réglez maxSize en conséquence.',
      },
      {
        title: 'Deux secrets, deux canaux',
        body: 'Le code passe par un canal et la phrase secrète par un autre, ou dans la tête de la personne. Un code seul ne vaut plus rien pour qui le devine.',
      },
      {
        title: 'Une phrase secrète perdue, ce sont des données perdues',
        body: 'C’est ce que « de bout en bout » veut dire. Dites-le dans l’interface avant que l’utilisateur ne s’y fie.',
      },
    ],
    guideLabel: 'Synchronisation chiffrée de bout en bout, en détail',
  },
  attachments: {
    title: 'Des pièces jointes à côté des données',
    summary:
      'Les blobs qu’une app détient, transportés comme des objets, avec les enregistrements qui les désignent dans le snapshot.',
    keywords: ['blobs indexeddb s3', 'synchronisation pièces jointes local-first', 'upload blob s3 nodejs'],
    problem:
      'IndexedDB stocke les Blobs nativement, donc les apps local-first finissent par garder des images, des enregistrements et des PDF à côté de leurs données. Du base64 dans un snapshot JSON les gonfle d’un tiers et neutralise gzip : trois façons d’atteindre le plafond de taille en même temps.',
    approach:
      'Utilisez l’API de fichiers sous les snapshots. Envoyez chaque blob comme un objet, gardez sa clé dans l’enregistrement, et laissez le snapshot transporter des références. L’appareil qui reçoit récupère ce dont il a besoin, quand il en a besoin, via une URL présignée si vous préférez que les octets ne transitent jamais par votre serveur.',
    watch: [
      {
        title: 'Même préfixe, même cycle de vie',
        body: 'Placez les pièces jointes sous un préfixe qui partage la règle d’expiration du transfert, sinon elles survivent au snapshot auquel elles appartenaient.',
      },
      {
        title: 'Les streams ont besoin d’une longueur',
        body: 'Un PutObject unique ne peut pas utiliser l’encodage par morceaux. Passez contentLength pour un stream ; les buffers et les Blobs connaissent déjà leur taille.',
      },
    ],
    guideLabel: 'Des pièces jointes à côté des données, en détail',
  },
}
