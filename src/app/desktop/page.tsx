"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppMode, DayPresence, InitialData, PersonnelRecord, WeeklySchedule } from "@/lib/types";
import { computeIndividualCounters } from "@/lib/counters";
import { ALL_STATUSES, DISPLAY_POSTES } from "@/lib/constants";
import { TeamMonthlyTable } from "@/components/desktop/TeamMonthlyTable";
import { TeamFilterDropdown } from "@/components/desktop/TeamFilterDropdown";
import { usePlanningFilters } from "@/lib/usePlanningFilters";
import { canModifyPerson, canUserEdit, isAdministrator } from "@/lib/client-permissions";
import { getMondayOfWeek } from "@/lib/shifts";
import { fullName } from "@/lib/personnel";
import { StatusCell } from "@/components/shared/StatusCell";
import { PresenceEditor } from "@/components/shared/PresenceEditor";
import { IndicatorsView } from "@/components/desktop/IndicatorsView";
import { CapaView } from "@/components/desktop/CapaView";
import { MassUpdateModal } from "@/components/desktop/MassUpdateModal";
import { PersonnelForm } from "@/components/desktop/PersonnelForm";
import { SettingsModal } from "@/components/desktop/SettingsModal";
import { t, type Lang } from "@/lib/i18n";
import { HelpChatbot } from "@/components/shared/HelpChatbot";
import { useToast } from "@/components/shared/ToastProvider";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

type View = "equipe" | "individuelle" | "indicateurs" | "capa";
type TeamPeriod = "week" | "month";

type EditorState = {
  personnelId: string;
  date: string;
  status: string;
  comment?: string;
  hs?: string;
  location?: string;
} | null;

type MonthlyData = {
  monthDates: string[];
  schedule: Record<string, Record<string, string>>;
  details: Record<string, Record<string, DayPresence>>;
  teamMembers: PersonnelRecord[];
};

