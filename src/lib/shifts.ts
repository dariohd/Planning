import type { PersonnelRecord } from "./types";

function firstMondayOfYear(year: number): Date {
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = firstDay.getUTCDay();
  const dateOffset = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(firstDay);
  monday.setUTCDate(firstDay.getUTCDate() + dateOffset);
  return monday;
}

function weeksSinceFirstMonday(targetDate: Date): number {
  const year = targetDate.getUTCFullYear();
  const anchor = firstMondayOfYear(year);
  return Math.floor((targetDate.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

export function calculateShiftForDate(
  person: Pick<PersonnelRecord, "typeQuart" | "quartDefaut">,
  targetDate: Date
): string | null {
  const typeQuart = person.typeQuart?.replace(/\*/g, "x") ?? "";
  if (!typeQuart) return null;

  if (typeQuart === "Journée") return "J";

  if (typeQuart === "9x10" || typeQuart === "9*10") {
    const cycle = ["SC", "SL"];
    const shiftIndex = cycle.indexOf(person.quartDefaut ?? "");
    if (shiftIndex === -1) return null;
    const weeksPassed = weeksSinceFirstMonday(targetDate);
    if (weeksPassed < 0) return person.quartDefaut;
    return cycle[(shiftIndex + weeksPassed) % cycle.length];
  }

  if (typeQuart === "2x8" || typeQuart === "3x8" || typeQuart === "9x10 Portugal" || typeQuart === "Nuit Portugal") {
    let cycle: string[] = [];
    if (typeQuart === "3x8") cycle = ["M", "N", "A"];
    else if (typeQuart === "2x8") cycle = ["M", "A"];
    else if (typeQuart === "9x10 Portugal") cycle = ["M", "M", "M", "A", "A", "A"];
    else if (typeQuart === "Nuit Portugal") cycle = ["N"];

    const shiftIndex = cycle.indexOf(person.quartDefaut ?? "");
    if (shiftIndex === -1) return null;

    const weeksPassed = weeksSinceFirstMonday(targetDate);
    if (weeksPassed < 0) return person.quartDefaut;
    return cycle[(shiftIndex + weeksPassed) % cycle.length];
  }

  return null;
}

export function getWeekDates(mondayIso: string): string[] {
  const referenceMonday = new Date(`${mondayIso}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceMonday.getTime());
    d.setUTCDate(referenceMonday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function getDominantShiftForWeek(
  schedule: Record<string, string>,
  weekDates: string[],
  fallback = "M"
): string {
  const counts: Record<string, number> = { M: 0, A: 0, N: 0, J: 0 };
  for (const d of weekDates) {
    const s = schedule[d];
    if (s && counts[s] !== undefined) counts[s]++;
  }
  let best = fallback;
  let max = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const dayIndex = d.getUTCDay();
  const diffToMonday = d.getUTCDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diffToMonday, 12, 0, 0));
  return monday.toISOString().slice(0, 10);
}
