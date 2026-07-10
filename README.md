# Planning Présence — Version Vercel

Migration du projet Google Apps Script vers **Next.js 16** + **PostgreSQL** + **Auth.js**, hébergé sur Vercel.

L'archive d'origine (GAS) est figée dans `../PlanningGS`.

**Production** : https://planning-dariohprojects.vercel.app

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Chart.js |
| Base de données | PostgreSQL via Prisma 7 (Neon) |
| Auth | Auth.js v5 — Google OAuth + compte démo |
| Hébergement | Vercel |

## Connexion

- **Google** : comptes autorisés en base (rôle assigné par un admin)
- **Compte démo** : identifiant/mot de passe sur `/login` (`DEMO_USERNAME` / `DEMO_PASSWORD`)
- **Dev local** : identifiant `admin@local.dev` ou `admin` (si `ALLOW_DEV_LOGIN=true`, hors production)

## Fonctionnalités

### Vue Équipe
- Planning **mensuel** (par défaut) ou **hebdomadaire**
- Filtres équipe REAP/RP, quart M/A/N/J, poste de travail
- Groupement par machine, tri nom/rôle
- Saisie des statuts avec éditeur complet (commentaire, HS, mission Mi)
- Modification groupée multi-personnes
- Impression HTML hebdomadaire (A4)
- Synchronisation automatique toutes les 30 s

### Vue Individuelle
- Liste avec recherche, filtre par rôle, archives
- Calendrier annuel 12 mois + compteurs CP / JRTT / Maladie / Formation
- Plages de dates pour saisie en masse
- Formulaire ajout/édition/suppression personnel (admin)
- Archivage et réactivation

### Indicateurs
- Graphiques présence, quarts, absences du mois
- Périodes jour / semaine / mois
- Comparaison hebdomadaire, effectifs par poste, hors production
- Modal détail KPI (liste des noms)

### Capa
- Vue semaine : effectifs M/A/N/J par poste vs objectif
- Vue année : 52 semaines, graphiques ETP / Capa / Réel (saisie admin)
- Objectifs et règles configurables (panneau admin)

### Mobile (`/mobile`)
- Modes Production et Support
- Consultation et saisie rapide (swipe gauche/droite)
- Filtres équipe et quart, onglets Stats / Capa / Année

### Administration
- Panneau Configuration : nom app, utilisateurs, objectifs Capa, postes, fériés FR/PT
- Génération annuelle des plannings
- Archive des plannings année N-1
- Seed automatique au build Vercel (197 collaborateurs depuis CSV legacy)

### Modes
- **Production** : Compagnons, Intérimaires, REAP, Pilote
- **Support** : RP, MFT, Préparateurs, Qualité, Apprentis

### i18n
- Interface FR / EN / PT (navigation, guide, paramètres principaux, mobile)

Guide utilisateur : [docs/GUIDE-UTILISATEUR.md](docs/GUIDE-UTILISATEUR.md)

## Démarrage local

### Option A — PostgreSQL local

```bash
cp .env.example .env
# Éditer DATABASE_URL, AUTH_SECRET, compte démo si besoin
npm install
npm run db:push
npm run setup:local
npm run dev
```

Ouvrir http://localhost:3000

### Option B — Base Neon / Vercel (recommandé si pas de Postgres local)

```bash
npx vercel link
npx vercel env pull .env.local
# Copier DATABASE_URL depuis .env.local vers .env (Prisma lit .env)
npm run db:push
npm run setup:local
npx vercel dev
```

`vercel dev` injecte les variables chiffrées du projet et permet de tester avec la base distante.

### Import des présences historiques (GAS)

Voir le guide détaillé : [docs/MIGRATION-DONNEES.md](docs/MIGRATION-DONNEES.md)

```bash
npm run import:presences -- chemin/vers/export.json
npm run post-migrate
npm run generate:year -- 2026
```

Formats acceptés : clés de dates `presences` (export GAS) ou `months` compact.

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur Next.js local |
| `npm run build` | Build production |
| `npm run setup:local` | Seed CSV + config + plannings année courante + comptes |
| `npm run db:push` | Applique le schéma Prisma |
| `npm run db:seed` | Import personnel uniquement |
| `npm run import:presences` | Import présences depuis export GAS |
| `npm run post-migrate` | Liaison compte démo + stats base |
| `npm run generate:year` | Génère plannings annuels (`-- 2026`) |

## Déploiement

Chaque push sur `main` redéploie. Le script `vercel-build` applique le schéma Prisma et seed si base vide.

Variables Vercel requises : `DATABASE_URL`, `AUTH_SECRET`, `DEMO_USERNAME`, `DEMO_PASSWORD`, `DEMO_USER_ROLE`.

`AUTH_URL` doit être l'URL de production exacte, sans caractère BOM en tête.

## Structure

```
src/app/          Routes et API
src/components/   UI desktop, mobile, shared
src/lib/          Logique métier (capa, indicateurs, plannings…)
prisma/           Schéma PostgreSQL
scripts/          setup-local, import-presences, post-migrate, vercel-build
docs/             Guides migration et utilisateur
_legacy-export/   Données d'origine GAS
```

## Archive GAS

Ne pas modifier `../PlanningGS`. Référence figée du projet Google Apps Script.
