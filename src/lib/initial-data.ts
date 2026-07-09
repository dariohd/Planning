import { prisma } from "@/lib/db";
import { filterPersonnelByMode, fullName, toPersonnelRecord } from "@/lib/personnel";
import { getLastModified, nameFromEmail } from "@/lib/permissions";
import type { AppMode, InitialData } from "@/lib/types";

export async function getInitialData(
  email: string,
  mode: AppMode = "production"
): Promise<InitialData | { error: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const role = user?.role ?? "Non Autorisé";

  if (role === "Non Autorisé") {
    return { error: "Veuillez contacter un administrateur pour avoir accès." };
  }

  const rows = await prisma.personnel.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  const personnel = rows.map(toPersonnelRecord);
  const activePersonnel = personnel.filter((p) => p.statut !== "Archivé");
  const modePersonnel = filterPersonnelByMode(activePersonnel, mode);

  let chefsEquipe: { name: string; role: string }[] = [];
  if (mode === "support") {
    const managerRoles = ["RP", "Responsable Preparateur", "Responsable Qualité"];
    chefsEquipe = activePersonnel
      .filter((p) => managerRoles.includes(p.role))
      .map((p) => ({ name: fullName(p), role: p.role }));
  } else {
    const managerRoles = ["REAP", "Pilote"];
    chefsEquipe = activePersonnel
      .filter((p) => managerRoles.includes(p.role))
      .map((p) => ({ name: fullName(p), role: p.role }));
  }

  const rpList = activePersonnel
    .filter((p) => p.role === "RP")
    .map((p) => ({ id: p.id, name: fullName(p) }));

  const reapListForForm = activePersonnel
    .filter((p) => p.role === "REAP")
    .map((p) => ({ id: p.id, name: fullName(p) }));

  const respPrepList = activePersonnel
    .filter((p) => p.role === "Responsable Preparateur")
    .map((p) => ({ id: p.id, name: fullName(p) }));

  const respQualiteList = activePersonnel
    .filter((p) => p.role === "Responsable Qualité")
    .map((p) => ({ id: p.id, name: fullName(p) }));

  const config = await prisma.appConfig.findUnique({ where: { id: "default" } });
  const settings = {
    appName: (config?.data as { appName?: string })?.appName ?? "Planning Présence",
  };

  return {
    currentUser: {
      email,
      name: user?.name ?? nameFromEmail(email),
      role,
    },
    personnel: modePersonnel,
    chefsEquipe: chefsEquipe.sort((a, b) => a.name.localeCompare(b.name)),
    rpList: rpList.sort((a, b) => a.name.localeCompare(b.name)),
    reapListForForm: reapListForForm.sort((a, b) => a.name.localeCompare(b.name)),
    respPrepList: respPrepList.sort((a, b) => a.name.localeCompare(b.name)),
    respQualiteList: respQualiteList.sort((a, b) => a.name.localeCompare(b.name)),
    lastModified: await getLastModified(),
    settings,
  };
}
