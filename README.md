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

1. Créer un projet Vercel lié à ce dépôt
2. Ajouter les variables d'environnement :
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (production)
3. Build command (recommandé) :

```bash
prisma generate && prisma db push && next build
```

Ou utiliser `prisma migrate deploy` si vous versionnez les migrations.

4. Après le premier déploiement, exécuter le seed (localement pointé vers la DB prod, ou via script CI) :

```bash
npm run db:seed
```

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
