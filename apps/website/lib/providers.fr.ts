import type { ProviderCopy, ProviderSlug } from './providers'

const LIFECYCLE =
  'expiresIn empêche un transfert d’être remis ; seule une règle de cycle de vie supprime l’objet. Donnez au préfixe une règle qui expire les objets après un jour ou deux, et s3nd doctor passe au vert.'

export const providersFr: Record<ProviderSlug, ProviderCopy> = {
  'cloudflare-r2': {
    tagline: 'Aucun frais de sortie, exactement ce qu’il faut pour déplacer un fichier de 2 Go entre deux laptops.',
    description:
      'R2 parle l’API S3, ignore la région, et ne facture rien en sortie. C’est le fournisseur contre lequel le guide « sans serveur » est écrit : un bucket, un jeton limité à celui-ci, un fichier de configuration, et un code transmis entre deux machines pour une facture de zéro.',
    next: [
      'Mettez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY dans .env, et gardez-le hors de git.',
      'Le jeton d’API a besoin de Object Read & Write sur ce bucket, et de rien d’autre.',
      'Ajoutez une règle de cycle de vie qui supprime les objets sous transfers/ après un jour ou deux.',
    ],
    notes: [
      {
        title: 'region: "auto"',
        body: 'R2 ignore la région et le SDK en exige une. Définir un endpoint fait que s3nd choisit "auto" par défaut, donc il n’y a rien à écrire.',
      },
      {
        title: 'Les écritures conditionnelles fonctionnent',
        body: 'R2 implémente If-None-Match et If-Match sur PutObject, ce qui empêche deux transferts simultanés de s’écraser.',
      },
      { title: 'Nettoyage des expirés', body: LIFECYCLE },
    ],
    keywords: ['transfert de fichier cloudflare r2', 'r2 cli', 'synchronisation cloudflare r2', 's3nd r2'],
  },
  'aws-s3': {
    tagline:
      'L’original. Les identifiants viennent de la chaîne de fournisseurs, donc une Lambda ou une tâche ECS n’a besoin d’aucune clé.',
    description:
      'Sur AWS, s3nd est le SDK AWS v3 avec la sémantique de transfert par-dessus. Omettez les identifiants et la chaîne de fournisseurs par défaut s’applique : variables d’environnement, fichier de configuration partagé, ou rôle attaché à l’instance, à la tâche ou à la fonction. Rien à stocker, rien à faire tourner.',
    next: [
      'Donnez des identifiants à la machine de la façon habituelle : AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY, un profil, ou un rôle.',
      'Ajoutez une règle de cycle de vie sur le préfixe transfers/ qui expire les objets après un jour ou deux.',
    ],
    notes: [
      {
        title: 'Adressage virtual-hosted',
        body: 'Sans endpoint, s3nd laisse l’adressage path-style désactivé, ce qu’attend S3 lui-même. Ne définissez forcePathStyle vous-même que si une passerelle devant l’exige.',
      },
      {
        title: 'Les ACL sont désactivées par défaut',
        body: 'Les buckets créés après 2023 ont « bucket owner enforced » activé. Rendez les objets publics avec une bucket policy ou un CDN, et laissez l’option acl tranquille.',
      },
      { title: 'Nettoyage des expirés', body: LIFECYCLE },
    ],
    keywords: ['transfert de fichier aws s3 par code', 's3 transfert cli', 's3 code de synchronisation', 's3nd aws'],
  },
  minio: {
    tagline: 'Une commande Docker, et le vrai chemin de code tourne sur votre laptop et en CI.',
    description:
      'Un MinIO local est la façon la moins chère d’exercer s3nd pour de vrai : le même PutObject avec les mêmes en-têtes conditionnels, aucun identifiant à créer et aucun réseau à attendre. Les exemples du dépôt le visent par défaut.',
    next: [
      'docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin quay.io/minio/minio server /data --console-address ":9001"',
      'Créez le bucket transfers depuis la console sur http://localhost:9001.',
    ],
    notes: [
      {
        title: 'Adressage path-style',
        body: 'Les passerelles auto-hébergées exigent https://endpoint/bucket/key. Définir un endpoint l’active ; la configuration de départ l’écrit explicitement pour que l’intention soit visible.',
      },
      {
        title: 'Auto-hébergé en production aussi',
        body: 'La même configuration, avec de vrais identifiants et TLS, tourne contre un cluster MinIO ou n’importe quelle passerelle Ceph, Garage ou SeaweedFS qui implémente le PutObject conditionnel.',
      },
      { title: 'Nettoyage des expirés', body: LIFECYCLE },
    ],
    keywords: [
      'transfert de fichier minio',
      'minio code de synchronisation',
      'transfert de fichier auto-hébergé s3',
      's3nd minio',
    ],
  },
  scaleway: {
    tagline: 'Des régions européennes, compatible S3, et la région veut vraiment dire quelque chose.',
    description:
      'L’Object Storage de Scaleway est compatible S3 avec une différence à connaître : il utilise la région. Passez fr-par, nl-ams ou pl-waw explicitement plutôt que de laisser l’endpoint la mettre à "auto".',
    next: [
      'Mettez SCW_ACCESS_KEY et SCW_SECRET_KEY dans .env.',
      'Ajoutez une règle de cycle de vie sur le préfixe transfers/.',
    ],
    notes: [
      {
        title: 'La région est réelle',
        body: 'L’endpoint porte la région et la signature doit être d’accord avec elle. Écrivez les deux, dans la même région.',
      },
      { title: 'Nettoyage des expirés', body: LIFECYCLE },
    ],
    keywords: ['transfert scaleway object storage', 'scaleway s3 cli', 's3nd scaleway'],
  },
  wasabi: {
    tagline: 'Du stockage à prix fixe sans frais de sortie, sur un endpoint régional.',
    description:
      'Wasabi est compatible S3, facturé au téraoctet stocké sans frais de sortie ni de requête, et joignable via un endpoint régional. Il fonctionne avec s3nd comme tout autre fournisseur à endpoint : définissez l’endpoint et la région, et donnez-lui une paire de clés.',
    next: [
      'Mettez WASABI_ACCESS_KEY et WASABI_SECRET_KEY dans .env.',
      'Ajoutez une règle de cycle de vie sur le préfixe transfers/.',
    ],
    notes: [
      {
        title: 'Durée de stockage minimale',
        body: 'Wasabi facture les objets supprimés pendant une période de rétention minimale. Les transferts sont petits, donc ça compte rarement, mais c’est la ligne de la facture qui surprend.',
      },
      { title: 'Nettoyage des expirés', body: LIFECYCLE },
    ],
    keywords: ['transfert de fichier wasabi', 'wasabi s3 cli', 's3nd wasabi'],
  },
}
