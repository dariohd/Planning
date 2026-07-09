import { calculateShiftForDate } from "./shifts";
import type { PersonnelRecord } from "./types";
import { fullName } from "./personnel";
import type { DayPresence, PresenceMap } from "./types";

export function getTeamMembersOptimized(
  selection: string,
  referenceMonday: Date,
  allPersonnel: PersonnelRecord[],
  presencesByPerson: Record<string, PresenceMap>,
  shiftFilter: string | null = null
): PersonnelRecord[] {
  let members: PersonnelRecord[] = [];

  if (selection === "Tous") {
    members = [...allPersonnel];
  } else if (selection === "__UNASSIGNED_3x8__") {
    members = allPersonnel.filter((p) => {
      const tq = (p.typeQuart ?? "").replace(/\*/g, "x").toLowerCase();
      return tq.includes("3x8") && !p.chefEquipeAssocie;
    });
  } else if (selection.endsWith(" (REAP)")) {
    const name = selection.replace(" (REAP)", "");
    const manager = allPersonnel.find((p) => fullName(p) === name && p.role === "REAP");
    if (manager) {
      members = allPersonnel.filter((p) => p.chefEquipeAssocie === manager.id);
    }
  } else if (selection.endsWith(" (RP)")) {
    const name = selection.replace(" (RP)", "");
    const manager = allPersonnel.find((p) => fullName(p) === name && p.role === "RP");
    if (manager) {
      members = allPersonnel.filter(
        (p) => p.responsableHierarchique === manager.id || p.chefEquipeAssocie === manager.id
      );
    }
  } else {
    const manager = allPersonnel.find((p) => fullName(p) === selection);
    if (manager) {
      members = allPersonnel.filter(
        (p) => p.chefEquipeAssocie === manager.id || p.responsableHierarchique === manager.id
      );
    }
  }

  if (!shiftFilter || shiftFilter === "Tous") {
    return members.sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }

  const filtered = members.filter((person) => {
    const getActualShift = (date: Date): string | null => {
      const dateKey = date.toISOString().slice(0, 10);
      const stored = presencesByPerson[person.id]?.[dateKey]?.s;
      if (stored) return stored;
      return calculateShiftForDate(person, date);
    };

    for (let i = 0; i < 7; i++) {
      const d = new Date(referenceMonday.getTime());
      d.setUTCDate(referenceMonday.getUTCDate() + i);
      const shift = getActualShift(d);
      if (shift === shiftFilter) return true;
    }
    return false;
  });

  return filtered.sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

export function parseTeamSelections(selection: string | string[]): string[] {
  if (Array.isArray(selection)) return selection;
  if (!selection || selection === "Tous") return ["Tous"];
  if (selection.includes("||")) return selection.split("||").filter(Boolean);
  return [selection];
}

export function getTeamMembersFromSelections(
  selections: string[],
  referenceMonday: Date,
  allPersonnel: PersonnelRecord[],
  presencesByPerson: Record<string, PresenceMap>,
  shiftFilter: string | null = null
): PersonnelRecord[] {
  if (selections.includes("Tous") || selections.length === 0) {
    return getTeamMembersOptimized("Tous", referenceMonday, allPersonnel, presencesByPerson, shiftFilter);
  }

  const memberIds = new Set<string>();
  for (const sel of selections) {
    const members = getTeamMembersOptimized(sel, referenceMonday, allPersonnel, presencesByPerson, shiftFilter);
    for (const m of members) memberIds.add(m.id);
  }

  return allPersonnel
    .filter((p) => memberIds.has(p.id))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

export function buildWeeklySchedule(
  teamSelection: string | string[],
  weekStartDateStr: string,
  allPersonnel: PersonnelRecord[],
  presencesByPerson: Record<string, PresenceMap>,
  shiftFilter: string | null = null
) {
  const selections = parseTeamSelections(teamSelection);
  const teamName = selections.length === 1 ? selections[0].replace(" (REAP)", "").replace(" (RP)", "") : "Fusion";
  const referenceMonday = new Date(`${weekStartDateStr}T12:00:00Z`);
  const teamMembers = getTeamMembersFromSelections(
    selections,
    referenceMonday,
    allPersonnel,
    presencesByPerson,
    shiftFilter
  );

  const schedule: Record<string, Record<string, string>> = {};
  const details: Record<string, Record<string, DayPresence>> = {};
  const memberIds = teamMembers.map((m) => m.id);
  memberIds.forEach((id) => {
    schedule[id] = {};
    details[id] = {};
  });

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceMonday.getTime());
    d.setUTCDate(referenceMonday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  for (const dateStr of weekDates) {
    for (const person of teamMembers) {
      const stored = presencesByPerson[person.id]?.[dateStr];
      if (stored?.s) {
        schedule[person.id][dateStr] = stored.s;
        details[person.id][dateStr] = stored;
      } else {
        const theoretical = calculateShiftForDate(person, new Date(`${dateStr}T12:00:00Z`));
        if (theoretical) schedule[person.id][dateStr] = theoretical;
      }
    }
  }

  return { teamName, weekDates, schedule, details, teamMembers };
}

export function buildMonthlySchedule(
  teamSelection: string | string[],
  year: number,
  month: number,
  allPersonnel: PersonnelRecord[],
  presencesByPerson: Record<string, PresenceMap>,
  shiftFilter: string | null = null
) {
  const selections = parseTeamSelections(teamSelection);
  const referenceMonday = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const teamMembers = getTeamMembersFromSelections(
    selections,
    referenceMonday,
    allPersonnel,
    presencesByPerson,
    shiftFilter
  );

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(Date.UTC(year, month, i + 1, 12, 0, 0));
    return d.toISOString().slice(0, 10);
  });

  const schedule: Record<string, Record<string, string>> = {};
  const details: Record<string, Record<string, DayPresence>> = {};
  for (const member of teamMembers) {
    schedule[member.id] = {};
    details[member.id] = {};
  }

  for (const dateStr of monthDates) {
    for (const person of teamMembers) {
      const stored = presencesByPerson[person.id]?.[dateStr];
      if (stored?.s) {
        schedule[person.id][dateStr] = stored.s;
        details[person.id][dateStr] = stored;
      } else {
        const theoretical = calculateShiftForDate(person, new Date(`${dateStr}T12:00:00Z`));
        if (theoretical) schedule[person.id][dateStr] = theoretical;
      }
    }
  }

  const teamName = selections.length === 1 ? selections[0].replace(" (REAP)", "").replace(" (RP)", "") : "Fusion";
  return { teamName, monthDates, schedule, details, teamMembers, year, month };
}
