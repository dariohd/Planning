import { prisma } from "./db";
import { PRESENT_STATUSES } from "./constants";
import { getAppConfig, getActiveSectors } from "./app-config";
import { fetchAdeccTargets } from "./adecc";
import { filterPersonnelByMode, fullName, toPersonnelRecord } from "./personnel";
import { getPresencesForRange } from "./presences";
import { getTeamMembersFromSelections, parseTeamSelections } from "./team";
import { getMondayOfWeek, getWeekDates } from "./shifts";
import type { AppMode } from "./types";

const DHT_VALUES: Record<string, number> = { M: 80, A: 80, J: 77.5, N: 66, "4HCP": 40, "4HF": 40 };

function isoWeekNumber(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type ShiftBucket = { base: number; hs: number };

function emptyWeekBuckets(): Record<string, ShiftBucket> {
  return { M: { base: 0, hs: 0 }, A: { base: 0, hs: 0 }, N: { base: 0, hs: 0 }, J: { base: 0, hs: 0 } };
}

function parseHsTenths(hs?: string | null): number {
  if (!hs) return 0;
  const n = Number(hs.replace(",", "."));
  return Number.isFinite(n) ? n * 10 : 0;
}

export async function getCapaWeeklyData(mode: AppMode, year: number, weekStart?: string) {
  const monday = weekStart ?? getMondayOfWeek();
  const endDate = new Date(`${monday}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const endIso = endDate.toISOString().slice(0, 10);

  const config = await getAppConfig();
  const postes = config.workstations.length ? config.workstations : ["DRA718", "DRA716", "DRA715", "DRA714"];

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

  const byPoste: Record<string, { M: number; A: number; N: number; J: number; total: number; target: number }> = {};
  for (const poste of postes) {
    byPoste[poste] = { M: 0, A: 0, N: 0, J: 0, total: 0, target: config.manualTargets[poste] ?? 0 };
  }

  for (const person of personnel) {
    const poste = person.posteDeTravail?.split(",")[0]?.trim();
    if (!poste || !byPoste[poste]) continue;
    const personPresences = presences[person.id] ?? {};
    const eff = (person.tauxEfficacite ?? 100) / 100;
    for (const dk of Object.keys(personPresences)) {
      const status = personPresences[dk]?.s;
      if (!status || !PRESENT_STATUSES.includes(status as (typeof PRESENT_STATUSES)[number])) continue;
      if (status === "M" || status === "A" || status === "N" || status === "J") {
        byPoste[poste][status] += eff;
        byPoste[poste].total += eff;
      }
    }
  }

  return { year, weekStart: monday, weekEnd: endIso, postes: byPoste };
}

export async function getCapaAnnualDashboard(mode: AppMode, year: number) {
  const config = await getAppConfig();
  const postes = config.workstations.length ? config.workstations : ["DRA718", "DRA716", "DRA715", "DRA714"];
  const rows = await prisma.personnel.findMany();
  const personnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const presences = await getPresencesForRange(
    personnel.map((p) => p.id),
    `${year}-01-01`,
    `${year}-12-31`
  );

  const reelRows = await prisma.capaReel.findMany({ where: { year } });
  const reelMap: Record<string, Record<number, number | null>> = {};
  for (const r of reelRows) {
    if (!reelMap[r.poste]) reelMap[r.poste] = {};
    reelMap[r.poste][r.week] = r.value;
  }

  const staffing: Record<string, Record<number, ReturnType<typeof emptyWeekBuckets>>> = {};
  for (const poste of postes) staffing[poste] = {};

  for (const person of personnel) {
    if (!person.posteDeTravail) continue;
    const personPostes = person.posteDeTravail.split(",").map((s) => s.trim());
    const matchedGroups: { key: string; weight: number }[] = [];

    for (const groupKey of postes) {
      const rule = config.capaRules[groupKey] ?? {};
      const included = (rule.includedStations ?? groupKey).split(",").map((s) => s.trim());
      const matchCount = personPostes.filter((p) => included.includes(p)).length;
      if (matchCount > 0) {
        matchedGroups.push({
          key: groupKey,
          weight: (matchCount / personPostes.length) * ((person.tauxEfficacite ?? 100) / 100),
        });
      }
    }
    if (!matchedGroups.length) continue;

    const personPresences = presences[person.id] ?? {};
    for (const [dateKey, data] of Object.entries(personPresences)) {
      const status = data.s;
      if (!status) continue;
      const week = isoWeekNumber(dateKey);
      if (week < 1 || week > 53) continue;
      const dht = DHT_VALUES[status] ?? 0;
      const hs = parseHsTenths(data.hs);

      for (const group of matchedGroups) {
        if (!staffing[group.key][week]) staffing[group.key][week] = emptyWeekBuckets();
        const bucket = staffing[group.key][week];
        if (status === "M" || status === "A" || status === "N" || status === "J") {
          bucket[status].base += dht * group.weight;
          if (hs > 0) bucket[status].hs += hs * group.weight;
        }
      }
    }
  }

  const dashboard: Record<
    string,
    {
      weeks: number[];
      targets: number[];
      reels: (number | null)[];
      etp: number[];
      capa: number[];
    }
  > = {};

  const adeccAll = config.targetMode === "auto" ? await fetchAdeccTargets(year, postes, config.capaRules) : null;

  for (const poste of postes) {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    const targets: number[] = [];
    const reels: (number | null)[] = [];
    const etp: number[] = [];
    const capa: number[] = [];
    const adeccTargets = adeccAll?.[poste] ?? null;

    for (const w of weeks) {
      const weekData = staffing[poste][w] ?? emptyWeekBuckets();
      const target =
        adeccTargets?.[w] ??
        config.weeklyTargets[poste]?.[String(w)] ??
        config.manualTargets[poste] ??
        0;
      targets.push(target);
      reels.push(reelMap[poste]?.[w] ?? null);

      const etpBase =
        weekData.M.base / 80 / 5 +
        weekData.A.base / 80 / 5 +
        weekData.N.base / 66 / 5 +
        weekData.J.base / 80 / 5;
      const etpHs =
        weekData.M.hs / 80 / 5 +
        weekData.A.hs / 80 / 5 +
        weekData.N.hs / 66 / 5 +
        weekData.J.hs / 80 / 5;
      const totalEtp = etpBase + etpHs;
      etp.push(Math.round(totalEtp * 100) / 100);

      const rule = config.capaRules[poste] ?? {};
      const prodTime = rule.prodTime ?? 10;
      const capaVal = rule.calcMode === "reel" ? totalEtp / prodTime : totalEtp;
      capa.push(Math.round(capaVal * 100) / 100);
    }

    dashboard[poste] = { weeks, targets, reels, etp, capa };
  }

  const kpis = computeCapaKpis(dashboard);
  return { year, postes: dashboard, kpis };
}

function computeCapaKpis(dashboard: Record<string, { weeks: number[]; targets: number[]; capa: number[]; reels: (number | null)[] }>) {
  let totalCoverage = 0;
  let coverageCount = 0;
  let criticalWeeks = 0;
  let okWeeks = 0;

  for (const poste of Object.values(dashboard)) {
    for (let i = 0; i < poste.weeks.length; i++) {
      const target = poste.targets[i] ?? 0;
      const capaVal = poste.capa[i] ?? 0;
      if (target <= 0) continue;
      const pct = (capaVal / target) * 100;
      totalCoverage += pct;
      coverageCount++;
      if (pct < 80) criticalWeeks++;
      if (pct >= 100) okWeeks++;
    }
  }

  return {
    coverage: coverageCount > 0 ? Math.round(totalCoverage / coverageCount) : 0,
    criticalWeeks,
    okWeeks,
  };
}

export async function getCapaAnnualDashboardWithWindow(mode: AppMode, year: number, windowWeeks?: number) {
  const full = await getCapaAnnualDashboard(mode, year);
  if (!windowWeeks || windowWeeks >= 52) return full;

  const currentWeek = isoWeekNumber(new Date().toISOString().slice(0, 10));
  const start = Math.max(1, currentWeek - Math.floor(windowWeeks / 2));
  const end = Math.min(52, start + windowWeeks - 1);

  const postes: typeof full.postes = {};
  for (const [poste, data] of Object.entries(full.postes)) {
    const slice = data.weeks.map((w, i) => ({ w, i })).filter(({ w }) => w >= start && w <= end);
    postes[poste] = {
      weeks: slice.map((s) => s.w),
      targets: slice.map((s) => data.targets[s.i]),
      reels: slice.map((s) => data.reels[s.i]),
      etp: slice.map((s) => data.etp[s.i]),
      capa: slice.map((s) => data.capa[s.i]),
    };
  }
  return { ...full, postes, window: { start, end, weeks: windowWeeks } };
}

export async function getCapaDashboardData(mode: AppMode, year: number, weekStart?: string, annual?: boolean, windowWeeks?: number) {
  if (annual) {
    if (windowWeeks && windowWeeks < 52) return getCapaAnnualDashboardWithWindow(mode, year, windowWeeks);
    return getCapaAnnualDashboard(mode, year);
  }
  return getCapaWeeklyData(mode, year, weekStart);
}

export async function saveCapaReel(year: number, week: number, poste: string, value: number | null) {
  if (value === null) {
    await prisma.capaReel.deleteMany({ where: { year, week, poste } });
    return;
  }
  await prisma.capaReel.upsert({
    where: { year_week_poste: { year, week, poste } },
    create: { year, week, poste, value },
    update: { value },
  });
}

export async function getWeeklyComparison(mode: AppMode, selectedDateStr: string, teamSelection: string) {
  const referenceDate = new Date(`${selectedDateStr}T12:00:00Z`);
  const dayOfWeek = referenceDate.getUTCDay();
  const weekStartDate = new Date(referenceDate);
  weekStartDate.setUTCDate(referenceDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const weekDates = getWeekDates(weekStart);

  const rows = await prisma.personnel.findMany();
  const allPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const presencesByPerson = await getPresencesForRange(
    allPersonnel.map((p) => p.id),
    weekDates[0],
    weekDates[6]
  );

  const sectorsConfig = await getActiveSectors();

  const teamMembers = getTeamMembersFromSelections(
    parseTeamSelections(teamSelection),
    referenceDate,
    allPersonnel,
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

  type DayRow = Record<string, string[]>;
  const emptyDay = (): DayRow => ({
    presence: [],
    Mi: [],
    Ma: [],
    LMa: [],
    CP: [],
    Abs: [],
    F: [],
    RF: [],
  });

  const weeklyStats: Record<string, { group1: DayRow; group2: DayRow }> = {};
  for (const d of weekDates) {
    weeklyStats[d] = { group1: emptyDay(), group2: emptyDay() };
  }

  for (const person of teamMembers) {
    const name = fullName(person);
    const groupKey = group1Roles.includes(person.role) ? "group1" : group2Roles.includes(person.role) ? "group2" : null;
    if (!groupKey) continue;
    const presences = presencesByPerson[person.id] ?? {};

    for (const dateKey of weekDates) {
      const status = presences[dateKey]?.s;
      if (!status) continue;
      const target = weeklyStats[dateKey][groupKey];
      if (PRESENT_STATUSES.includes(status as (typeof PRESENT_STATUSES)[number])) {
        target.presence.push(name);
      } else if (target[status]) {
        target[status].push(name);
      }
    }
  }

  return { weekDates, labels, weeklyStats };
}

export async function getWorkstationHeadcount(
  mode: AppMode,
  teamSelection: string,
  dateStr: string
) {
  const referenceDate = new Date(`${dateStr}T12:00:00Z`);
  const rows = await prisma.personnel.findMany();
  const allPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );
  const presencesByPerson = await getPresencesForRange(
    allPersonnel.map((p) => p.id),
    dateStr,
    dateStr
  );
  const sectorsConfig = await getActiveSectors();
  const teamMembers = getTeamMembersFromSelections(
    parseTeamSelections(teamSelection),
    referenceDate,
    allPersonnel,
    presencesByPerson,
    null,
    sectorsConfig
  );

  const byPoste: Record<string, { theoretical: number; present: number; names: string[] }> = {};
  for (const person of teamMembers) {
    const poste = person.posteDeTravail?.split(",")[0]?.trim() || "Non assigné";
    if (!byPoste[poste]) byPoste[poste] = { theoretical: 0, present: 0, names: [] };
    byPoste[poste].theoretical += 1;
    const status = presencesByPerson[person.id]?.[dateStr]?.s;
    if (status && PRESENT_STATUSES.includes(status as (typeof PRESENT_STATUSES)[number])) {
      byPoste[poste].present += 1;
      byPoste[poste].names.push(fullName(person));
    }
  }
  return byPoste;
}
