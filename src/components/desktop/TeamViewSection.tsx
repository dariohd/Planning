"use client";

import type { DayPresence, InitialData, PersonnelRecord, WeeklySchedule } from "@/lib/types";
import { DISPLAY_POSTES } from "@/lib/constants";
import { TeamMonthlyTable } from "@/components/desktop/TeamMonthlyTable";
import { TeamFilterDropdown } from "@/components/desktop/TeamFilterDropdown";
import { EmptyTeamState } from "@/components/desktop/EmptyTeamState";
import { StatusCell } from "@/components/shared/StatusCell";
import { canModifyPerson } from "@/lib/client-permissions";
import { t, type Lang } from "@/lib/i18n";

type MonthlyData = {
  monthDates: string[];
  schedule: Record<string, Record<string, string>>;
  details: Record<string, Record<string, DayPresence>>;
  teamMembers: PersonnelRecord[];
};

type Props = {
  lang: Lang;
  data: InitialData;
  teamOptions: string[];
  teamSelections: string[];
  shiftFilter: string;
  workstationFilter: string;
  teamPeriod: "week" | "month";
  workstations: string[];
  groupByMachine: boolean;
  holidayCountry: "FR" | "PT";
  userRole: string;
  canEdit: boolean;
  isAdmin: boolean;
  hasTeamPresences: boolean;
  weekly: WeeklySchedule | null;
  monthly: MonthlyData | null;
  calendarMonth: { year: number; month: number };
  onFilterChange: (patch: Record<string, unknown>) => void;
  onPrint: () => void;
  onMassOpen: () => void;
  onShiftWeek: (delta: number) => void;
  onShiftMonth: (delta: number) => void;
  onOpenSettings: () => void;
  onGenerateYear: () => void;
  onCellClick: (personnelId: string, date: string, status: string, details?: DayPresence) => void;
};

export function TeamViewSection({
  lang,
  data,
  teamOptions,
  teamSelections,
  shiftFilter,
  workstationFilter,
  teamPeriod,
  workstations,
  groupByMachine,
  holidayCountry,
  userRole,
  canEdit,
  isAdmin,
  hasTeamPresences,
  weekly,
  monthly,
  calendarMonth,
  onFilterChange,
  onPrint,
  onMassOpen,
  onShiftWeek,
  onShiftMonth,
  onOpenSettings,
  onGenerateYear,
  onCellClick,
}: Props) {
  return (
    <section className="glass rounded-3xl p-6">
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <TeamFilterDropdown options={teamOptions} selected={teamSelections} onChange={(v) => onFilterChange({ teamSelections: v })} />
        <select value={shiftFilter} onChange={(e) => onFilterChange({ shiftFilter: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
          {["Tous", "M", "A", "N", "J"].map((s) => (
            <option key={s} value={s}>{t(lang, "shift")} {s}</option>
          ))}
        </select>
        <select value={workstationFilter} onChange={(e) => onFilterChange({ workstationFilter: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
          <option value="Tous">{t(lang, "workstation_all")}</option>
          {(workstations ?? DISPLAY_POSTES).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex rounded-xl border overflow-hidden text-sm font-bold">
          <button type="button" className={`px-3 py-2 ${teamPeriod === "month" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => onFilterChange({ teamPeriod: "month" })}>{t(lang, "month")}</button>
          <button type="button" className={`px-3 py-2 ${teamPeriod === "week" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => onFilterChange({ teamPeriod: "week" })}>{t(lang, "week")}</button>
        </div>
        <button type="button" onClick={onPrint} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-[#00205b] text-[#00205b]">{t(lang, "print")}</button>
        {canEdit && (
          <button type="button" onClick={onMassOpen} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00b5e2] text-white">{t(lang, "mass_update")}</button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => (teamPeriod === "week" ? onShiftWeek(-1) : onShiftMonth(-1))} className="px-3 py-2 rounded-lg bg-white border">←</button>
          <span className="text-sm font-bold">
            {teamPeriod === "week"
              ? `${t(lang, "week_of")} ${weekly?.weekDates?.[0]} ${t(lang, "to")} ${weekly?.weekDates?.[6]}`
              : `${calendarMonth.month + 1}/${calendarMonth.year}`}
          </span>
          <button type="button" onClick={() => (teamPeriod === "week" ? onShiftWeek(1) : onShiftMonth(1))} className="px-3 py-2 rounded-lg bg-white border">→</button>
        </div>
      </div>

      {!hasTeamPresences ? (
        <EmptyTeamState lang={lang} isAdmin={isAdmin} onOpenSettings={onOpenSettings} onGenerateYear={onGenerateYear} />
      ) : teamPeriod === "month" && monthly ? (
        <TeamMonthlyTable
          monthDates={monthly.monthDates}
          schedule={monthly.schedule}
          details={monthly.details}
          teamMembers={monthly.teamMembers}
          allPersonnel={data.personnel}
          userRole={userRole}
          userName={data.currentUser.name}
          userPersonnelId={data.currentUser.personnelId}
          groupByPoste={groupByMachine}
          workstationFilter={workstationFilter}
          holidayCountry={holidayCountry ?? "FR"}
          onCellClick={onCellClick}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-300">
          <table className="w-full border-collapse text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left w-[20%] sticky left-0 bg-slate-100 z-10">{t(lang, "personnel")}</th>
                {weekly?.weekDates?.map((d) => (
                  <th key={d} className="border border-slate-300 p-1 text-center text-xs min-w-[32px]">{d.slice(8)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekly?.teamMembers?.map((member) => {
                const canEditCell = canModifyPerson(userRole, data.currentUser.name, data.currentUser.personnelId, member, data.personnel);
                return (
                  <tr key={member.id} className={member.role === "Intérimaire" ? "bg-cyan-50" : ""}>
                    <td className="border border-slate-300 p-2 sticky left-0 bg-white z-10">
                      <div className="font-bold text-xs">{member.nom} {member.prenom}</div>
                      <div className="text-[10px] text-slate-500">{member.posteDeTravail}</div>
                    </td>
                    {weekly.weekDates.map((date) => {
                      const status = weekly.schedule[member.id]?.[date] ?? "";
                      const cellDetails = weekly.details?.[member.id]?.[date];
                      return (
                        <StatusCell
                          key={date}
                          status={status}
                          details={cellDetails}
                          className={`text-[10px] p-0.5 ${!canEditCell ? "opacity-60" : ""}`}
                          onClick={canEditCell ? () => onCellClick(member.id, date, status, cellDetails) : undefined}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
