# Audit des packages et roadmap vers la v1

État au 22 septembre 2026, sur `main` (`613f9e3`). Les quatre packages publiés sont en `0.1.0`.

Périmètre : `@s3nd/protocol`, `@s3nd/core` (`packages/s3nd`), `@s3nd/react`, `@s3nd/cli`. Les
apps, les exemples et le template `drop` ne sont évoqués que lorsqu'ils touchent la surface
publiée.

Méthode : lecture intégrale des sources (`src/`), des tests et de la configuration de build, CI et
release. `bun run build`, `lint`, `type-check`, `test` et `format:check` passent : 261 tests au
total (protocol 35, core 149, react 23, cli 54). Les bugs marqués **[reproduit]** ont été
confirmés par un test jetable branché sur le handler et le bucket en mémoire des tests existants.

---

## 1. Synthèse

Le projet est dans un **très bon état pour une 0.1** : l'architecture est saine, le code est lisible
et commenté, la DX est soignée, l'outillage de release est déjà au niveau d'un projet mature. Ce
qui sépare le projet d'une v1, ce n'est pas la qualité du code, c'est :

1. **quelques bugs de correction et de sécurité** dans le handler HTTP et la CLI (section 3), dont
   un écrit un fichier en dehors du répertoire courant ;
2. **un contrat de protocole encore implicite** sur plusieurs points (versionnage sur le fil,
   distinction snapshot/fichier, limites de taille, CORS) qu'il faut figer avant de promettre la
   stabilité ;
3. **la limite de taille** (tout transite en mémoire par le serveur), déjà annoncée comme dette
   pour la v0.2 ;
4. **l'absence de tests contre un vrai S3** (MinIO/R2) en CI.

| Package          | Maturité   | Points forts                                                     | Bloquants v1                                                            |
| ---------------- | ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `@s3nd/protocol` | Bonne      | Petit, sans dépendance serveur, codes d'erreur stables           | Version non transmise, `S3ndError` mal placé, `instanceof` fragile      |
| `@s3nd/core`     | Bonne      | Validation des clés, ETag/`ifAbsent`, enveloppe versionnée       | Bugs du handler, tout en mémoire, pas de limite sur le JSON, pas d'edge |
| `@s3nd/react`    | Correcte   | Gestion abort/race/unmount propre, `'use client'` maîtrisé       | `loadBytes`/`burn` hors du cycle d'état, pas de progression             |
| `@s3nd/cli`      | Très bonne | `doctor`, profils, origine de chaque valeur, un seul chemin code | Path traversal sur `get`, écrasement silencieux, tout en mémoire        |

---

## 2. Ce qui est bien

### Architecture

- **Le découpage en quatre packages est juste.** `protocol` ne dépend de rien côté stockage, donc
  React, le site et un navigateur l'embarquent sans tirer l'AWS SDK. L'invariant est écrit
  (`protocol/src/index.ts`, template de PR) et vérifié en revue.
- **Le protocole est un contrat, pas une implémentation.** `types.ts` décrit quatre routes et leurs
  payloads ; un backend Go ou Rails qui les implémente marche avec tous les clients.
- **La CLI n'a qu'un seul chemin de code** : en local, le client protocole est branché directement
  sur le handler en mémoire (`buildClient`, `cli/src/index.ts`). `--remote` et le mode local ne
  peuvent pas diverger.
- **Le handler parle `Request`/`Response`** : Next, Hono, Bun, Deno, workers.

### Qualité du code

- TypeScript strict avec `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`.
- Erreurs typées avec des `code` stables (`S3ndError`, `TransferError`, `CliError`) et des messages
  qui disent quoi faire.
- `assertValidKey` refuse traversal, chemins absolus, caractères de contrôle, dépassement de
  1024 octets : les clés venant d'un utilisateur sont traitées comme hostiles.
- Concurrence optimiste bien pensée : `ifMatch` / `ifAbsent`, ETag normalisé, retry sur collision
  de code (`claimCode`).
- Enveloppe de snapshot versionnée, compression détectée plutôt que supposée, compatibilité avec
  l'ancien marqueur `bucketcode`.
