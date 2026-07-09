import { calculateShiftForDate } from "./shifts";
import type { PersonnelRecord } from "./types";
import { fullName } from "./personnel";
import type { PresenceMap } from "./types";

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

export function buildWeeklySchedule(
  teamSelection: string,
  weekStartDateStr: string,
  allPersonnel: PersonnelRecord[],
  presencesByPerson: Record<string, PresenceMap>,
  shiftFilter: string | null = null
) {
  const teamName = teamSelection.replace(" (REAP)", "").replace(" (RP)", "");
  const referenceMonday = new Date(`${weekStartDateStr}T12:00:00Z`);
  const teamMembers = getTeamMembersOptimized(
    teamSelection,
    referenceMonday,
    allPersonnel,
    presencesByPerson,
    shiftFilter
  );

  const schedule: Record<string, Record<string, string>> = {};
  const memberIds = teamMembers.map((m) => m.id);
  memberIds.forEach((id) => {
    schedule[id] = {};
  });

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceMonday.getTime());
    d.setUTCDate(referenceMonday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  for (const dateStr of weekDates) {
    for (const person of teamMembers) {
      const stored = presencesByPerson[person.id]?.[dateStr]?.s;
      if (stored) {
        schedule[person.id][dateStr] = stored;
      } else {
        const theoretical = calculateShiftForDate(person, new Date(`${dateStr}T12:00:00Z`));
        if (theoretical) schedule[person.id][dateStr] = theoretical;
      }
    }
  }

  return { teamName, weekDates, schedule, teamMembers };
}
