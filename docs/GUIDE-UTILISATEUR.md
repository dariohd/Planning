# Guide utilisateur — Planning Présence

**URL officielle :** https://planning-black-xi.vercel.app/login

---

## Connexion

L'administrateur vous communique identifiant et mot de passe, ou vous utilisez Google si votre email est autorisé.

---

## Compte app vs fiche personnel

Deux notions distinctes :

| | **Compte app** (`User`) | **Fiche personnel** (`Personnel`) |
|---|-------------------------|-----------------------------------|
| Sert à | Se connecter, droits globaux | Exister dans le planning, hiérarchie |
| Exemples de rôles | Administrateur, Lecteur, REAP (connexion) | REAP, Compagnon, RP, Pilote… |
| Où gérer | Paramètres → **Accès** | Individuelle → **+ Personne** |
| Obligatoire pour admin test | Oui | Non |

Un **Administrateur** n'a pas besoin d'être dans les 197 collaborateurs : il gère tout via l'interface.

Un **REAP métier** (chef d'équipe terrain) a besoin des **deux** : compte de connexion REAP + fiche REAP liée (`personnelId`).

---

## Matrice des rôles (compte app)

| Rôle | Planning | Paramètres | Personnel | Exports / données |
|------|----------|------------|-----------|-------------------|
| **Administrateur** | Tout modifier, toutes équipes | Complet | Ajout / édition / archive | Oui |
| **REAP** (avec fiche liée) | Son équipe uniquement | Non | Non | Non |
| **Lecteur** | Consultation | Non | Non | Non |
| **Non Autorisé** | Accès refusé | Non | Non | Non |

---

## Principe métier

Application **autonome** : les plannings de l'année en cours sont **générés automatiquement** (quarts, jours fériés). Vous complétez et corrigez les présences **au fil de l'eau** (CP, maladie, absences, etc.).

---

## Vue Équipe (quotidien)

1. Filtre **équipe** en haut à gauche : sélectionnez le périmètre (admin : toutes les équipes).
2. Bascule **Mois** / **Semaine**.
3. **Cliquez sur une cellule** pour modifier le statut.
4. **Modification groupée** : statut sur plusieurs personnes et dates.
5. **Imprimer** : vue semaine.

### Statuts courants

| Code | Signification |
|------|----------------|
| M / A / N / J | Matin, Après-midi, Nuit, Jour |
| CP | Congés payés |
| JRTT | RTT |
| Ma | Maladie |
| Abs | Absence |
| F | Formation |
| P | Présent |

---

## Vue Individuelle

1. Sélectionnez un collaborateur.
2. Calendrier : clic sur un jour pour éditer.
3. **Compteurs** : CP, JRTT, maladie, formation.
4. **Appliquer une plage** : saisie sur plusieurs jours.
5. **+ Personne** (admin) : ajouter un collaborateur, définir son rôle métier (REAP, Compagnon…), REAP associé, quart, poste.

---

## Administration (compte Administrateur)

Bouton **Paramètres** dans l'en-tête :

| Onglet | Contenu |
|--------|---------|
| Général | Nom app, fériés FR/PT, secteurs |
| **Accès** | Comptes de connexion et rôles app |
| Capa | Objectifs par poste |
| Postes | Liste des postes et missions |
| Données | Export / import CSV, sauvegarde |
| Actions | Génération annuelle, archive, export personnel |

---

## Mobile

Bouton **Mobile** : version téléphone, installable (PWA). Saisie rapide par swipe ou clic sur une cellule.

---

## Aide intégrée

- **Guide** (en-tête) : mode d'emploi selon le rôle.
- **Assistant** (bulle en bas à droite) : FAQ.
- Bandeau **Premiers pas** au premier login (masquable).

---

## Checklist de test (15 min)

À faire à deux (admin + testeur) après chaque déploiement important :

- [ ] Connexion (démo ou Google)
- [ ] Vue Équipe : filtre équipe, clic cellule, changement statut, annulation toast si erreur
- [ ] Modification groupée sur 2 personnes / 3 jours
- [ ] Vue Individuelle : compteurs, plage de dates
- [ ] Mobile : consultation + une saisie
- [ ] Paramètres → export CSV personnel
- [ ] Paramètres → Accès : ajouter un lecteur test, puis le supprimer ou le laisser
- [ ] Déconnexion / reconnexion

---

## Bonnes pratiques

1. Vérifiez le filtre équipe avant une modification groupée.
2. Utilisez **Annuler** dans le bandeau notification (12 s) en cas d'erreur.
3. Plage de congés : vue Individuelle → Appliquer une plage.
4. Sauvegardez régulièrement via Paramètres → Données → export CSV.

---

## Support

Contact administrateur : darioh@tuta.io
