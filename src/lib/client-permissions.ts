import type { PersonnelRecord } from "./types";
import { fullName } from "./personnel";

const PEER_PERMISSIONS: Record<string, string[]> = {
  Qualité: ["Qualité", "Responsable Qualité"],
  "Responsable Preparateur": ["Préparateur", "Responsable Preparateur"],
  MFT: ["MFT"],
};

const TEAM_MEMBER_ROLES = ["Compagnon", "Intérimaire", "Apprenti Atelier", "Pilote"];

export function canUserEdit(role: string): boolean {
  return role !== "Lecteur" && role !== "Non Autorisé";
}

export function isAdministrator(role: string): boolean {
  return role === "Administrateur";
}

export function canModifyPerson(
  userRole: string,
  userName: string | null | undefined,
  userPersonnelId: string | null | undefined,
  target: PersonnelRecord,
  allPersonnel: PersonnelRecord[]
): boolean {
  if (userRole === "Administrateur") return true;
  if (!canUserEdit(userRole)) return false;

  if (userPersonnelId) {
    const manager = allPersonnel.find((p) => p.id === userPersonnelId);
    if (manager) {
      if (
        target.chefEquipeAssocie === manager.id ||
        target.responsableHierarchique === manager.id
      ) {
        return true;
      }
      if (manager.role === "Pilote" && target.section === manager.section) return true;
    }
  }

  const displayName = (userName ?? "").trim();
  const manager = allPersonnel.find(
    (p) =>
      p.role === userRole &&
      displayName &&
      fullName(p).toLowerCase() === displayName.toLowerCase()
  );

  if (manager) {
    if (target.chefEquipeAssocie === manager.id || target.responsableHierarchique === manager.id) {
      return true;
    }
    if (manager.role === "Pilote" && target.section === manager.section) return true;
  }

  const peers = PEER_PERMISSIONS[userRole];
  if (peers?.includes(target.role)) return true;

  if (userRole === "REAP" && TEAM_MEMBER_ROLES.includes(target.role)) {
    return true;
  }

  return false;
}
