import { PROD_ROLES, SUPPORT_ROLES } from "./constants";
import type { AppMode, PersonnelRecord } from "./types";

export function filterPersonnelByMode(personnel: PersonnelRecord[], mode: AppMode): PersonnelRecord[] {
  if (mode === "support") {
    return personnel.filter((p) => (SUPPORT_ROLES as readonly string[]).includes(p.role));
  }
  return personnel.filter((p) => (PROD_ROLES as readonly string[]).includes(p.role));
}

export function toPersonnelRecord(row: {
  id: string;
  matricule: string | null;
  nom: string;
  prenom: string;
  role: string;
  chefEquipeAssocie: string | null;
  section: string | null;
  typeQuart: string | null;
  quartDefaut: string | null;
  posteDeTravail: string | null;
  mftAssocie: string | null;
  responsableHierarchique: string | null;
  statut: string;
  tauxEfficacite: number;
}): PersonnelRecord {
  return { ...row };
}

export function fullName(p: Pick<PersonnelRecord, "prenom" | "nom">): string {
  return `${p.prenom} ${p.nom}`;
}