- `NOT_FOUND` couvre volontairement « expiré » et « inexistant » pour ne pas permettre de sonder les
  codes.
- Codes de synchronisation : Crockford base32, réparation `O→0`, `I/L→1` seulement quand
  l'alphabet la rend non ambiguë, entropie exposée.
- `useAsyncTask` gère correctement l'annulation de la requête précédente, les réponses tardives et
  le démontage.

### DX et outillage

- `s3nd doctor` vérifie ce qui fait perdre un après-midi : credentials, `HeadBucket`, aller-retour
  écriture/lecture/suppression, et surtout la **règle de lifecycle** sans laquelle les transferts
  expirés restent facturés.
- `s3nd config` montre d'où vient chaque valeur ; les secrets sont masqués.
- Release : release-please en monorepo, titres de PR Conventional Commits vérifiés en CI, publication
  ordonnée par dépendances, `--provenance`, idempotente sur les versions déjà publiées.
- CI : matrice Node 20/22/24, cache turbo, `format:check`.
- Tarballs légers (sourcemaps retirées, `files` explicite, `sideEffects: false`).
- Documentation abondante : README par package, GIFs, fichiers communautaires, `SECURITY.md`.

---

## 3. Ce qui ne va pas

Classé par gravité. Les références pointent vers `main`.

### Critique (sécurité, à corriger avant toute nouvelle release)

**C1. La CLI écrit où l'expéditeur le décide.** `commandGet` (`cli/src/index.ts`) calcule la
destination avec `resolvePath(flags.output ?? flags.name ?? metadata.filename ?? code)`. Or
`filename` est fourni par l'expéditeur via l'en-tête `x-s3nd-filename`, stocké tel quel et renvoyé
tel quel par le handler **[reproduit : `../../../etc/evil` revient intact]**. Un code reçu d'un
tiers peut donc écrire `~/.ssh/authorized_keys` ou `../../.bashrc`. Correctif : ne garder que
`basename`, assainir, et refuser d'écraser un fichier existant sans `--force`.

**C2. `GET /:code/raw` en mode `redirect` ne vérifie rien.** `readRaw` signe une URL et redirige
avant tout `get()` : ni existence, ni expiration, ni type. Un code expiré dont l'objet n'a pas
encore été supprimé par la lifecycle reste téléchargeable, ce qui contredit la promesse
« expiré = introuvable ». Correctif : `HeadObject` (métadonnées + expiration) avant de signer, et
une durée de signature courte.

### Majeur (correction)

**M1. Un fichier JSON ne peut pas être envoyé comme fichier.** Le handler choisit snapshot ou
fichier sur `content-type.includes('application/json')`. `useSendTransfer().sendFile(file)` envoie
`file.type`, donc tout `.json` part en snapshot et échoue en `INVALID_REQUEST`
**[reproduit]** ; pire, un JSON qui contient une clé `data` devient silencieusement un snapshot.
Correctif : discriminer sur la présence de `x-s3nd-filename` (ou un en-tête `x-s3nd-kind`
explicite), et documenter la règle dans le protocole.

**M2. Un chemin mal encodé fait planter le handler.** `segmentsOf` appelle `decodeURIComponent`
sans `try` : `GET /api/transfers/%E0` lève une `URIError` non rattrapée **[reproduit]**, donc un 500
du framework au lieu d'un `INVALID_SYNC_CODE`.

**M3. Plus généralement, toute erreur qui n'est pas une `S3ndError` est relancée.** Le protocole
dit que « tout non-2xx a un corps `{ error }` », mais une erreur réseau du SDK non enveloppée, une
`URIError` ou une exception dans `authorize` sort brute. Il faut un dernier filet qui répond
`INTERNAL` en JSON (avec un hook `onError` pour logger).

**M4. `/raw` sert aussi les snapshots.** Sur un code snapshot, `/raw` renvoie l'enveloppe gzip
brute (`1f 8b`) **[reproduit]**, métadonnées internes comprises. Soit 404/`INVALID_REQUEST`, soit
un comportement documenté.

