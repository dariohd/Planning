"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppMode, InitialData, PersonnelRecord, WeeklySchedule } from "@/lib/types";
import { getMondayOfWeek } from "@/lib/shifts";
import { fullName } from "@/lib/personnel";
import { StatusCell } from "@/components/shared/StatusCell";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const STATUSES = ["", "M", "A", "N", "J", "CP", "Abs", "JRTT", "F", "Ma"];

export default function DesktopApp() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<AppMode>("production");
  const [view, setView] = useState<"equipe" | "individuelle">("equipe");
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
    }
    setLoading(false);
  }, [mode]);

  const loadWeekly = useCallback(async () => {
    const params = new URLSearchParams({
      selection,
      weekStart,
      mode,
      shiftFilter,
    });
    const res = await fetch(`/api/team/week?${params}`);
    const json = await res.json();
    setWeekly(json);
  }, [selection, weekStart, mode, shiftFilter]);

  const loadPersonYear = useCallback(async (personId: string, year: number) => {
    const res = await fetch(`/api/presences?personnelId=${personId}&year=${year}`);
    const json = await res.json();
    setYearPresences(json);
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (view === "equipe") loadWeekly();
  }, [view, loadWeekly]);

  useEffect(() => {
    if (selectedPerson) {
      loadPersonYear(selectedPerson.id, calendarMonth.year);
    }
  }, [selectedPerson, calendarMonth.year, loadPersonYear]);

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

  const daysInMonth = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(Date.UTC(year, month, 1));
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startPad = (first.getUTCDay() + 6) % 7;
    return { count, startPad };
  }, [calendarMonth]);

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
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass border-b border-white/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#00205b]">
            {data.settings.appName}
          </h1>
          <p className="text-xs text-slate-500">
            {session?.user?.name} — {data.currentUser.role}
          </p>
        </div>

        <nav className="flex gap-2">
          <button
            type="button"
            className="nav-link px-4 py-2 rounded-xl text-sm font-bold"
            aria-selected={view === "equipe"}
            onClick={() => setView("equipe")}
          >
            Équipe
          </button>
          <button
            type="button"
            className="nav-link px-4 py-2 rounded-xl text-sm font-bold"
            aria-selected={view === "individuelle"}
            onClick={() => setView("individuelle")}
          >
            Individuel
          </button>
          <Link href="/mobile" className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00b5e2] text-white">
            Mobile
          </Link>
          <button
            type="button"
            onClick={() => setMode(mode === "production" ? "support" : "production")}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-[#00205b] text-[#00205b]"
          >
            {mode === "production" ? "Production" : "Support"}
          </button>
          <button type="button" onClick={() => signOut()} className="px-3 py-2 text-sm text-slate-500">
            Déconnexion
          </button>
        </nav>
      </header>

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
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => shiftWeek(-1)} className="px-3 py-2 rounded-lg bg-white border">
                  ←
                </button>
                <span className="text-sm font-bold">
                  Semaine du {weekly?.weekDates?.[0]} au {weekly?.weekDates?.[6]}
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
                    <tr
                      key={member.id}
                      className={member.role === "Intérimaire" ? "bg-cyan-50" : ""}
                    >
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
                          onClick={() => {
                            const current = weekly.schedule[member.id]?.[date] ?? "";
                            const idx = STATUSES.indexOf(current);
                            const next = STATUSES[(idx + 1) % STATUSES.length];
                            updatePresence(member.id, date, next);
                          }}
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
                placeholder="Rechercher..."
                className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  const el = document.querySelectorAll("[data-person-item]");
                  el.forEach((node) => {
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
                      <div className="text-xs text-slate-500">{p.role} — {p.section}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="lg:col-span-8 glass rounded-3xl p-6">
              {!selectedPerson ? (
                <p className="text-center text-slate-500 py-20">Sélectionnez un collaborateur</p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black uppercase italic text-[#00205b]">
                      {fullName(selectedPerson)}
                    </h2>
                    <div className="flex gap-2">
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
                          className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold hover:bg-slate-100 ${bg}`}
                          onClick={() => {
                            const idx = STATUSES.indexOf(status);
                            const next = STATUSES[(idx + 1) % STATUSES.length];
                            updatePresence(selectedPerson.id, dateKey, next);
                          }}
                        >
                          <span>{day}</span>
                          {status && (
                            <span className="absolute text-[9px] mt-5 text-[#00205b]">{status}</span>
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
      </main>
    </div>
  );
}
