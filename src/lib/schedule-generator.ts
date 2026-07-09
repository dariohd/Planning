import { getFrenchPublicHolidays } from "./holidays";
import { prisma } from "./db";
import { calculateShiftForDate } from "./shifts";
import type { PersonnelRecord } from "./types";

const PRESERVE_STATUSES = new Set([
  "CET", "CP", "4HCP", "JRTT", "Abs", "RF", "Ma", "LMa", "F", "4HF", "P", "Z", "S", "D", "Ecole",
]);

export async function populateInitialScheduleForPerson(
  person: PersonnelRecord,
  startDateStr?: string
): Promise<void> {
  const year = startDateStr
    ? new Date(`${startDateStr}T12:00:00Z`).getUTCFullYear()
    : new Date().getUTCFullYear();

  const start = startDateStr
    ? new Date(`${startDateStr}T12:00:00Z`)
    : new Date(Date.UTC(year, 0, 1));

  const end = new Date(Date.UTC(year, 11, 31, 12, 0, 0));
  const existing = await prisma.presence.findMany({
    where: {
      personnelId: person.id,
      date: { startsWith: `${year}-` },
    },
  });
  const existingMap = new Map(existing.map((r) => [r.date, r.status]));
  const holidays = new Set(getFrenchPublicHolidays(year));

  const toUpsert: { personnelId: string; date: string; status: string }[] = [];
  const cursor = new Date(start.getTime());

  while (cursor <= end) {
    const dateKey = cursor.toISOString().slice(0, 10);
    if (holidays.has(dateKey)) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    const existingStatus = existingMap.get(dateKey);
    if (!existingStatus || !PRESERVE_STATUSES.has(existingStatus)) {
      const shift = calculateShiftForDate(person, cursor);
      if (shift) {
        toUpsert.push({ personnelId: person.id, date: dateKey, status: shift });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const row of toUpsert) {
    await prisma.presence.upsert({
      where: { personnelId_date: { personnelId: row.personnelId, date: row.date } },
      create: row,
      update: { status: row.status },
    });
  }
}

export async function generateYearlySchedules(year: number): Promise<{ created: number; skipped: number }> {
  const personnel = await prisma.personnel.findMany({ where: { statut: { not: "Archivé" } } });
  let created = 0;
  let skipped = 0;

  for (const person of personnel) {
    const count = await prisma.presence.count({
      where: { personnelId: person.id, date: { startsWith: `${year}-` } },
    });
    if (count > 0) {
      skipped++;
      continue;
    }
    await populateInitialScheduleForPerson(person as PersonnelRecord);
    created++;
  }

  return { created, skipped };
}
