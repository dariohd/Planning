"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppMode, InitialData, PersonnelRecord, WeeklySchedule } from "@/lib/types";
import { ALL_STATUSES } from "@/lib/constants";
import { getMondayOfWeek } from "@/lib/shifts";
import { fullName } from "@/lib/personnel";
import { StatusCell } from "@/components/shared/StatusCell";
import { StatusPicker } from "@/components/shared/StatusPicker";
import { IndicatorsView } from "@/components/desktop/IndicatorsView";
import { CapaView } from "@/components/desktop/CapaView";
import { t, type Lang } from "@/lib/i18n";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

type View = "equipe" | "individuelle" | "indicateurs" | "capa";

type PickerState = { personnelId: string; date: string; status: string } | null;

export default function DesktopApp() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<Lang>("fr");
  const [mode, setMode] = useState<AppMode>("production");
  const [view, setView] = useState<View>("equipe");
  const [data, setData] = useState<InitialData | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [selection, setSelection] = useState("Tous");
  const [shiftFilter, setShiftFilter] = useState("Tous");
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonnelRecord | null>(null);
  const [yearPresences, setYearPresences] = useState<Record<string, { s: string }>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<PickerState>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeStatus, setRangeStatus] = useState("CP");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const lastModifiedRef = useRef<string>("0");

  const isAdmin = data?.currentUser.role === "Administrateur";

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/initial-data?mode=${mode}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erreur de chargement");
      setData(null);
    } else {
      setData(json);
      lastModifiedRef.current = String(json.lastModified ?? "0");
    }
    setLoading(false);
  }, [mode]);

  const loadWeekly = useCallback(async () => {
    const params = new URLSearchParams({ selection, weekStart, mode, shiftFilter });
    const res = await fetch(`/api/team/week?${params}`);
    setWeekly(await res.json());
  }, [selection, weekStart, mode, shiftFilter]);

  const loadPersonYear = useCallback(async (personId: string, year: number) => {
    const res = await fetch(`/api/presences?personnelId=${personId}&year=${year}`);
    setYearPresences(await res.json());
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (view === "equipe" || view === "capa") loadWeekly();
  }, [view, loadWeekly]);

  useEffect(() => {
    if (selectedPerson) loadPersonYear(selectedPerson.id, calendarMonth.year);
  }, [selectedPerson, calendarMonth.year, loadPersonYear]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/updates?since=${lastModifiedRef.current}&mode=${mode}`
      );
      const json = await res.json();
      if (json.hasChanges && json.newData) {
        setData(json.newData);
        lastModifiedRef.current = String(json.lastModified);
        if (view === "equipe") loadWeekly();
      } else if (json.lastModified) {
        lastModifiedRef.current = String(json.lastModified);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [mode, view, loadWeekly]);

  const teamOptions = useMemo(() => {
    if (!data) return ["Tous"];
    return ["Tous", ...data.chefsEquipe.map((c) => `${c.name} (${c.role})`)];
  }, [data]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const updatePresence = async (personnelId: string, date: string, status: string) => {
    await fetch("/api/presences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personnelId, date, status }),
    });
    if (view === "equipe") loadWeekly();
    if (selectedPerson?.id === personnelId) loadPersonYear(personnelId, calendarMonth.year);
  };

  const applyRange = async () => {
    if (!selectedPerson || !rangeStart || !rangeEnd) return;
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
    setAdminMsg("Plage appliquée");
    setTimeout(() => setAdminMsg(null), 3000);
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

  const generateYear = async () => {
    const year = calendarMonth.year;
    if (!confirm(`Générer les plannings ${year} pour tous les collaborateurs ?`)) return;
    setAdminMsg("Génération en cours...");
    const res = await fetch("/api/schedule/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    const json = await res.json();
    setAdminMsg(res.ok ? `Année ${year} générée (${json.created ?? 0} entrées)` : json.error);
    setTimeout(() => setAdminMsg(null), 5000);
  };

  const openPrint = () => {
    const params = new URLSearchParams({ selection, weekStart, mode, lang });
    window.open(`/api/print/week?${params}`, "_blank");
  };

  const daysInMonth = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(Date.UTC(year, month, 1));
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startPad = (first.getUTCDay() + 6) % 7;
    return { count, startPad };
  }, [calendarMonth]);

  const indicatorDate = weekly?.weekDates?.[0] ?? weekStart;

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
      <StatusPicker
        open={!!picker}
        current={picker?.status ?? ""}
        onSelect={(s) => {
          if (picker) updatePresence(picker.personnelId, picker.date, s);
        }}
        onClose={() => setPicker(null)}
      />

      <header className="sticky top-0 z-20 glass border-b border-white/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#00205b]">
            {data.settings.appName}
          </h1>
          <p className="text-xs text-slate-500">
            {session?.user?.name} — {data.currentUser.role}
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 items-center">
          {(["equipe", "individuelle", "indicateurs", "capa"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className="nav-link px-4 py-2 rounded-xl text-sm font-bold"
              aria-selected={view === v}
              onClick={() => setView(v)}
            >
              {t(lang, v === "equipe" ? "team" : v === "individuelle" ? "individual" : v === "indicateurs" ? "indicators" : "capa")}
            </button>
          ))}
          <Link href="/mobile" className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00b5e2] text-white">
            {t(lang, "mobile")}
          </Link>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold"
            aria-label="Langue"
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
          <button
            type="button"
            onClick={() => setMode(mode === "production" ? "support" : "production")}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-[#00205b] text-[#00205b]"
          >
            {t(lang, mode)}
          </button>
          <button type="button" onClick={() => signOut()} className="px-3 py-2 text-sm text-slate-500">
            {t(lang, "logout")}
          </button>
        </nav>
      </header>

      {adminMsg && (
        <div className="mx-6 mt-4 rounded-xl bg-[#00205b] text-white text-sm font-bold px-4 py-2 text-center">
          {adminMsg}
        </div>
      )}

      <main className="p-6 max-w-[1600px] mx-auto">
        {view === "equipe" && (
          <section className="glass rounded-3xl p-6">
            <div className="flex flex-wrap gap-3 items-center mb-6">
              <select
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {teamOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {["Tous", "M", "A", "N", "J"].map((s) => (
                  <option key={s} value={s}>
                    Quart {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openPrint}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-[#00205b] text-[#00205b]"
              >
                {t(lang, "print")}
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => shiftWeek(-1)} className="px-3 py-2 rounded-lg bg-white border">
                  ←
                </button>
                <span className="text-sm font-bold">
                  {t(lang, "week_of")} {weekly?.weekDates?.[0]} {t(lang, "to")} {weekly?.weekDates?.[6]}
                </span>
                <button type="button" onClick={() => shiftWeek(1)} className="px-3 py-2 rounded-lg bg-white border">
                  →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-300">
              <table className="w-full border-collapse text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left w-[28%]">Personnel</th>
                    {weekly?.weekDates?.map((d) => (
                      <th key={d} className="border border-slate-300 p-2 text-center">
                        {d.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekly?.teamMembers?.map((member) => (
                    <tr key={member.id} className={member.role === "Intérimaire" ? "bg-cyan-50" : ""}>
                      <td className="border border-slate-300 p-2">
                        <div className="font-bold">
                          {member.nom} {member.prenom}
                        </div>
                        <div className="text-xs text-slate-500">
                          {member.posteDeTravail} — {member.matricule}
                        </div>
                      </td>
                      {weekly.weekDates.map((date) => (
                        <StatusCell
                          key={date}
                          status={weekly.schedule[member.id]?.[date] ?? ""}
                          onClick={() =>
                            setPicker({
                              personnelId: member.id,
                              date,
                              status: weekly.schedule[member.id]?.[date] ?? "",
                            })
                          }
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "individuelle" && (
          <section className="grid lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 glass rounded-3xl p-4 max-h-[80vh] overflow-y-auto">
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
                {data.personnel.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      data-person-item
                      data-search={`${p.nom} ${p.prenom}`.toLowerCase()}
                      onClick={() => setSelectedPerson(p)}
                      className={`w-full text-left p-3 rounded-2xl border transition ${
                        selectedPerson?.id === p.id
                          ? "border-[#00b5e2] bg-white shadow"
                          : "border-transparent hover:bg-white/70"
                      }`}
                    >
                      <div className="font-bold text-sm">
                        {p.nom} {p.prenom}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.role} — {p.section}
                      </div>
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
                    <h2 className="text-2xl font-black uppercase italic text-[#00205b]">
                      {fullName(selectedPerson)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={generateYear}
                            className="px-3 py-1 rounded-lg border text-xs font-bold"
                          >
                            {t(lang, "generate_year")}
                          </button>
                          <button
                            type="button"
                            onClick={archivePerson}
                            className="px-3 py-1 rounded-lg border border-red-300 text-red-700 text-xs font-bold"
                          >
                            Archiver
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg border"
                        onClick={() =>
                          setCalendarMonth((m) => {
                            const d = new Date(Date.UTC(m.year, m.month - 1, 1));
                            return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
                          })
                        }
                      >
                        ←
                      </button>
                      <span className="font-bold text-sm px-2">
                        {calendarMonth.month + 1}/{calendarMonth.year}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg border"
                        onClick={() =>
                          setCalendarMonth((m) => {
                            const d = new Date(Date.UTC(m.year, m.month + 1, 1));
                            return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
                          })
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 p-4 rounded-2xl bg-white/60 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 mb-2">Appliquer une plage</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="rounded-lg border px-2 py-1 text-sm"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="rounded-lg border px-2 py-1 text-sm"
                      />
                      <select
                        value={rangeStatus}
                        onChange={(e) => setRangeStatus(e.target.value)}
                        className="rounded-lg border px-2 py-1 text-sm"
                      >
                        {ALL_STATUSES.filter(Boolean).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={applyRange}
                        className="px-3 py-1 rounded-lg bg-[#00205b] text-white text-sm font-bold"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: daysInMonth.startPad }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth.count }).map((_, i) => {
                      const day = i + 1;
                      const dateKey = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const status = yearPresences[dateKey]?.s ?? "";
                      const bg = status ? "ring-2 ring-[#00b5e2]" : "";
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`relative aspect-square rounded-full flex flex-col items-center justify-center text-xs font-bold hover:bg-slate-100 ${bg}`}
                          onClick={() =>
                            setPicker({
                              personnelId: selectedPerson.id,
                              date: dateKey,
                              status,
                            })
                          }
                        >
                          <span>{day}</span>
                          {status && (
                            <span className="text-[9px] text-[#00205b]">{status}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {view === "indicateurs" && (
          <IndicatorsView mode={mode} selection={selection} date={indicatorDate} />
        )}

        {view === "capa" && <CapaView mode={mode} weekStart={weekStart} />}
      </main>
    </div>
  );
}
