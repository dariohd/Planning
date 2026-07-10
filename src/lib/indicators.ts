import { prisma } from "./db";
import { getActiveSectors } from "./app-config";
import { PRESENT_STATUSES } from "./constants";
import { filterPersonnelByMode, fullName, toPersonnelRecord } from "./personnel";
import { getPresencesForRange } from "./presences";
import { getTeamMembersFromSelections, parseTeamSelections } from "./team";
import type { AppMode } from "./types";

const ABSENCE_STATUSES = ["Ma", "LMa", "CP", "4HCP", "Abs", "F", "4HF", "RF", "JRTT", "CET", "D", "P", "S", "Z", "Ecole", "Mi"];

type PeriodStats = Record<string, string[]>;

function emptyStats(): PeriodStats {
  return {
    presence: [],
    M: [],
    A: [],
    N: [],
    J: [],
    Ma: [],
    LMa: [],
    CP: [],
    Abs: [],
    F: [],
    RF: [],
    P: [],
    Z: [],
    S: [],
    Mi: [],
  };
}

export async function getIndicatorsData(
  mode: AppMode,
  selectedDateStr: string,
  teamSelection: string
) {
  const referenceDate = new Date(`${selectedDateStr}T12:00:00Z`);
  const rows = await prisma.personnel.findMany();
  const rawPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const presencesByPerson = await getPresencesForRange(
    rawPersonnel.map((p) => p.id),
    `${referenceDate.getUTCFullYear()}-01-01`,
    `${referenceDate.getUTCFullYear()}-12-31`
  );

  const sectorsConfig = await getActiveSectors();

  const teamMembers = getTeamMembersFromSelections(
    parseTeamSelections(teamSelection),
    referenceDate,
    rawPersonnel,
    presencesByPerson,
    null,
    sectorsConfig
  );

  const group1Roles =
    mode === "support"
      ? ["RP", "REAP", "MFT", "Responsable Preparateur", "Responsable Qualité"]
      : ["Compagnon", "Pilote"];
  const group2Roles = mode === "support" ? ["Apprenti", "Préparateur", "Qualité"] : ["Intérimaire"];

  const labels =
    mode === "support"
      ? { group1: "Encadrement", group2: "Support & Apprentis" }
      : { group1: "Compagnons", group2: "Intérimaires" };

  const compagnons = { daily: emptyStats(), weekly: emptyStats(), monthly: emptyStats() };
  const interimaires = { daily: emptyStats(), weekly: emptyStats(), monthly: emptyStats() };

  const y = referenceDate.getUTCFullYear();
  const m = referenceDate.getUTCMonth();
  const dateKey = selectedDateStr;

  const dayOfWeek = referenceDate.getUTCDay();
  const weekStart = new Date(referenceDate);
  weekStart.setUTCDate(referenceDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  const monthlyAbsenceBreakdown: Record<string, number> = {};

  for (const person of teamMembers) {
    const name = fullName(person);
    const group = group1Roles.includes(person.role) ? compagnons : group2Roles.includes(person.role) ? interimaires : null;
    if (!group) continue;

    const presences = presencesByPerson[person.id] ?? {};

    for (const [dk, data] of Object.entries(presences)) {
      const status = data.s;
      if (!status) continue;
      const pd = new Date(`${dk}T12:00:00Z`);

      const push = (period: PeriodStats) => {
        if (PRESENT_STATUSES.includes(status as (typeof PRESENT_STATUSES)[number])) {
          period.presence.push(name);
          if (period[status]) period[status].push(name);
        } else if (period[status]) {
          period[status].push(name);
        }
      };

      if (dk === dateKey) push(group.daily);
      if (pd >= weekStart && pd <= weekEnd) push(group.weekly);
      if (pd.getUTCFullYear() === y && pd.getUTCMonth() === m) {
        push(group.monthly);
        if (ABSENCE_STATUSES.includes(status)) {
          monthlyAbsenceBreakdown[status] = (monthlyAbsenceBreakdown[status] ?? 0) + 1;
        }
      }
    }
  }

  return {
    compagnons,
    interimaires,
    labels,
    monthlyAbsenceBreakdown,
    weekBoundaries: {
      start: weekStart.toISOString().slice(0, 10),
      end: weekEnd.toISOString().slice(0, 10),
    },
    workforceTotals: {
      compagnons: teamMembers.filter((p) => group1Roles.includes(p.role)).length,
      interimaires: teamMembers.filter((p) => group2Roles.includes(p.role)).length,
      total: teamMembers.length,
    },
    horsProd: {
      daily:
        (compagnons.daily.P?.length ?? 0) +
        (compagnons.daily.Z?.length ?? 0) +
        (compagnons.daily.S?.length ?? 0) +
        (interimaires.daily.P?.length ?? 0) +
        (interimaires.daily.Z?.length ?? 0) +
        (interimaires.daily.S?.length ?? 0),
      weekly:
        (compagnons.weekly.P?.length ?? 0) +
        (compagnons.weekly.Z?.length ?? 0) +
        (compagnons.weekly.S?.length ?? 0) +
        (interimaires.weekly.P?.length ?? 0) +
        (interimaires.weekly.Z?.length ?? 0) +
        (interimaires.weekly.S?.length ?? 0),
    },
  };
}
