import { prisma } from "./db";
import type { DayPresence, PresenceMap } from "./types";

export async function getPresencesForYear(personnelId: string, year: number): Promise<PresenceMap> {
  const rows = await prisma.presence.findMany({
    where: {
      personnelId,
      date: { startsWith: `${year}-` },
    },
  });

  const map: PresenceMap = {};
  for (const row of rows) {
    map[row.date] = {
      s: row.status,
      ...(row.location ? { loc: row.location } : {}),
      ...(row.comment ? { c: row.comment } : {}),
      ...(row.hs ? { hs: row.hs } : {}),
    };
  }
  return map;
}

export async function getPresencesForRange(
  personnelIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, PresenceMap>> {
  const rows = await prisma.presence.findMany({
    where: {
      personnelId: { in: personnelIds },
      date: { gte: startDate, lte: endDate },
    },
  });

  const result: Record<string, PresenceMap> = {};
  for (const id of personnelIds) result[id] = {};
  for (const row of rows) {
    if (!result[row.personnelId]) result[row.personnelId] = {};
    result[row.personnelId][row.date] = {
      s: row.status,
      ...(row.location ? { loc: row.location } : {}),
      ...(row.comment ? { c: row.comment } : {}),
      ...(row.hs ? { hs: row.hs } : {}),
    };
  }
  return result;
}

export async function setPresence(
  personnelId: string,
  dateStr: string,
  status: string,
  loc: string | null = null
): Promise<void> {
  await setPresenceFull(personnelId, dateStr, { status, location: loc });
}

export async function setPresenceFull(
  personnelId: string,
  dateStr: string,
  data: {
    status: string;
    location?: string | null;
    comment?: string | null;
    hs?: string | null;
  }
): Promise<void> {
  if (!data.status) {
    await prisma.presence.deleteMany({ where: { personnelId, date: dateStr } });
    return;
  }

  await prisma.presence.upsert({
    where: { personnelId_date: { personnelId, date: dateStr } },
    create: {
      personnelId,
      date: dateStr,
      status: data.status,
      location: data.location ?? null,
      comment: data.comment ?? null,
      hs: data.hs ?? null,
    },
    update: {
      status: data.status,
      location: data.location ?? null,
      comment: data.comment ?? null,
      hs: data.hs ?? null,
    },
  });
}

export function presenceToStatusMap(presences: PresenceMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [date, data] of Object.entries(presences)) {
    if (data.s) out[date] = data.s;
  }
  return out;
}
