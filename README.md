# ⚽ Beausoleil Ultimate Team

Application web du **foot en salle du lundi** (5 contre 5). Chaque semaine, les joueurs élisent anonymement leurs
**5 meilleurs joueurs** (classés du 1er au 5e) et **le joueur le plus nul**. Le mardi matin, l’application publie la
**Team of the Week** sous forme de cartes façon FIFA Ultimate Team, avec le « Boulet de la semaine ». Chaque mois, le
joueur le plus souvent 1er reçoit une boisson… offerte par le plus souvent dernier.

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture du projet](#architecture-du-projet)
4. [Base de données et anonymat des votes](#base-de-données-et-anonymat-des-votes)
5. [Règles de calcul](#règles-de-calcul)
6. [Installation en local](#installation-en-local)
7. [Variables d’environnement](#variables-denvironnement)
8. [Créer le compte ADMIN](#créer-le-compte-admin)
9. [Configurer Google OAuth](#configurer-google-oauth)
10. [Déployer sur Vercel](#déployer-sur-vercel)
11. [Sécurité](#sécurité)
12. [Protection anti-capture d’écran : limites](#protection-anti-capture-décran--limites)
13. [Scripts utiles](#scripts-utiles)

---

## Stack technique

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components, Server Actions), TypeScript strict |
| Style | Tailwind CSS 3, polices Bebas Neue + Inter |
| Base de données | PostgreSQL (Neon ou Supabase) via Prisma ORM 6 |
| Authentification | Auth.js v5 (NextAuth) : e-mail + mot de passe et Google OAuth, sessions JWT |
| Mots de passe | bcrypt (12 tours) |
| Validation | Zod sur toutes les entrées |
| Photos de profil | Vercel Blob |
| Tâches planifiées | Vercel Cron |
| Tests | Vitest (algorithmes de classement, récompenses, fenêtres de vote) |

## Fonctionnalités

- **Comptes** : inscription par e-mail / mot de passe ou Google ; un compte unique par adresse e-mail (un compte Google
  ayant le même e-mail est rattaché au compte existant) ; surnom unique (insensible à la casse et aux accents).
- **Profil** : photo facultative (sans photo, la carte affiche les initiales), changement de surnom, mot de passe,
  statistiques personnelles : participations, fois dans le Top 5, fois 1er, fois dernier, récompenses.
- **Sessions du lundi** : l’ADMIN crée la session, coche les participants, ouvre ou ferme le vote, puis clôture.
- **Vote** : uniquement pour les participants, une seule fois, avec 5 joueurs classés et 1 joueur le plus nul.
  Voter pour soi-même est autorisé. Le plus nul ne peut pas figurer dans son propre Top 5.
- **Fenêtre de vote** : par défaut du **lundi 20h00 au mardi 08h00** (heure de Paris), modifiable dans `/admin` et
  par session.
- **Team of the Week** : publiée automatiquement le mardi matin (cron), avec 5 cartes FUT sur un terrain en 1-2-2 et
  une carte rouge et noire pour le « Boulet de la semaine ». Page publique et partageable, uniquement après la
  clôture.
- **Récompense mensuelle** : calculée automatiquement le 1er du mois ; l’ADMIN la marque « offerte » ou « en
  attente » ; l’historique est conservé.
- **Anti-capture** : filigrane, blocage de la sélection et du clic droit, détection des raccourcis, avertissement et
  journalisation (voir les limites plus bas).

## Architecture du projet

```
├── prisma/
│   ├── schema.prisma              # schéma complet (commenté)
│   ├── migrations/                # migrations SQL versionnées
│   └── seed.ts                    # création de l'ADMIN initial (+ joueurs de démo en local)
├── src/
│   ├── middleware.ts              # 1re barrière : connexion requise, /admin réservé à l'ADMIN
│   ├── auth.config.ts             # config Auth.js compatible Edge (middleware)
│   ├── auth.ts                    # Auth.js complet : Google, Credentials, adaptateur Prisma, jeton resynchronisé
│   ├── actions/                   # Server Actions (auth, compte, vote, admin)
│   ├── app/
│   │   ├── page.tsx               # /            accueil
│   │   ├── login/ register/       # /login /register
│   │   ├── onboarding/            # choix du surnom après une 1re connexion Google
│   │   ├── account/               # /account
│   │   ├── sessions/ [id]/        # /sessions /sessions/[id]
│   │   ├── vote/[sessionId]/      # /vote/[sessionId]
│   │   ├── team-of-the-week/      # /team-of-the-week (public, après publication)
│   │   ├── monthly/               # /monthly
│   │   ├── admin/setup/           # /admin/setup (initialisation unique de l'ADMIN)
│   │   ├── admin/(panel)/         # /admin, /admin/sessions(/[id]), /admin/players, /admin/results, /admin/rewards
│   │   └── api/
│   │       ├── auth/[...nextauth] # routes Auth.js
│   │       ├── avatar/            # envoi / suppression de la photo (Vercel Blob)
│   │       ├── security/capture/  # journal des tentatives de capture
│   │       └── cron/              # publish-totw (mardi) et monthly-rewards (1er du mois)
│   ├── components/
│   │   ├── ui/                    # Button, Field, Alert, Badge, PageHeader, StatTile…
│   │   ├── fut/                   # FutCard, FutsalPitch, PlayerAvatar, ShareButton
│   │   ├── security/              # AntiCapture, Watermark
│   │   ├── vote/                  # VoteForm
│   │   ├── admin/ account/ auth/ layout/
│   ├── lib/
│   │   ├── results/               # compute.ts (classement, fonction pure), draw.ts (tirage traçable), rating.ts, publish.ts
│   │   ├── rewards/               # monthly.ts (règles, fonction pure), compute-month.ts
│   │   ├── voting/                # window.ts (fenêtre de vote), submit.ts (enregistrement anonyme)
│   │   ├── validations/           # schémas Zod
│   │   ├── guards.ts              # requireUser / requireAdmin / contrôle d'origine
│   │   ├── dates.ts settings.ts queries.ts prisma.ts blob.ts token-resync.ts
│   └── types/next-auth.d.ts
├── tests/                         # tests Vitest
├── vercel.json                    # crons
├── next.config.mjs                # en-têtes de sécurité (CSP, HSTS…)
└── .env.example
```

## Base de données et anonymat des votes

Tables principales : `User`, `Account`, `GameSession`, `SessionParticipant`, `VoteReceipt`, `VoteTally`,
`SessionResult`, `TieBreakDraw`, `MonthlyReward`, `AppSetting`, `ScreenshotEvent`, `AdminAuditLog`.

**Aucun bulletin de vote n’est stocké.** Quand un joueur vote, une transaction unique :

1. vérifie côté serveur que le vote est ouvert et que le votant est participant ;
2. crée un `VoteReceipt (sessionId, userId)` : il indique seulement *qui a voté*, sans contenu ni heure, et sa clé
   primaire **empêche le double vote au niveau de la base** ;
3. incrémente des **compteurs agrégés** `VoteTally (sessionId, playerId, top1…top5, worst)`.

Le lien « A a voté pour B » n’existe donc nulle part : ni l’ADMIN, ni personne lisant la base ne peut le
reconstituer. L’ADMIN ne voit que le **nombre** de votants pendant le vote, puis les totaux par joueur après la
fermeture.

> Contrepartie : un recomptage bulletin par bulletin est impossible. Pour garder un anonymat parfait, ne
> journalisez pas les requêtes SQL en production (Neon et Supabase ne le font pas par défaut).

Dans les formulaires, les joueurs sont identifiés par l’id de leur *participation*, jamais par leur id utilisateur :
aucun identifiant de compte (ADMIN compris) n’est exposé dans l’interface joueur.

## Règles de calcul

### Team of the Week (`src/lib/results/compute.ts`)

1. Score = nombre d’apparitions dans les Top 5 reçus.
2. Égalité : plus de **1res places**, puis plus de **2es places**, puis plus de **participations** (cumulées), puis
   **tirage au sort traçable**.
3. Le **plus nul** est le joueur ayant reçu le plus de votes « plus nul ». En cas d’égalité : tirage au sort traçable.
4. **Tirage traçable** : une graine aléatoire est enregistrée dans `TieBreakDraw` ; l’ordre est obtenu en triant
   `sha256(graine + ":" + idJoueur)`. Avec la graine, n’importe qui peut rejouer et vérifier le tirage (visible dans
   `/admin/results`).
5. **Note FUT** : `60 + 30 × (part des votants l’ayant mis dans son Top 5) + 9 × (part de 1res places)`, plafonnée à
   99. Pour le Boulet : de 59 à 30 selon la part de votes « plus nul ».

### Récompense mensuelle (`src/lib/rewards/monthly.ts`)

- Éligibilité : au moins **3 sessions** jouées dans le mois.
- Seules comptent les sessions ayant au moins **3 participants éligibles**.
- Gagnant : le plus souvent n°1 de la Team of the Week ; perdant : le plus souvent Boulet.
- Égalité : plus de participations dans le mois, puis tirage au sort traçable.
- Le gagnant ne peut pas être celui qui offre (on prend alors le suivant).
- Affichage : **« X doit offrir une boisson à Y »**. Une récompense déjà « offerte » n’est jamais recalculée.

## Installation en local

Prérequis : Node.js ≥ 20 et PostgreSQL (local, Docker, ou une base Neon / Supabase gratuite).

```bash
git clone https://github.com/sadaissa/Futsal-Beausoleil-.git
cd Futsal-Beausoleil-
npm install

cp .env.example .env
# Renseigne au minimum DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_SETUP_SECRET, CRON_SECRET
# AUTH_SECRET : openssl rand -base64 32

npx prisma migrate dev          # crée les tables
SEED_DEMO_PLAYERS=10 npm run db:seed   # facultatif : 10 joueurs de démo (mot de passe "demo-password")

npm run dev                     # http://localhost:3000
```

PostgreSQL rapide avec Docker :

```bash
docker run --name bu-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=beausoleil -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beausoleil"
# DIRECT_URL=même valeur
```

Sans `BLOB_READ_WRITE_TOKEN`, tout fonctionne sauf l’envoi de photos (les cartes affichent les initiales).
Sans `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, le bouton Google est masqué.

## Variables d’environnement

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | URL PostgreSQL utilisée par l’application (URL *poolée* sur Neon / Supabase) |
| `DIRECT_URL` | ✅ | URL directe pour les migrations (identique à `DATABASE_URL` en local) |
| `AUTH_SECRET` | ✅ | Secret de chiffrement des sessions (`openssl rand -base64 32`) |
| `AUTH_URL` | ➖ | URL publique (inutile sur Vercel) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ➖ | Identifiants OAuth Google |
| `ADMIN_SETUP_SECRET` | ✅ | Clé (12 caractères minimum) pour devenir ADMIN via `/admin/setup`, utilisable une seule fois |
| `ADMIN_EMAIL` / `ADMIN_NICKNAME` / `ADMIN_PASSWORD` | ➖ | Alternative : création de l’ADMIN par `npm run db:seed` |
| `BLOB_READ_WRITE_TOKEN` | ➖ | Jeton Vercel Blob (photos de profil) |
| `CRON_SECRET` | ✅ en prod | Protège `/api/cron/*` (Vercel l’envoie automatiquement) |
| `APP_TIMEZONE` | ➖ | Fuseau horaire (défaut `Europe/Paris`) |
| `VOTE_START_TIME` / `VOTE_END_TIME` | ➖ | Horaires par défaut du vote (défaut `20:00` → `08:00`, soit le lendemain) |

## Créer le compte ADMIN

**Méthode recommandée : crée-le toi-même, dès le déploiement.**

1. Définis `ADMIN_SETUP_SECRET` (longue et aléatoire, par exemple `openssl rand -hex 24`).
2. Inscris-toi sur l’application (e-mail ou Google) et choisis ton surnom.
3. Va sur **`/admin/setup`** et saisis la clé. Tu deviens ADMIN.
4. Dès qu’un ADMIN existe, `/admin/setup` est **définitivement désactivée** : personne d’autre ne peut prendre le
   contrôle. Aucune interface ne permet de promouvoir un autre ADMIN ; seule une modification directe en base le
   permet (`UPDATE "User" SET role='ADMIN' WHERE email='…'`).

Alternative (seed) : `ADMIN_EMAIL=toi@exemple.fr ADMIN_PASSWORD=… npm run db:seed`. Le seed refuse de créer un
second ADMIN.

> Fais-le immédiatement après la mise en ligne : tant qu’aucun ADMIN n’existe, toute personne connaissant la clé
> pourrait l’utiliser. Après la création, tu peux supprimer `ADMIN_SETUP_SECRET`.

## Configurer Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → crée un projet → **API et services** → **Écran de
   consentement OAuth** (type *Externe*, nom « Beausoleil Ultimate Team »).
2. **Identifiants** → **Créer des identifiants** → **ID client OAuth** → *Application Web*.
3. **Origines JavaScript autorisées** : `http://localhost:3000` et `https://ton-domaine.vercel.app`.
4. **URI de redirection autorisés** :
   - `http://localhost:3000/api/auth/callback/google`
   - `https://ton-domaine.vercel.app/api/auth/callback/google`
5. Copie l’ID et le secret dans `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET`.

Lors d’une première connexion Google, le joueur choisit son surnom sur `/onboarding`.
Si un compte e-mail / mot de passe non vérifié existait avec la même adresse, la connexion Google prouve la propriété
de l’adresse : le mot de passe est alors supprimé et les anciennes sessions sont révoquées (protection contre la
pré-création malveillante d’un compte). Le joueur peut redéfinir un mot de passe depuis `/account`.

## Déployer sur Vercel

1. **Base de données** : crée une base gratuite sur [Neon](https://neon.tech) (ou Supabase).
   - Neon : `DATABASE_URL` = chaîne *pooled* (hôte `-pooler`), `DIRECT_URL` = chaîne directe.
   - Supabase : `DATABASE_URL` = port 6543 avec `?pgbouncer=true`, `DIRECT_URL` = port 5432.
2. **Importe le dépôt** sur [vercel.com/new](https://vercel.com/new) (framework détecté : Next.js).
3. **Build Command** : `npm run vercel-build` (génère Prisma, applique les migrations puis compile).
4. **Variables d’environnement** : ajoute toutes celles du tableau ci-dessus (Production + Preview).
5. **Vercel Blob** : onglet *Storage* → *Create* → *Blob* → connecte-le au projet (`BLOB_READ_WRITE_TOKEN` est
   ajouté automatiquement).
6. **Crons** : déclarés dans `vercel.json`, activés automatiquement au déploiement en production :
   - `/api/cron/publish-totw` : mardi à 07:10 UTC (08:10 en hiver, 09:10 en été à Paris), après la fermeture du vote
     à 08h00 ;
   - `/api/cron/monthly-rewards` : le 1er du mois à 07:20 UTC.
   Définis `CRON_SECRET` : Vercel l’envoie dans l’en-tête `Authorization`.
   En filet de sécurité, la page `/team-of-the-week` publie aussi les sessions dont le vote est terminé.
7. Mets à jour les URI de redirection Google avec ton domaine Vercel.
8. Ouvre le site, inscris-toi, puis va sur `/admin/setup` (voir plus haut).

## Sécurité

- **Middleware** (`src/middleware.ts`) : pages privées réservées aux utilisateurs connectés, `/admin/*` au rôle
  ADMIN. Chaque page et chaque Server Action ADMIN **revérifie le rôle en base** (`requireAdmin` / `assertAdmin`).
- **Jeton resynchronisé** : à chaque requête serveur, le jeton est recoupé avec la base (rôle, compte bloqué, version
  de session). Un compte bloqué ou un mot de passe changé déconnecte les autres appareils.
- **Vote** : participation vérifiée côté serveur, transaction sérialisable, contrainte unique contre le double vote,
  aucun bulletin stocké, rien n’est conservé côté client (pas de localStorage).
- **Mots de passe** : bcrypt, 12 tours. Comparaison à temps constant, même pour un e-mail inconnu.
- **Validation** : Zod sur toutes les entrées (formulaires, API, paramètres).
- **CSRF** : les Server Actions vérifient nativement l’origine ; les routes API vérifient l’en-tête `Origin` ;
  Auth.js utilise son propre jeton CSRF.
- **XSS** : rendu React échappé, aucun `dangerouslySetInnerHTML`, CSP stricte (`next.config.mjs`),
  `X-Frame-Options: DENY`, HSTS.
- **Photos** : 2 Mo maximum, type vérifié par signature binaire (JPEG / PNG / WebP).
- **Redirections** : seules les URL internes sont acceptées après connexion.
- **Journal ADMIN** : actions tracées dans `AdminAuditLog`, sans aucune donnée de vote.
- **Limitation** : il n’y a pas de limitation du nombre d’essais de connexion. Pour une exposition publique
  importante, ajoute par exemple Upstash Ratelimit sur l’action de connexion.

## Protection anti-capture d’écran : limites

> ⚠️ **Aucune application web ne peut garantir à 100 % l’impossibilité de faire une capture d’écran.** Un navigateur
> n’a pas accès aux fonctions du système d’exploitation : une capture via le système, un autre appareil qui
> photographie l’écran, ou des outils de développement contournent toujours ces protections.

Les mesures mises en place **réduisent le risque et découragent le partage** sur les pages de vote et de résultats
(`/vote/*`, `/sessions/*`, `/admin/results`) :

- résultats et classements **masqués pendant le vote** (« Vote en cours ») ;
- **filigrane dynamique** répété avec l’e-mail, l’identifiant du joueur et l’heure : toute capture partagée
  identifie son auteur ;
- sélection de texte, clic droit, glisser-déposer, copie et impression **désactivés** ;
- détection de `PrintScreen`, `Cmd+Shift+3/4/5`, `Win+Shift+S` (si le navigateur transmet la touche) et `Ctrl+P` :
  contenu flouté, avertissement « Les captures d’écran des votes et résultats sont interdites. » et **événement
  journalisé** (`ScreenshotEvent`, visible dans `/admin`) ;
- contenu **flouté quand la fenêtre perd le focus** (la plupart des outils de capture prennent le focus) ;
- `Permissions-Policy: display-capture=()` : la page ne peut pas être enregistrée par l’API de capture d’écran du
  navigateur.

Sur mobile, les captures système (boutons physiques) ne sont pas détectables par une page web : seul le filigrane
s’applique alors.

La page **Team of the Week** est volontairement partageable : elle n’est visible qu’une fois le vote clos et ne
contient que des résultats agrégés.

## Scripts utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run vercel-build` | Build Vercel (migrations incluses) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Tests Vitest |
| `npm run db:migrate` | Nouvelle migration en développement |
| `npm run db:deploy` | Applique les migrations (production) |
| `npm run db:seed` | ADMIN initial (+ joueurs de démo avec `SEED_DEMO_PLAYERS`) |
| `npm run db:studio` | Explorateur Prisma |
