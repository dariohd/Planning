import { describe, expect, it } from "vitest";
import { canModifyPerson, canUserEdit, isAdministrator } from "./client-permissions";
import type { PersonnelRecord } from "./types";

const reap: PersonnelRecord = {
  id: "reap-1",
  matricule: "1",
  nom: "Martin",
  prenom: "Jean",
  role: "REAP",
  chefEquipeAssocie: null,
  responsableHierarchique: null,
  section: "ZIMS36",
  typeQuart: "2*8",
  quartDefaut: "M",
  posteDeTravail: "DRA718",
  mftAssocie: null,
  statut: "Actif",
  tauxEfficacite: 1,
};

const inTeam: PersonnelRecord = {
  ...reap,
  id: "p-1",
  nom: "Dupont",
  prenom: "Alice",
  role: "Compagnon",
  chefEquipeAssocie: "reap-1",
};

const otherTeam: PersonnelRecord = {
  ...inTeam,
  id: "p-2",
  nom: "Durand",
  prenom: "Bob",
  chefEquipeAssocie: "reap-2",
};

const all = [reap, inTeam, otherTeam];

describe("canUserEdit", () => {
  it("refuse lecteur", () => {
    expect(canUserEdit("Lecteur")).toBe(false);
    expect(canUserEdit("REAP")).toBe(true);
  });
});

describe("isAdministrator", () => {
  it("détecte admin", () => {
    expect(isAdministrator("Administrateur")).toBe(true);
    expect(isAdministrator("REAP")).toBe(false);
  });
});

describe("canModifyPerson REAP", () => {
  it("autorise admin", () => {
    expect(canModifyPerson("Administrateur", null, null, inTeam, all)).toBe(true);
  });

  it("autorise REAP sur son équipe via personnelId", () => {
    expect(canModifyPerson("REAP", null, "reap-1", inTeam, all)).toBe(true);
  });

  it("refuse REAP hors équipe", () => {
    expect(canModifyPerson("REAP", null, "reap-1", otherTeam, all)).toBe(false);
  });

  it("refuse REAP sans lien sur tout le monde", () => {
    expect(canModifyPerson("REAP", "tristanmenager", null, inTeam, all)).toBe(false);
  });
});
