# Planning Présence — Version Vercel

Migration du projet Google Apps Script vers **Next.js 16** + **PostgreSQL** + **Auth.js**, hébergé sur Vercel.

L'archive d'origine (GAS) est figée dans `../PlanningGS`.

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Base de données | PostgreSQL via Prisma 7 |
| Auth | Auth.js (NextAuth v5) — Google + login dev |
| Hébergement | Vercel |

## Démarrage local

### 1. Variables d'environnement

```bash
cp .env.example .env
```

Configurer `DATABASE_URL` (Neon recommandé : [neon.tech](https://neon.tech)) et `AUTH_SECRET`.

### 2. Base de données

```bash
npm install
npm run db:push
npm run db:seed
```

### 3. Lancer l'app

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). En dev, utiliser **Connexion dev (admin)** sur `/login`.

## Déploiement Vercel

Projet lié : [github.com/dariohd/Planning](https://github.com/dariohd/Planning)

### 1. Base PostgreSQL

Dans Vercel : **Storage** → créer une base Postgres (Neon) ou lier une base existante.
Vercel injecte automatiquement `DATABASE_URL` (ou `POSTGRES_URL` — dans ce cas, créer une variable `DATABASE_URL` qui pointe vers la même valeur).

### 2. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Oui | Connection string PostgreSQL (`?sslmode=require`) |
| `AUTH_SECRET` | Oui | Secret aléatoire (`openssl rand -base64 32`) |
| `AUTH_URL` | Oui | URL prod, ex. `https://planning-xxx.vercel.app` |
| `GOOGLE_CLIENT_ID` | Oui (prod) | OAuth Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Oui (prod) | OAuth Google Cloud |
| `SEED_SECRET` | Recommandé | Secret one-shot pour importer le personnel en prod |

Ne pas activer `ALLOW_DEV_LOGIN` en production.

### 3. Google OAuth

Dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials), ajouter l'URI de redirection :

```
https://VOTRE-DOMAINE.vercel.app/api/auth/callback/google
```

### 4. Déployer

Chaque push sur `main` redéploie. Le script `vercel-build` crée le schéma Prisma automatiquement (`db push`).

### 5. Importer le personnel (une fois)

En local, avec la `DATABASE_URL` de prod :

```bash
npm run db:seed
```

Ou en prod via l'API (une fois `SEED_SECRET` configuré) :

```bash
curl -X POST https://VOTRE-DOMAINE.vercel.app/api/admin/seed -H "x-seed-secret: VOTRE_SECRET"
```

### 6. Premier utilisateur admin

Après connexion Google, l'utilisateur est créé avec le rôle `Non Autorisé`. Mettre à jour en base :

```sql
UPDATE "User" SET role = 'Administrateur' WHERE email = 'votre@email.com';
```

Ou exécuter le seed qui crée `admin@local.dev` (utile seulement avec login dev).

## Fonctionnalités migrées

- Authentification et rôles utilisateurs
- Référentiel personnel (import CSV)
- Vue équipe hebdomadaire avec filtres REAP / quart
- Vue individuelle (calendrier mensuel, saisie des statuts)
- Interface mobile simplifiée (`/mobile`)
- Calcul automatique des quarts (2×8, 3×8, 9×10, journée)
- Permissions de modification par rôle

## À venir (hors scope initial)

- Module indicateurs / graphiques
- Module capacité (Capa) avec spreadsheet externe
- Impression PDF hebdomadaire
- Génération annuelle batch
- i18n EN/PT complet

## Structure

```
src/
  app/           # Routes et API
  components/    # UI partagée
  lib/           # Logique métier (shifts, team, permissions...)
  generated/     # Client Prisma (généré)
prisma/          # Schéma DB
scripts/seed.ts  # Import CSV personnel
_legacy-export/  # Fichiers txt/csv d'origine (référence)
```

## Archive GAS

Ne pas modifier `../PlanningGS`. C'est la version Google Apps Script de référence.