export default function DesktopApp() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = usePlanningFilters("desktop", {
    teamSelections: ["Tous"] as string[],
    teamPeriod: "month" as TeamPeriod,
    mode: "production" as AppMode,
    lang: "fr" as Lang,
    shiftFilter: "Tous",
    workstationFilter: "Tous",
    showAnnual: false,
    sortPersonnel: "nom" as "nom" | "role",
  });
  const lang = filters.lang as Lang;
  const mode = filters.mode as AppMode;
  const teamPeriod = filters.teamPeriod as TeamPeriod;
  const teamSelections = filters.teamSelections as string[];
  const shiftFilter = String(filters.shiftFilter ?? "Tous");
  const workstationFilter = String(filters.workstationFilter ?? "Tous");
  const showAnnual = Boolean(filters.showAnnual);
  const sortPersonnel = (filters.sortPersonnel as "nom" | "role") ?? "nom";
  const patchFilters = useCallback(
    (patch: Record<string, unknown>) => setFilters((prev) => ({ ...prev, ...patch })),
    [setFilters]
  );
  const [view, setView] = useState<View>("equipe");
  const [data, setData] = useState<InitialData | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonnelRecord | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [reapFilter, setReapFilter] = useState("Tous");
  const [yearPresences, setYearPresences] = useState<Record<string, DayPresence>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState>(null);
  const [massOpen, setMassOpen] = useState(false);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeStatus, setRangeStatus] = useState("CP");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const lastModifiedRef = useRef<string>("0");

  const userRole = data?.currentUser.role ?? "Non Autorisé";
  const canEdit = canUserEdit(userRole);
  const isAdmin = isAdministrator(userRole);

  const appConfig = useMemo(
    () => ({
      groupByMachine: data?.settings.groupByMachine ?? false,
      holidayCountry: data?.settings.holidayCountry ?? "FR",
      workstations: data?.settings.workstations?.length ? data.settings.workstations : [...DISPLAY_POSTES],
    }),
    [data]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const archived = showArchived ? "&archived=true" : "";
    const res = await fetch(`/api/initial-data?mode=${mode}${archived}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erreur de chargement");
      setData(null);
    } else {
      setData(json);
      lastModifiedRef.current = String(json.lastModified ?? "0");
    }
    setLoading(false);
  }, [mode, showArchived]);

  const selectionParam = teamSelections
    .map((s) => (s === "Non affectés 3×8" ? "__UNASSIGNED_3x8__" : s))
    .join("||");

  const loadWeekly = useCallback(async () => {
    const params = new URLSearchParams({ selection: selectionParam, weekStart, mode, shiftFilter });
    const res = await fetch(`/api/team/week?${params}`);
    setWeekly(await res.json());
  }, [selectionParam, weekStart, mode, shiftFilter]);

  const loadMonthly = useCallback(async () => {
    const params = new URLSearchParams({
      selection: selectionParam,
      year: String(calendarMonth.year),
      month: String(calendarMonth.month),
      mode,
      shiftFilter,
    });
    const res = await fetch(`/api/team/month?${params}`);
    setMonthly(await res.json());
  }, [selectionParam, calendarMonth.year, calendarMonth.month, mode, shiftFilter]);

  const loadPersonYear = useCallback(async (personId: string, year: number) => {
    const res = await fetch(`/api/presences?personnelId=${personId}&year=${year}`);
    setYearPresences(await res.json());
  }, []);

  const refreshTeam = useCallback(() => {
    if (teamPeriod === "week") loadWeekly();
    else loadMonthly();
  }, [teamPeriod, loadWeekly, loadMonthly]);

  useEffect(() => {
    // Chargement initial serveur
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch au montage
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (view === "equipe" || view === "capa") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch dépendant des filtres
      if (teamPeriod === "week") void loadWeekly();
      else void loadMonthly();
    }
  }, [view, teamPeriod, loadWeekly, loadMonthly]);

  useEffect(() => {
    if (selectedPerson) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch calendrier individuel
      void loadPersonYear(selectedPerson.id, calendarMonth.year);
    }
  }, [selectedPerson, calendarMonth.year, loadPersonYear]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/updates?since=${lastModifiedRef.current}&mode=${mode}`);
      const json = await res.json();
      if (json.hasChanges && json.newData) {
        setData(json.newData);
        lastModifiedRef.current = String(json.lastModified);
        if (view === "equipe") refreshTeam();
      } else if (json.lastModified) {
        lastModifiedRef.current = String(json.lastModified);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [mode, view, refreshTeam]);

  const teamOptions = useMemo(() => {
    if (!data) return ["Tous"];
    return ["Tous", "Non affectés 3×8", ...data.chefsEquipe.map((c) => `${c.name} (${c.role})`)];
  }, [data]);

  const filteredPersonnel = useMemo(() => {
    if (!data) return [];
    let list = data.personnel;
    if (roleFilter !== "Tous") list = list.filter((p) => p.role === roleFilter);
    if (reapFilter !== "Tous") list = list.filter((p) => p.chefEquipeAssocie === reapFilter);
    list = [...list].sort((a, b) =>
      sortPersonnel === "role" ? a.role.localeCompare(b.role) || fullName(a).localeCompare(fullName(b)) : fullName(a).localeCompare(fullName(b))
    );
    return list;
  }, [data, roleFilter, reapFilter, sortPersonnel]);

  const individualCounters = useMemo(
    () => (selectedPerson ? computeIndividualCounters(yearPresences) : null),
    [selectedPerson, yearPresences]
  );

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const shiftMonth = (delta: number) => {
    setCalendarMonth((m) => {
      const d = new Date(Date.UTC(m.year, m.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  const savePresenceDetails = async (payload: {
    status: string;
    comment?: string;
    hs?: string;
    location?: string;
  }) => {
    if (!editor || !canEdit) return;
    const old = { ...editor };
    await fetch("/api/presences/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId: editor.personnelId,
        date: editor.date,
        status: payload.status,
        comment: payload.comment,
        hs: payload.hs,
        location: payload.location,
      }),
    });
    setEditor(null);
    refreshTeam();
    if (selectedPerson?.id === editor.personnelId) {
      loadPersonYear(editor.personnelId, calendarMonth.year);
    }
    showToast("Statut enregistré", {
      undo: {
        type: "details",
        personnelId: old.personnelId,
        date: old.date,
        oldStatus: old.status,
        oldComment: old.comment,
        oldHs: old.hs,
        oldLocation: old.location,
      },
    });
  };

  const applyRange = async () => {
    if (!selectedPerson || !rangeStart || !rangeEnd || !canEdit) return;
    await fetch("/api/presences/range", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId: selectedPerson.id,
        startDate: rangeStart,
        endDate: rangeEnd,
        status: rangeStatus,
      }),
    });
    loadPersonYear(selectedPerson.id, calendarMonth.year);
    showToast("Plage appliquée");
  };

  const applyMassUpdate = async (payload: {
    personnelIds: string[];
    startDate: string;
    endDate: string;
    status: string;
    location?: string;
  }) => {
    await fetch("/api/presences/range/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    refreshTeam();
    showToast(`Modification groupée : ${payload.personnelIds.length} personne(s)`);
  };

  const archivePerson = async () => {
    if (!selectedPerson || !isAdmin) return;
    if (!confirm(`Archiver ${fullName(selectedPerson)} ?`)) return;
    await fetch(`/api/personnel/${selectedPerson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    setSelectedPerson(null);
    loadInitial();
  };

  const reactivatePerson = async () => {
    if (!selectedPerson || !isAdmin) return;
    await fetch(`/api/personnel/${selectedPerson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reactivate" }),
    });
    loadInitial();
    setAdminMsg("Collaborateur réactivé");
    setTimeout(() => setAdminMsg(null), 3000);
  };

  const generateYear = async (year?: number) => {
    const y = year ?? calendarMonth.year;
    if (!confirm(`Générer les plannings ${y} pour tous les collaborateurs ?`)) return;
    setAdminMsg("Génération en cours...");
    const res = await fetch("/api/schedule/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: y }),
    });
    const json = await res.json();
    setAdminMsg(res.ok ? `Année ${y} générée` : json.error);
    setTimeout(() => setAdminMsg(null), 5000);
  };

  const openPrint = () => {
    const params = new URLSearchParams({ selection: selectionParam, weekStart, mode, lang, shiftFilter });
    window.open(`/api/print/week?${params}`, "_blank");
  };

  const openCellEditor = (personnelId: string, date: string, status: string, details?: DayPresence) => {
    setEditor({
      personnelId,
      date,
      status,
      comment: details?.c,
      hs: details?.hs,
      location: details?.loc,
    });
  };

  const daysInMonth = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(Date.UTC(year, month, 1));
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startPad = (first.getUTCDay() + 6) % 7;
    return { count, startPad };
  }, [calendarMonth]);

  const indicatorDate =
    teamPeriod === "week" ? (weekly?.weekDates?.[0] ?? weekStart) : `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-01`;

  const teamMembersForMass = monthly?.teamMembers ?? weekly?.teamMembers ?? [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#00205b] font-bold">
        Chargement...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-8 max-w-lg text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button type="button" onClick={() => signOut()} className="text-sm underline">
            {t(lang, "logout")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PresenceEditor
        key={editor ? `${editor.personnelId}-${editor.date}` : "closed"}
        open={!!editor}
        personnelId={editor?.personnelId ?? ""}
        date={editor?.date ?? ""}
        current={{
          status: editor?.status ?? "",
          comment: editor?.comment,
          hs: editor?.hs,
          location: editor?.location,
        }}
        canEdit={canEdit}
        missions={data?.settings.missions ?? ["Mi"]}
        onSave={savePresenceDetails}
        onClose={() => setEditor(null)}
      />

      <MassUpdateModal
        open={massOpen}
        members={teamMembersForMass}
        onApply={applyMassUpdate}
        onClose={() => setMassOpen(false)}
      />

      <PersonnelForm
        key={selectedPerson?.id ?? "new"}
        open={personFormOpen}
        data={data}
        person={selectedPerson}
        workstations={appConfig.workstations}
        onSaved={loadInitial}
        onClose={() => setPersonFormOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        isAdmin={isAdmin}
        onClose={() => { setSettingsOpen(false); void loadInitial(); }}
        onGenerateYear={generateYear}
      />

      <header className="sticky top-0 z-20 glass border-b border-white/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#00205b]">
            {data.settings.appName}
          </h1>
          <p className="text-xs text-slate-500">
            {session?.user?.name} — {data.currentUser.role}
            {!canEdit && " (lecture seule)"}
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 items-center">
          {(["equipe", "individuelle", "indicateurs", "capa"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`nav-link px-4 py-2 rounded-xl text-sm font-bold ${view === v ? "bg-[#00205b] text-white" : ""}`}
              aria-current={view === v ? "page" : undefined}
              onClick={() => setView(v)}
            >
              {t(lang, v === "equipe" ? "team" : v === "individuelle" ? "individual" : v === "indicateurs" ? "indicators" : "capa")}
            </button>
          ))}
          <Link href="/mobile" className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00b5e2] text-white">
            {t(lang, "mobile")}
          </Link>
          {isAdmin && (
            <button type="button" onClick={() => setSettingsOpen(true)} className="px-3 py-2 rounded-xl border text-sm font-bold">
              Config
            </button>
          )}
          <select value={lang} onChange={(e) => patchFilters({ lang: e.target.value })} className="rounded-xl border px-2 py-2 text-xs font-bold" aria-label="Langue">
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
          <button type="button" onClick={() => patchFilters({ mode: mode === "production" ? "support" : "production" })} className="px-4 py-2 rounded-xl text-sm font-bold border border-[#00205b] text-[#00205b]">
            {t(lang, mode)}
          </button>
          <button type="button" onClick={() => signOut()} className="px-3 py-2 text-sm text-slate-500">
            {t(lang, "logout")}
          </button>
        </nav>
      </header>

      {adminMsg && (
        <div className="mx-6 mt-4 rounded-xl bg-[#00205b] text-white text-sm font-bold px-4 py-2 text-center">{adminMsg}</div>
      )}

      <main className="p-6 max-w-[1600px] mx-auto">
        {view === "equipe" && (
          <section className="glass rounded-3xl p-6">
            <div className="flex flex-wrap gap-3 items-center mb-6">
              <TeamFilterDropdown options={teamOptions} selected={teamSelections} onChange={(v) => patchFilters({ teamSelections: v })} />
              <select value={shiftFilter} onChange={(e) => patchFilters({ shiftFilter: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                {["Tous", "M", "A", "N", "J"].map((s) => (
                  <option key={s} value={s}>Quart {s}</option>
                ))}
              </select>
              <select value={workstationFilter} onChange={(e) => patchFilters({ workstationFilter: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                <option value="Tous">Poste Tous</option>
                {(appConfig.workstations ?? DISPLAY_POSTES).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex rounded-xl border overflow-hidden text-sm font-bold">
                <button type="button" className={`px-3 py-2 ${teamPeriod === "month" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => patchFilters({ teamPeriod: "month" })}>Mois</button>
                <button type="button" className={`px-3 py-2 ${teamPeriod === "week" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => patchFilters({ teamPeriod: "week" })}>Semaine</button>
              </div>
              <button type="button" onClick={openPrint} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-[#00205b] text-[#00205b]">{t(lang, "print")}</button>
              {canEdit && (
                <button type="button" onClick={() => setMassOpen(true)} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00b5e2] text-white">Modification groupée</button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => (teamPeriod === "week" ? shiftWeek(-1) : shiftMonth(-1))} className="px-3 py-2 rounded-lg bg-white border">←</button>
                <span className="text-sm font-bold">
                  {teamPeriod === "week"
                    ? `${t(lang, "week_of")} ${weekly?.weekDates?.[0]} ${t(lang, "to")} ${weekly?.weekDates?.[6]}`
                    : `${calendarMonth.month + 1}/${calendarMonth.year}`}
                </span>
                <button type="button" onClick={() => (teamPeriod === "week" ? shiftWeek(1) : shiftMonth(1))} className="px-3 py-2 rounded-lg bg-white border">→</button>
              </div>
            </div>

            {teamPeriod === "month" && monthly ? (
              <TeamMonthlyTable
                monthDates={monthly.monthDates}
                schedule={monthly.schedule}
                details={monthly.details}
                teamMembers={monthly.teamMembers}
                allPersonnel={data.personnel}
                userRole={userRole}
                userName={data.currentUser.name}
                userPersonnelId={data.currentUser.personnelId}
                groupByPoste={appConfig.groupByMachine}
                workstationFilter={workstationFilter}
                holidayCountry={appConfig.holidayCountry ?? "FR"}
                onCellClick={openCellEditor}
              />
            ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-300">
              <table className="w-full border-collapse text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left w-[20%] sticky left-0 bg-slate-100 z-10">Personnel</th>
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
                            onClick={canEditCell ? () => openCellEditor(member.id, date, status, cellDetails) : undefined}
                          />
                        );
                      })}
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {view === "individuelle" && (
          <section className="grid lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 glass rounded-3xl p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                <button type="button" onClick={() => setShowArchived(!showArchived)} className={`text-xs font-bold px-2 py-1 rounded-lg border ${showArchived ? "bg-slate-200" : ""}`}>
                  {showArchived ? "Archivés" : "Actifs"}
                </button>
                {isAdmin && canEdit && (
                  <button type="button" onClick={() => { setSelectedPerson(null); setPersonFormOpen(true); }} className="text-xs font-bold px-2 py-1 rounded-lg bg-[#00205b] text-white">
                    + Personne
                  </button>
                )}
              </div>
              <select value={reapFilter} onChange={(e) => setReapFilter(e.target.value)} className="w-full mb-2 rounded-xl border px-3 py-2 text-sm">
                <option value="Tous">Tous les REAP</option>
                {data.reapListForForm.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex flex-wrap gap-1 mb-3">
                <button type="button" onClick={() => setRoleFilter("Tous")} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${roleFilter === "Tous" ? "bg-[#00205b] text-white" : ""}`}>Tous</button>
                {[...new Set(data.personnel.map((p) => p.role))].sort().map((r) => (
                  <button key={r} type="button" onClick={() => setRoleFilter(r)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${roleFilter === r ? "bg-[#00205b] text-white" : ""}`}>{r}</button>
                ))}
              </div>
              <select value={sortPersonnel} onChange={(e) => patchFilters({ sortPersonnel: e.target.value })} className="w-full mb-3 rounded-xl border px-3 py-2 text-sm">
                <option value="nom">Tri par nom</option>
                <option value="role">Tri par rôle</option>
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
                      onClick={() => setSelectedPerson(p)}
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
                        <button type="button" onClick={() => setPersonFormOpen(true)} className="px-3 py-1 rounded-lg border text-xs font-bold">Modifier fiche</button>
                      )}
                      {isAdmin && selectedPerson.statut === "Archivé" && (
                        <button type="button" onClick={reactivatePerson} className="px-3 py-1 rounded-lg border border-green-400 text-green-700 text-xs font-bold">Réactiver</button>
                      )}
                      {isAdmin && selectedPerson.statut !== "Archivé" && (
                        <button type="button" onClick={archivePerson} className="px-3 py-1 rounded-lg border border-red-300 text-red-700 text-xs font-bold">Archiver</button>
                      )}
                      <button type="button" className="px-3 py-1 rounded-lg border" onClick={() => setCalendarMonth((m) => { const d = new Date(Date.UTC(m.year, m.month - 1, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; })}>←</button>
                      <span className="font-bold text-sm px-2">{calendarMonth.month + 1}/{calendarMonth.year}</span>
                      <button type="button" className="px-3 py-1 rounded-lg border" onClick={() => setCalendarMonth((m) => { const d = new Date(Date.UTC(m.year, m.month + 1, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; })}>→</button>
                      <button type="button" onClick={() => patchFilters({ showAnnual: !showAnnual })} className={`px-3 py-1 rounded-lg border text-xs font-bold ${showAnnual ? "bg-[#00205b] text-white" : ""}`}>Année</button>
                    </div>
                  </div>

                  {individualCounters && (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                      {[
                        { label: "CP", value: individualCounters.cp },
                        { label: "JRTT", value: individualCounters.jrtt },
                        { label: "Maladie", value: individualCounters.maladie },
                        { label: "Formation", value: individualCounters.formation },
                        { label: "Présence", value: individualCounters.presence },
                        { label: "Hors prod.", value: individualCounters.horsProd },
                      ].map((c) => (
                        <div key={c.label} className="bg-white/70 rounded-xl p-2 text-center border">
                          <div className="text-lg font-black text-[#00205b]">{c.value}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{c.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canEdit && (
                    <div className="mb-6 p-4 rounded-2xl bg-white/60 border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 mb-2">Appliquer une plage</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" />
                        <span className="text-slate-400">→</span>
                        <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" />
                        <select value={rangeStatus} onChange={(e) => setRangeStatus(e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                          {ALL_STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="button" onClick={applyRange} className="px-3 py-1 rounded-lg bg-[#00205b] text-white text-sm font-bold">Appliquer</button>
                      </div>
                    </div>
                  )}

                  {!showAnnual ? (
                  <>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d}>{d}</div>)}
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
                          onClick={() => openCellEditor(selectedPerson.id, dateKey, status, pres)}
                        >
                          <span>{day}</span>
                          {status && <span className="text-[9px] text-[#00205b]">{status}</span>}
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
                                <button key={day} type="button" onClick={() => openCellEditor(selectedPerson!.id, dateKey, status, yearPresences[dateKey])} className={`aspect-square rounded text-center ${status ? "bg-[#00b5e2]/30 font-bold" : "hover:bg-slate-100"}`}>
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
        )}

        {view === "indicateurs" && <IndicatorsView key={indicatorDate} mode={mode} selection={selectionParam} date={indicatorDate} teamOptions={teamOptions} />}
        {view === "capa" && <CapaView key={weekStart} mode={mode} weekStart={weekStart} isAdmin={isAdmin} />}
      </main>
      <HelpChatbot lang={lang} />
    </div>
  );
}