**M5. Rien ne limite la taille avant de tout lire.** `createFile` fait `request.arrayBuffer()` puis
seulement `upload()` vérifie `maxSize` ; `createSnapshot` fait `request.json()` sans aucune limite.
Un client peut faire tenir un gros corps en mémoire serveur avant le refus. Correctif : vérifier
`content-length` d'abord, puis lire en flux avec un compteur qui coupe au-delà de `maxSize`.

**M6. Le User-Agent est stocké par défaut.** `device: body.device ?? request.headers.get('user-agent')`
écrit l'UA complet dans le bucket et le renvoie à quiconque connaît le code. C'est une fuite de
données personnelles discrète ; à rendre opt-in.

### Moyen (API et robustesse)

- **`PROTOCOL_VERSION` n'est jamais transmis.** Ni en-tête de réponse, ni en-tête de requête. Un
  client v2 face à un serveur v1 n'a aucun moyen de le savoir. À figer avant la v1 (par ex.
  `s3nd-protocol: 1` dans les deux sens).
- **Pas de CORS.** Le client est présenté comme utilisable depuis n'importe quelle origine, mais le
  handler ne répond pas aux `OPTIONS` et n'ajoute aucun en-tête. Option `cors` à prévoir.
- **Pas de hook de rate limiting.** 40 bits d'entropie, c'est bien, mais `SyncCodes` documente que
  quatre chiffres « sont le problème du rate limit » alors que le handler n'offre aucun point
  d'accroche autre que `authorize`.
- **N'importe qui connaissant le code peut le supprimer** (`DELETE`). Pour une v1, un jeton de
  propriétaire renvoyé à la création (`deleteToken`) ou un mode « brûlé à la lecture » serait plus
  sûr.
- **`S3ndError` vit dans `protocol`** alors que la moitié de ses codes (`UPLOAD_FAILED`,
  `GET_FAILED`, `MISSING_CONTENT_LENGTH`...) décrivent le stockage. Le déplacement est cassant :
  c'est maintenant ou en v2.
- **`isS3ndError` / `isTransferError` reposent sur `instanceof`**, alors que chaque package est
  publié en double ESM + CJS. Si une application charge `protocol` une fois en `require` et une fois
  en `import`, `instanceof` renvoie `false` (dual package hazard). Ajouter une marque
  (`Symbol.for('s3nd.error')`) et tester dessus.
- **Incohérences d'API de `Bucket`** : `get`/`put`/`upload` acceptent `prefix` et `signal`,
  `getUrl` et `delete` n'acceptent ni l'un ni l'autre.
- **Le client ne valide pas les réponses** (`as CreatedTransfer`) : un proxy qui renvoie du HTML en
  200 donne une erreur de parsing obscure. Au minimum vérifier le `content-type`.
- **Pas de timeout par défaut** dans le client ni dans le handler.
- **`@s3nd/core` importe `node:crypto`, `node:zlib`, `node:stream`** : il ne tourne pas sur Vercel
  Edge ni sur un Worker sans `nodejs_compat`, alors que la doc du handler cite « a worker ».
  `crypto.randomUUID`, `CompressionStream` et les web streams suffiraient.

### Mineur (DX, cohérence)

