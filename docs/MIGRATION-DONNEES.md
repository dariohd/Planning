# Migration des données GAS → Planning (Vercel)

## 1. Exporter les présences depuis Google Apps Script

Dans le projet Apps Script de l'archive `PlanningGS`, exécuter une fois la fonction `exportPresencesJson` :

```javascript
/**
 * À coller temporairement dans Code.gs puis exécuter depuis l'éditeur GAS.
 * Fichier > Télécharger > export-presences-2026.json
 */
function exportPresencesJson(year) {
  year = year || new Date().getFullYear();
  const personnel = getPersonnel();
  const out = [];
  personnel.forEach(function (p) {
    const presences = getPresencesForYear(p.id, year);
    if (!presences || presences.error) return;
    const keys = Object.keys(presences);
    if (keys.length === 0) return;
    out.push({
      personnelId: p.id,
      matricule: p.matricule || null,
      nom: p.nom,
      prenom: p.prenom,
      year: year,
      presences: presences,
    });
  });
  Logger.log(JSON.stringify(out).substring(0, 500) + '...');
  return out;
}
```

Dans l'éditeur : **Exécuter** `exportPresencesJson(2026)` (ou l'année voulue), puis récupérer le JSON via les logs ou Drive.

Formats acceptés par l'import Next.js :

```json
[
  {
    "personnelId": "uuid-gas",
    "matricule": "ZIMS36",
    "year": 2026,
    "presences": {
      "2026-01-06": { "s": "M", "c": "commentaire", "hs": "2", "loc": "DRA718" }
    }
  }
]
```

Format legacy compact (toujours supporté) :

```json
[{ "personnelId": "...", "year": 2026, "months": { "1": { "6": "M" } } }]
```

## 2. Importer en base Neon / locale

```bash
# Variables DATABASE_URL pointant vers la cible (prod ou local)
npx vercel env pull .env.local   # optionnel
# Copier DATABASE_URL dans .env

npm run import:presences -- chemin/vers/export-presences.json
```

Options :

- `--dry-run` : compte les lignes sans écrire
- `--year=2026` : filtre une année
- Les IDs GAS sont remappés automatiquement via `matricule`, sinon `nom+prenom`

## 3. Scripts post-migration

```bash
npm run setup:local      # seed personnel + plannings année courante (local)
npm run post-migrate       # lie compte démo + vérifie effectifs
npm run generate:year      # régénère plannings pour une année (si absents)
```

## 4. Compte démo (test)

Variables Vercel :

| Variable | Valeur recommandée |
|----------|-------------------|
| `DEMO_USERNAME` | identifiant de test |
| `DEMO_PASSWORD` | (secret, jamais dans le repo) |
| `DEMO_USER_ROLE` | `Administrateur` pour un compte de test partagé |

Pour un REAP métier réel : rôle `REAP` + `DEMO_PERSONNEL_NAME` ou `DEMO_PERSONNEL_ID` pointant vers une fiche existante.

## 5. Capa réelle

Dans l'app : **Capa → Année → Saisie production réelle** (admin).

Ou via API `POST /api/capa/reel` avec `{ year, week, poste, value }`.

## 6. Vérification

1. Login démo ou Google
2. Vue Équipe : plannings visibles sur l'année importée
3. Vue Individuelle : compteurs CP / Maladie cohérents
4. Indicateurs : taux de présence > 0 un jour ouvré
