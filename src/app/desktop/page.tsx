"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppMode, DayPresence, PersonnelRecord, WeeklySchedule } from "@/lib/types";
import { computeIndividualCounters } from "@/lib/counters";
import { DISPLAY_POSTES } from "@/lib/constants";
import { usePlanningFilters } from "@/lib/usePlanningFilters";
import { canUserEdit, isAdministrator } from "@/lib/client-permissions";
import { getMondayOfWeek } from "@/lib/shifts";
import { mapTeamSelectionForApi, sectorOptionLabel } from "@/lib/sectors";
import { fullName } from "@/lib/personnel";
import { PresenceEditor } from "@/components/shared/PresenceEditor";
import { IndicatorsView } from "@/components/desktop/IndicatorsView";
import { CapaView } from "@/components/desktop/CapaView";
import { MassUpdateModal } from "@/components/desktop/MassUpdateModal";
import { PersonnelForm } from "@/components/desktop/PersonnelForm";
import { SettingsModal } from "@/components/desktop/SettingsModal";
import { DesktopHeader } from "@/components/desktop/DesktopHeader";
import { ManagerGuideBanner } from "@/components/desktop/ManagerGuideBanner";
import { GuideModal } from "@/components/desktop/GuideModal";
import { TeamViewSection } from "@/components/desktop/TeamViewSection";
import { IndividualViewSection } from "@/components/desktop/IndividualViewSection";
import { useDesktopData } from "@/hooks/useDesktopData";
import { t, type Lang } from "@/lib/i18n";
import { useToast } from "@/components/shared/ToastProvider";
import { signOut, useSession } from "next-auth/react";

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
  const [showArchived, setShowArchived] = useState(false);
  const { data, loading, error, loadInitial, pollUpdates } = useDesktopData(mode, showArchived);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonnelRecord | null>(null);
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [reapFilter, setReapFilter] = useState("Tous");
  const [yearPresences, setYearPresences] = useState<Record<string, DayPresence>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [editor, setEditor] = useState<EditorState>(null);
  const [massOpen, setMassOpen] = useState(false);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeStatus, setRangeStatus] = useState("CP");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

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

  const sectors = data?.settings.sectorsConfig ?? [];

  const selectionParam = teamSelections
    .map((s) => mapTeamSelectionForApi(s, sectors))
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
    const interval = setInterval(() => {
      void pollUpdates(() => {
        if (view === "equipe") refreshTeam();
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [view, pollUpdates, refreshTeam]);

  const hasTeamPresences = useMemo(() => {
    if (monthly?.schedule) {
      return Object.values(monthly.schedule).some((days) => Object.keys(days).length > 0);
    }
    if (weekly?.schedule) {
      return Object.values(weekly.schedule).some((days) => Object.values(days).some(Boolean));
    }
    return true;
  }, [monthly, weekly]);

  const teamOptions = useMemo(() => {
    if (!data) return ["Tous"];
    const sectorOpts =
      data.settings.enableSectors && data.settings.sectorsConfig?.length
        ? data.settings.sectorsConfig.map((s) => sectorOptionLabel(s))
        : [];
    return ["Tous", "Non affectés 3×8", ...sectorOpts, ...data.chefsEquipe.map((c) => `${c.name} (${c.role})`)];
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
    const res = await fetch("/api/presences/range/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast((err as { error?: string }).error ?? "Modification groupée échouée", { error: true });
      return;
    }
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
        {t(lang, "loading")}
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

      <GuideModal
        open={guideOpen}
        lang={lang}
        userRole={userRole}
        onClose={() => setGuideOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        isAdmin={isAdmin}
        lang={lang}
        onClose={() => { setSettingsOpen(false); void loadInitial(); }}
        onGenerateYear={generateYear}
      />

      <DesktopHeader
        appName={data.settings.appName}
        userName={session?.user?.name}
        userRole={data.currentUser.role}
        canEdit={canEdit}
        view={view}
        lang={lang}
        mode={mode}
        isAdmin={isAdmin}
        onViewChange={setView}
        onSettingsOpen={() => setSettingsOpen(true)}
        onGuideOpen={() => setGuideOpen(true)}
        onLangChange={(l) => patchFilters({ lang: l })}
        onModeToggle={() => patchFilters({ mode: mode === "production" ? "support" : "production" })}
      />

      <ManagerGuideBanner
        lang={lang}
        isAdmin={isAdmin}
        canEdit={canEdit}
        hasPresences={hasTeamPresences}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {adminMsg && (
        <div className="mx-6 mt-4 rounded-xl bg-[#00205b] text-white text-sm font-bold px-4 py-2 text-center">{adminMsg}</div>
      )}

      <main className="p-6 max-w-[1600px] mx-auto">
        {view === "equipe" && (
          <TeamViewSection
            lang={lang}
            data={data}
            teamOptions={teamOptions}
            teamSelections={teamSelections}
            shiftFilter={shiftFilter}
            workstationFilter={workstationFilter}
            teamPeriod={teamPeriod}
            workstations={appConfig.workstations}
            groupByMachine={appConfig.groupByMachine}
            holidayCountry={appConfig.holidayCountry}
            userRole={userRole}
            canEdit={canEdit}
            isAdmin={isAdmin}
            hasTeamPresences={hasTeamPresences}
            weekly={weekly}
            monthly={monthly}
            calendarMonth={calendarMonth}
            onFilterChange={patchFilters}
            onPrint={openPrint}
            onMassOpen={() => setMassOpen(true)}
            onShiftWeek={shiftWeek}
            onShiftMonth={shiftMonth}
            onGenerateYear={() => generateYear(calendarMonth.year)}
            onCellClick={openCellEditor}
          />
        )}

        {view === "individuelle" && (
          <IndividualViewSection
            lang={lang}
            data={data}
            filteredPersonnel={filteredPersonnel}
            selectedPerson={selectedPerson}
            showArchived={showArchived}
            roleFilter={roleFilter}
            reapFilter={reapFilter}
            sortPersonnel={sortPersonnel}
            calendarMonth={calendarMonth}
            showAnnual={showAnnual}
            yearPresences={yearPresences}
            daysInMonth={daysInMonth}
            individualCounters={individualCounters}
            canEdit={canEdit}
            isAdmin={isAdmin}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangeStatus={rangeStatus}
            onShowArchivedToggle={() => setShowArchived(!showArchived)}
            onAddPerson={() => { setSelectedPerson(null); setPersonFormOpen(true); }}
            onReapFilter={setReapFilter}
            onRoleFilter={setRoleFilter}
            onSortChange={(v) => patchFilters({ sortPersonnel: v })}
            onSelectPerson={setSelectedPerson}
            onEditPerson={() => setPersonFormOpen(true)}
            onArchive={archivePerson}
            onReactivate={reactivatePerson}
            onMonthPrev={() => setCalendarMonth((m) => { const d = new Date(Date.UTC(m.year, m.month - 1, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; })}
            onMonthNext={() => setCalendarMonth((m) => { const d = new Date(Date.UTC(m.year, m.month + 1, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; })}
            onToggleAnnual={() => patchFilters({ showAnnual: !showAnnual })}
            onRangeStart={setRangeStart}
            onRangeEnd={setRangeEnd}
            onRangeStatus={setRangeStatus}
            onApplyRange={applyRange}
            onCellClick={openCellEditor}
          />
        )}

        {view === "indicateurs" && <IndicatorsView key={indicatorDate} mode={mode} selection={selectionParam} date={indicatorDate} teamOptions={teamOptions} />}
        {view === "capa" && <CapaView key={weekStart} mode={mode} weekStart={weekStart} isAdmin={isAdmin} />}
      </main>
    </div>
  );
}