- React : `loadBytes` et `burn` contournent `useAsyncTask` (pas de `status`, pas d'annulation, pas
  d'erreur exposée). Pas de progression d'upload/download.
- React : l'exemple JSDoc `onClick={() => send(await exportDatabase(), …)}` n'est pas du code
  valide.
- React : `@s3nd/react` n'a pas de champ `engines`, et `react` en peer n'a pas de borne haute.
- CLI : `put` lit tout le fichier en mémoire (`readFile`, stdin concaténé), pas de barre de
  progression, pas de commande pour lister ni pour afficher un QR code.
- CLI : `--token` en argument finit dans l'historique du shell ; recommander `S3ND_TOKEN`.
- `doctor` : une règle de lifecycle filtrée par `Filter.And.Prefix` ou par tag n'est pas reconnue
  (faux « warn »).
- Commentaires et messages qui promettent « v0.2 » (multipart, presign) : à mettre à jour selon la
  roadmap réelle.
- Pas de `publint` / `@arethetypeswrong/cli` en CI pour vérifier les `exports` ESM/CJS/types.
- Pas de couverture de code mesurée, pas de test d'intégration contre MinIO.
- `turbo.json` : `lint` n'a pas d'`inputs`, donc aucun cache ciblé ; secondaire.

---

## 4. Ce qu'il faut améliorer

Regroupé par thème, avec ce que la v1 exige et ce qui peut attendre.

### 4.1 Figer le protocole (exigé pour la v1)

Rédiger `packages/protocol/PROTOCOL.md` comme une vraie spécification, puis l'implémenter :

- en-tête de version dans les deux sens et comportement en cas de désaccord ;
- discrimination snapshot/fichier explicite (M1) ;
- `/raw` sur un snapshot (M4) ;
- limites : taille max annoncée (en-tête ou `GET /` de capacités), code `TOO_LARGE` garanti avant
  lecture complète ;
- CORS et `OPTIONS` ;
- sémantique de `DELETE` (jeton de propriétaire ou non) ;
- garantie « tout non-2xx a un corps `{ error }` » (M3) ;
- suite de conformité exportée (`@s3nd/protocol/conformance` ou un package de test) qu'un serveur
  tiers peut lancer contre son implémentation.

### 4.2 Gros fichiers (exigé pour la promesse « move a file »)

Aujourd'hui, tout passe par la mémoire du serveur et plafonne à 4,5 Mo sur Vercel. Pour une v1
crédible :

- **upload présigné** : `POST /` renvoie une URL PUT présignée (ou un POST policy avec
  `content-length-range`), le navigateur/la CLI envoie directement au bucket, puis confirme ;
- **multipart** pour la CLI et le mode local (la signature `UploadBody` accepte déjà les streams) ;
- **streaming** côté CLI (`createReadStream`, écriture en flux sur `get`) ;
- progression exposée dans le client, les hooks React et la CLI.

### 4.3 Sécurité

- Corriger C1, C2, M5, M6.
- Hook `rateLimit` (ou documentation d'un middleware) et recommandation de longueur de code.
- Chiffrement de bout en bout optionnel (clé dans le fragment de l'URL / dérivée du code) : c'est
  un différenciateur fort pour un outil de transfert, mais c'est une v1.x.
- Écrire le modèle de menace dans `SECURITY.md` : qui peut lire, qui peut supprimer, ce qu'un
  opérateur de bucket voit.

### 4.4 Portabilité runtime

- Retirer les `node:*` de `@s3nd/core` au profit des API web (ou isoler le handler dans une entrée
  `@s3nd/core/handler` compatible edge).
- Tester le handler sur Bun, Deno et un Worker en CI (au moins un smoke test).

### 4.5 Qualité et CI

- Job d'intégration avec un conteneur MinIO (service GitHub Actions) exécutant la suite complète et
  `s3nd doctor`.
- `publint` et `attw` sur chaque package construit.
- Couverture mesurée (`vitest --coverage`) avec un seuil sur `core` et `protocol`.
- Test de fumée des tarballs : `npm pack`, installation dans un projet vide ESM et CJS, import,
  exécution de `s3nd --version`.
- Tests de propriété sur `normalizeSyncCode` et `assertValidKey` (fast-check).

### 4.6 API publique

- Revue d'API complète avec `@microsoft/api-extractor` : générer un rapport `.api.md` par package,
  le committer, et faire échouer la CI sur tout changement non intentionnel. C'est l'outil qui rend
  la promesse semver tenable.
- Trancher les changements cassants en une seule fois (voir 5.2).
- Aligner `getUrl`/`delete` sur `get`/`put` (`prefix`, `signal`).
- Marque d'erreur inter-bundles (`Symbol.for`).

---

## 5. Roadmap vers la v1

Principe : **tout ce qui casse l'API se fait avant la 1.0**, en 0.x, pour que la 1.0 soit une
release de stabilisation et non de nouveautés.

### 0.1.x — Correctifs (immédiat, sans changement d'API)

Objectif : rendre la 0.1 sûre à utiliser pendant que la suite se prépare.

- [ ] C1 : `s3nd get` n'utilise que le `basename` assaini du filename et refuse d'écraser sans
      `--force`
- [ ] C2 : `raw: 'redirect'` vérifie existence et expiration avant de signer
- [ ] M2 : `decodeURIComponent` protégé, `INVALID_SYNC_CODE` en retour
- [ ] M3 : filet final `INTERNAL` en JSON pour toute erreur, hook `onError`
- [ ] M4 : `/raw` refuse un snapshot
- [ ] M5 : contrôle de `content-length` avant lecture, lecture bornée, limite sur le JSON
- [ ] M6 : ne plus stocker le User-Agent par défaut
- [ ] `doctor` : reconnaître `Filter.And.Prefix`
- [ ] Tests de régression pour chacun des points ci-dessus

### 0.2 — Contrat du protocole et changements cassants

Objectif : figer le fil et l'API. Dernière fenêtre pour casser.

- [ ] `PROTOCOL.md` : spécification complète (4.1)
- [ ] Discrimination snapshot/fichier explicite (M1)
- [ ] En-tête de version du protocole
- [ ] CORS dans le handler
- [ ] `S3ndError` déplacé vers `@s3nd/core` ; `protocol` ne garde que `TransferError` et
      `INVALID_SYNC_CODE`
- [ ] Marque d'erreur `Symbol.for` et `isXxxError` basés dessus
- [ ] `getUrl`/`delete` acceptent `prefix` et `signal`
- [ ] Validation minimale des réponses côté client, timeout configurable
- [ ] `useReceiveTransfer` : `loadBytes` et `burn` intégrés au cycle d'état
- [ ] api-extractor branché, rapports committés

### 0.3 — Gros fichiers et portabilité

Objectif : tenir la promesse « déplacer un fichier » sans plafond de 4,5 Mo.

- [ ] Upload présigné (navigateur et CLI) avec confirmation
- [ ] Multipart dans `Bucket.upload` pour les streams de taille inconnue
- [ ] CLI en streaming sur `put` et `get`, barre de progression
- [ ] Progression dans le client et les hooks React (XHR ou `fetch` + streams)
- [ ] `@s3nd/core` sans `node:*` sur le chemin du handler ; smoke tests Bun, Deno, Worker
- [ ] Hook de rate limiting et jeton de suppression (ou mode « burn after read »)

### 0.4 — Durcissement (release candidate)

Objectif : plus aucune fonctionnalité, seulement de la confiance.

- [ ] Intégration MinIO en CI, et une passe manuelle documentée sur AWS S3 et R2
- [ ] Suite de conformité du protocole publiée et exécutée contre le handler
- [ ] `publint`, `attw`, smoke test des tarballs, couverture avec seuil
- [ ] Modèle de menace dans `SECURITY.md`
- [ ] Guide de migration 0.1 → 1.0
- [ ] Documentation relue : plus aucune mention de « v0.2 » obsolète, chaque option exportée
      documentée
- [ ] Publication en `1.0.0-rc.N` sur le tag npm `next`, retour d'au moins un projet réel
      (le template `drop`, l'exemple `indexeddb-sync`)

### 1.0 — Stable

Critères de sortie :

- aucune issue ouverte étiquetée `security` ou `bug` de gravité haute ;
- rapports api-extractor inchangés depuis la dernière RC ;
- CI verte sur Node 20/22/24, MinIO, et smoke tests runtimes ;
- `PROTOCOL.md` marqué version 1 et suite de conformité à 100 % ;
- politique de support écrite : semver strict, versions de Node supportées, durée de support de la
  1.x après une 2.0.

Côté release-please : retirer `bump-minor-pre-major` au passage en 1.0 (ou forcer la version avec
`release-as: 1.0.0`), sinon un `feat!` en 0.x continue de ne produire qu'un bump mineur.

### Après la 1.0 (1.x)

- Chiffrement de bout en bout optionnel
- Transferts multi-fichiers / dossiers
- `s3nd send` interactif avec QR code dans le terminal
- Adaptateurs de framework clé en main (Hono, Express, Fastify)
- Hooks pour d'autres frameworks UI (Vue, Svelte) au-dessus de `@s3nd/protocol`
