"use client";

import { Fragment, useMemo, useState } from "react";
import type { DayPresence, PersonnelRecord } from "@/lib/types";
import { fullName } from "@/lib/personnel";
import { canModifyPerson } from "@/lib/client-permissions";
import { getFrenchPublicHolidays } from "@/lib/holidays";
import { StatusCell } from "@/components/shared/StatusCell";

type Props = {
  monthDates: string[];
  schedule: Record<string, Record<string, string>>;
  details?: Record<string, Record<string, DayPresence>>;
  teamMembers: PersonnelRecord[];
  allPersonnel: PersonnelRecord[];
  userRole: string;
  userName?: string | null;
  userPersonnelId?: string | null;
  groupByPoste?: boolean;
  onCellClick: (personnelId: string, date: string, status: string, details?: DayPresence) => void;
};

const DOW = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function TeamMonthlyTable({
  monthDates,
  schedule,
  details,
  teamMembers,
  allPersonnel,
  userRole,
  userName,
  userPersonnelId,
  groupByPoste = false,
  onCellClick,
}: Props) {
  const [search, setSearch] = useState("");
  const [flatView, setFlatView] = useState(false);
  const year = monthDates[0] ? Number(monthDates[0].slice(0, 4)) : new Date().getFullYear();
  const holidays = useMemo(() => new Set(getFrenchPublicHolidays(year)), [year]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((m) => fullName(m).toLowerCase().includes(q));
  }, [teamMembers, search]);

  const groups = useMemo(() => {
    if (flatView) return [{ label: null as string | null, members: filtered }];
    const map = new Map<string, PersonnelRecord[]>();
    for (const m of filtered) {
      let key: string;
      if (groupByPoste) {
        key = m.posteDeTravail?.split(",")[0]?.trim() || "Non assigné";
      } else {
        const reap = allPersonnel.find((p) => p.id === m.chefEquipeAssocie);
        key = reap ? fullName(reap) : "Sans REAP";
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, members]) => ({
        label,
        members: members.sort((a, b) => fullName(a).localeCompare(fullName(b))),
      }));
  }, [filtered, flatView, groupByPoste, allPersonnel]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold min-w-[200px]"
        />
        {search && (
          <span className="text-xs font-bold text-[#00b5e2]">{filtered.length} résultat(s)</span>
        )}
        <button
          type="button"
          onClick={() => setFlatView(!flatView)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${flatView ? "bg-[#00205b] text-white" : "bg-white"}`}
        >
          {flatView ? "Vue groupée" : "Vue liste"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-300">
        <table className="w-full border-collapse text-sm min-w-[1200px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left w-[220px] sticky left-0 bg-slate-100 z-10">Personnel</th>
              {monthDates.map((d) => {
                const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
                const isWeekend = dow === 0 || dow === 6;
                const isHoliday = holidays.has(d);
                return (
                  <th
                    key={d}
                    className={`border border-slate-300 p-1 text-center text-[10px] min-w-[30px] ${isWeekend || isHoliday ? "bg-slate-200" : ""}`}
                  >
                    <div>{DOW[dow]}</div>
                    <div className="font-black">{d.slice(8)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.label ?? "flat"}>
                {!flatView && group.label && (
                  <tr key={`sep-${group.label}`} className="bg-[#00205b]/5">
                    <td colSpan={monthDates.length + 1} className="border border-slate-300 px-3 py-1.5 text-xs font-black uppercase text-[#00205b] sticky left-0">
                      {group.label}
                    </td>
                  </tr>
                )}
                {group.members.map((member) => {
                  const dimmed = search && !filtered.includes(member);
                  if (dimmed) return null;
                  const canEdit = canModifyPerson(userRole, userName, userPersonnelId, member, allPersonnel);
                  return (
                    <tr key={member.id} className={member.role === "Intérimaire" ? "bg-cyan-50/50" : ""}>
                      <td className="border border-slate-300 p-2 sticky left-0 bg-white z-10">
                        <div className="font-bold text-xs">{member.nom} {member.prenom}</div>
                        <div className="text-[10px] text-slate-500">{member.posteDeTravail}</div>
                      </td>
                      {monthDates.map((date) => {
                        const status = schedule[member.id]?.[date] ?? "";
                        const cellDetails = details?.[member.id]?.[date];
                        const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                          <StatusCell
                            key={date}
                            status={status}
                            details={cellDetails}
                            isWeekend={isWeekend}
                            isHoliday={holidays.has(date)}
                            className={`text-[10px] p-0.5 ${!canEdit ? "opacity-60" : ""}`}
                            onClick={canEdit ? () => onCellClick(member.id, date, status, cellDetails) : undefined}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
