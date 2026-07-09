# Planning Présence — Version Vercel

Migration du projet Google Apps Script vers **Next.js 16** + **PostgreSQL** + **Auth.js**, hébergé sur Vercel.

L'archive d'origine (GAS) est figée dans `../PlanningGS`.

**Production** : https://planning-black-xi.vercel.app

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
- **Compte démo** : identifiant/mot de passe sur `/login` (variables `DEMO_USERNAME` / `DEMO_PASSWORD` sur Vercel)

## Fonctionnalités

### Vue Équipe
- Planning **mensuel** (par défaut) ou **hebdomadaire**
- Filtres équipe REAP/RP, quart M/A/N/J
- Saisie des statuts avec éditeur complet (commentaire, HS, mission Mi)
- Modification groupée multi-personnes
- Impression HTML hebdomadaire (A4)
- Synchronisation automatique toutes les 30 s

### Vue Individuelle
- Liste avec recherche, filtre par rôle, archives
- Calendrier mensuel + plages de dates
- Formulaire ajout/édition personnel (admin)
- Archivage et réactivation

### Indicateurs
- Graphiques présence, quarts, absences du mois
- Périodes jour / semaine / mois

### Capa
- Capacité par poste (DRA718, DRA716, DRA715, DRA714)
- Objectifs configurables (panneau admin)

### Mobile (`/mobile`)
- Consultation et saisie rapide des statuts (swipe par toucher)
- Filtres équipe et quart

### Administration
- Panneau Configuration : nom app, rôles utilisateurs, objectifs Capa
- Génération annuelle des plannings (jours fériés FR exclus)
- Seed automatique au build Vercel (197 collaborateurs)

### Modes
- **Production** : Compagnons, Intérimaires, REAP, Pilote
- **Support** : RP, MFT, Préparateurs, Qualité, Apprentis

### i18n
- Interface FR / EN / PT (navigation et libellés principaux)

## Démarrage local

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Déploiement

Chaque push sur `main` redéploie. Le script `vercel-build` applique le schéma Prisma et seed si base vide.

Variables Vercel requises : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `DEMO_USERNAME`, `DEMO_PASSWORD`, `DEMO_USER_ROLE`.

## Structure

```
src/app/          Routes et API
src/components/   UI (desktop, shared)
src/lib/          Logique métier
prisma/           Schéma PostgreSQL
scripts/          Build Vercel, seed CSV
_legacy-export/   Données d'origine GAS
```

## Archive GAS

Ne pas modifier `../PlanningGS`. Référence figée du projet Google Apps Script.
