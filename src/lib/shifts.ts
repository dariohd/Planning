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
  if (!person.typeQuart) return null;

  if (person.typeQuart === "Journée") return "J";

  if (person.typeQuart === "9*10") {
    const cycle = ["SC", "SL"];
    const shiftIndex = cycle.indexOf(person.quartDefaut ?? "");
    if (shiftIndex === -1) return null;
    const weeksPassed = weeksSinceFirstMonday(targetDate);
    if (weeksPassed < 0) return person.quartDefaut;
    return cycle[(shiftIndex + weeksPassed) % cycle.length];
  }

  if (person.typeQuart === "2*8" || person.typeQuart === "3*8") {
    let cycle: string[] = [];
    if (person.typeQuart === "3*8") cycle = ["M", "N", "A"];
    else if (person.typeQuart === "2*8") cycle = ["M", "A"];
    else if (person.typeQuart === "9*10 Portugal") cycle = ["M", "M", "M", "A", "A", "A"];
    else if (person.typeQuart === "Nuit Portugal") cycle = ["N"];

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

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const dayIndex = d.getUTCDay();
  const diffToMonday = d.getUTCDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diffToMonday, 12, 0, 0));
  return monday.toISOString().slice(0, 10);
}
