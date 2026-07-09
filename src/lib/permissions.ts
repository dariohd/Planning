import { prisma } from "./db";
import type { PersonnelRecord } from "./types";
import { fullName, toPersonnelRecord } from "./personnel";

const PEER_PERMISSIONS: Record<string, string[]> = {
  Qualité: ["Qualité", "Responsable Qualité"],
  "Responsable Preparateur": ["Préparateur", "Responsable Preparateur"],
  MFT: ["MFT"],
};

export async function getUserRole(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return user?.role ?? "Non Autorisé";
}

export function nameFromEmail(email: string): string {
  if (!email) return "";
  return email
    .split("@")[0]
    .split(".")
    .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
    .join(" ");
}

export async function ensureModificationAllowed(
  currentUserEmail: string,
  targetPersonnelId: string,
  allPersonnel?: PersonnelRecord[]
): Promise<void> {
  const userRole = await getUserRole(currentUserEmail);
  if (userRole === "Administrateur") return;
  if (userRole === "Lecteur") {
    throw new Error("Accès refusé. Vous disposez de droits en lecture seule.");
  }

  const personnel =
    allPersonnel ??
    (await prisma.personnel.findMany()).map((p) => toPersonnelRecord(p));

  const personToModify = personnel.find((p) => p.id === targetPersonnelId);
  if (!personToModify) throw new Error("Personnel cible introuvable.");

  const currentUserFullName = nameFromEmail(currentUserEmail);
  const currentUserAsManager = personnel.find(
    (p) => fullName(p) === currentUserFullName && p.role === userRole
  );

  if (!currentUserAsManager) {
    const peers = PEER_PERMISSIONS[userRole];
    if (peers?.includes(personToModify.role)) return;
  } else {
    if (
      personToModify.responsableHierarchique === currentUserAsManager.id ||
      personToModify.chefEquipeAssocie === currentUserAsManager.id
    ) {
      return;
    }
  }

  throw new Error(
    `Accès refusé. Un "${userRole}" ne peut pas modifier le profil de "${personToModify.role}".`
  );
}

export async function touchLastModified(): Promise<string> {
  const ts = Date.now().toString();
  await prisma.appMeta.upsert({
    where: { key: "lastModified" },
    create: { key: "lastModified", value: ts },
    update: { value: ts },
  });
  return ts;
}

export async function getLastModified(): Promise<string> {
  const meta = await prisma.appMeta.findUnique({ where: { key: "lastModified" } });
  return meta?.value ?? Date.now().toString();
}
