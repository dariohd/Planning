import { DISPLAY_POSTES, PRESENT_STATUSES } from "./constants";
import { prisma } from "./db";
import { filterPersonnelByMode, toPersonnelRecord } from "./personnel";
import { getPresencesForRange } from "./presences";
import { getMondayOfWeek } from "./shifts";
import type { AppMode } from "./types";

export async function getCapaDashboardData(mode: AppMode, year: number, weekStart?: string) {
  const monday = weekStart ?? getMondayOfWeek();
  const endDate = new Date(`${monday}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const endIso = endDate.toISOString().slice(0, 10);

  const rows = await prisma.personnel.findMany();
  const personnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const presences = await getPresencesForRange(
    personnel.map((p) => p.id),
    monday,
    endIso
  );

  const config = await prisma.appConfig.findUnique({ where: { id: "default" } });
  const manualTargets = (config?.data as { manualTargets?: Record<string, number> })?.manualTargets ?? {};

  const byPoste: Record<string, { M: number; A: number; N: number; J: number; total: number; target: number }> = {};

  for (const poste of DISPLAY_POSTES) {
    byPoste[poste] = { M: 0, A: 0, N: 0, J: 0, total: 0, target: manualTargets[poste] ?? 0 };
  }

  for (const person of personnel) {
    const poste = person.posteDeTravail?.split(",")[0]?.trim();
    if (!poste || !byPoste[poste]) continue;

    const personPresences = presences[person.id] ?? {};
    for (const dk of Object.keys(personPresences)) {
      const status = personPresences[dk]?.s;
      if (!status || !PRESENT_STATUSES.includes(status as (typeof PRESENT_STATUSES)[number])) continue;
      if (status === "M" || status === "A" || status === "N" || status === "J") {
        byPoste[poste][status]++;
        byPoste[poste].total++;
      }
    }
  }

  return { year, weekStart: monday, weekEnd: endIso, postes: byPoste };
}
