"use client";

import type { DayPresence, InitialData, PersonnelRecord } from "@/lib/types";
import { ALL_STATUSES } from "@/lib/constants";
import { fullName } from "@/lib/personnel";
import { counterLabel, statusLabel, t, weekdayLabel, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  data: InitialData;
  filteredPersonnel: PersonnelRecord[];
  selectedPerson: PersonnelRecord | null;
  showArchived: boolean;
  roleFilter: string;
  reapFilter: string;
  sortPersonnel: "nom" | "role";
  calendarMonth: { year: number; month: number };
  showAnnual: boolean;
  yearPresences: Record<string, DayPresence>;
  daysInMonth: { count: number; startPad: number };
  individualCounters: { cp: number; jrtt: number; maladie: number; formation: number; presence: number; horsProd: number } | null;
  canEdit: boolean;
  isAdmin: boolean;
  rangeStart: string;
  rangeEnd: string;
  rangeStatus: string;
  onShowArchivedToggle: () => void;
  onAddPerson: () => void;
  onReapFilter: (v: string) => void;
  onRoleFilter: (v: string) => void;
  onSortChange: (v: string) => void;
  onSelectPerson: (p: PersonnelRecord) => void;
  onEditPerson: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onMonthPrev: () => void;
  onMonthNext: () => void;
  onToggleAnnual: () => void;
  onRangeStart: (v: string) => void;
  onRangeEnd: (v: string) => void;
  onRangeStatus: (v: string) => void;
  onApplyRange: () => void;
  onCellClick: (personnelId: string, date: string, status: string, details?: DayPresence) => void;
};

export function IndividualViewSection({
  lang,
  data,
  filteredPersonnel,
  selectedPerson,
  showArchived,
  roleFilter,
  reapFilter,
  sortPersonnel,
  calendarMonth,
  showAnnual,
  yearPresences,
  daysInMonth,
  individualCounters,
  canEdit,
  isAdmin,
  rangeStart,
  rangeEnd,
  rangeStatus,
  onShowArchivedToggle,
  onAddPerson,
  onReapFilter,
  onRoleFilter,
  onSortChange,
  onSelectPerson,
  onEditPerson,
  onArchive,
  onReactivate,
  onMonthPrev,
  onMonthNext,
  onToggleAnnual,
  onRangeStart,
  onRangeEnd,
  onRangeStatus,
  onApplyRange,
  onCellClick,
}: Props) {
  return (
    <section className="grid lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-4 glass rounded-3xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" onClick={onShowArchivedToggle} className={`text-xs font-bold px-2 py-1 rounded-lg border ${showArchived ? "bg-slate-200" : ""}`}>
            {showArchived ? t(lang, "archived") : t(lang, "active")}
          </button>
          {isAdmin && canEdit && (
            <button type="button" onClick={onAddPerson} className="text-xs font-bold px-2 py-1 rounded-lg bg-[#00205b] text-white">
              {t(lang, "add_person")}
            </button>
          )}
        </div>
        <select value={reapFilter} onChange={(e) => onReapFilter(e.target.value)} className="w-full mb-2 rounded-xl border px-3 py-2 text-sm">
          <option value="Tous">{t(lang, "all_reap")}</option>
          {data.reapListForForm.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-1 mb-3">
          <button type="button" onClick={() => onRoleFilter("Tous")} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${roleFilter === "Tous" ? "bg-[#00205b] text-white" : ""}`}>{t(lang, "all")}</button>
          {[...new Set(data.personnel.map((p) => p.role))].sort().map((r) => (
            <button key={r} type="button" onClick={() => onRoleFilter(r)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${roleFilter === r ? "bg-[#00205b] text-white" : ""}`}>{r}</button>
          ))}
        </div>
        <select value={sortPersonnel} onChange={(e) => onSortChange(e.target.value)} className="w-full mb-3 rounded-xl border px-3 py-2 text-sm">
          <option value="nom">{t(lang, "sort_name")}</option>
          <option value="role">{t(lang, "sort_role")}</option>
        </select>
        <input
          placeholder={t(lang, "search")}
          className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll("[data-person-item]").forEach((node) => {
              const text = (node as HTMLElement).dataset.search ?? "";
              (node as HTMLElement).style.display = text.includes(q) ? "" : "none";
            });
          }}
        />
        <ul className="space-y-2">
          {filteredPersonnel.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-person-item
                data-search={`${p.nom} ${p.prenom}`.toLowerCase()}
                onClick={() => onSelectPerson(p)}
                className={`w-full text-left p-3 rounded-2xl border transition ${selectedPerson?.id === p.id ? "border-[#00b5e2] bg-white shadow" : "border-transparent hover:bg-white/70"}`}
              >
                <div className="font-bold text-sm">{p.nom} {p.prenom}</div>
                <div className="text-xs text-slate-500">{p.role} — {p.section}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="lg:col-span-8 glass rounded-3xl p-6">
        {!selectedPerson ? (
          <p className="text-center text-slate-500 py-20">{t(lang, "select_person")}</p>
        ) : (
          <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h2 className="text-2xl font-black uppercase italic text-[#00205b]">{fullName(selectedPerson)}</h2>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button type="button" onClick={onEditPerson} className="px-3 py-1 rounded-lg border text-xs font-bold">{t(lang, "edit_profile")}</button>
                )}
                {isAdmin && selectedPerson.statut === "Archivé" && (
                  <button type="button" onClick={onReactivate} className="px-3 py-1 rounded-lg border border-green-400 text-green-700 text-xs font-bold">{t(lang, "reactivate")}</button>
                )}
                {isAdmin && selectedPerson.statut !== "Archivé" && (
                  <button type="button" onClick={onArchive} className="px-3 py-1 rounded-lg border border-red-300 text-red-700 text-xs font-bold">{t(lang, "archive")}</button>
                )}
                <button type="button" className="px-3 py-1 rounded-lg border" onClick={onMonthPrev}>←</button>
                <span className="font-bold text-sm px-2">{calendarMonth.month + 1}/{calendarMonth.year}</span>
                <button type="button" className="px-3 py-1 rounded-lg border" onClick={onMonthNext}>→</button>
                <button type="button" onClick={onToggleAnnual} className={`px-3 py-1 rounded-lg border text-xs font-bold ${showAnnual ? "bg-[#00205b] text-white" : ""}`}>{t(lang, "year_view")}</button>
              </div>
            </div>

            {individualCounters && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {(
                  [
                    ["cp", individualCounters.cp],
                    ["jrtt", individualCounters.jrtt],
                    ["maladie", individualCounters.maladie],
                    ["formation", individualCounters.formation],
                    ["presence", individualCounters.presence],
                    ["hors_prod", individualCounters.horsProd],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="bg-white/70 rounded-xl p-2 text-center border">
                    <div className="text-lg font-black text-[#00205b]">{value}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{counterLabel(lang, key)}</div>
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="mb-6 p-4 rounded-2xl bg-white/60 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-2">{t(lang, "apply_range")}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="date" value={rangeStart} onChange={(e) => onRangeStart(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" />
                  <span className="text-slate-400">→</span>
                  <input type="date" value={rangeEnd} onChange={(e) => onRangeEnd(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" />
                  <select value={rangeStatus} onChange={(e) => onRangeStatus(e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                    {ALL_STATUSES.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{statusLabel(lang, s)}</option>
                    ))}
                  </select>
                  <button type="button" onClick={onApplyRange} className="px-3 py-1 rounded-lg bg-[#00205b] text-white text-sm font-bold">{t(lang, "apply")}</button>
                </div>
              </div>
            )}

            {!showAnnual ? (
              <>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                  {([1, 2, 3, 4, 5, 6, 0] as const).map((d) => (
                    <div key={d}>{weekdayLabel(lang, d)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth.startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                  {Array.from({ length: daysInMonth.count }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const pres = yearPresences[dateKey];
                    const status = pres?.s ?? "";
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`relative aspect-square rounded-full flex flex-col items-center justify-center text-xs font-bold hover:bg-slate-100 ${status ? "ring-2 ring-[#00b5e2]" : ""}`}
                        onClick={() => onCellClick(selectedPerson.id, dateKey, status, pres)}
                      >
                        <span>{day}</span>
                        {status && <span className="text-[9px] text-[#00205b]">{statusLabel(lang, status)}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {Array.from({ length: 12 }, (_, mi) => {
                  const month = mi;
                  const count = new Date(Date.UTC(calendarMonth.year, month + 1, 0)).getUTCDate();
                  const first = new Date(Date.UTC(calendarMonth.year, month, 1));
                  const pad = (first.getUTCDay() + 6) % 7;
                  return (
                    <div key={month} className="bg-white/60 rounded-2xl p-3 border">
                      <p className="text-xs font-black text-[#00205b] mb-2">{month + 1}/{calendarMonth.year}</p>
                      <div className="grid grid-cols-7 gap-0.5 text-[8px]">
                        {Array.from({ length: pad }).map((_, i) => <div key={`p-${i}`} />)}
                        {Array.from({ length: count }, (_, d) => {
                          const day = d + 1;
                          const dateKey = `${calendarMonth.year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const status = yearPresences[dateKey]?.s ?? "";
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => onCellClick(selectedPerson.id, dateKey, status, yearPresences[dateKey])}
                              className={`aspect-square rounded text-center ${status ? "bg-[#00b5e2]/30 font-bold" : "hover:bg-slate-100"}`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
