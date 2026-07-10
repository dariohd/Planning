"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DayPresence, InitialData, WeeklySchedule } from "@/lib/types";
import { STATUS_BG } from "@/lib/constants";
import { canModifyPerson, canUserEdit } from "@/lib/client-permissions";
import { getMondayOfWeek } from "@/lib/shifts";
import { fullName } from "@/lib/personnel";
import { t, type Lang } from "@/lib/i18n";
import { MobilePresenceSheet } from "@/components/mobile/MobilePresenceSheet";
import { LinkToDesktopView } from "@/components/shared/DeviceViewSwitch";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/shared/ToastProvider";

const MOBILE_FILTERS_KEY = "planning:desktop";

function getMobileLang(): Lang {
  if (typeof window === "undefined") return "fr";
  try {
    const raw = localStorage.getItem(MOBILE_FILTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { lang?: string };
      if (parsed.lang === "en" || parsed.lang === "pt" || parsed.lang === "fr") return parsed.lang;
    }
  } catch {
    /* ignore */
  }
  return "fr";
}

type Tab = "equipe" | "stats" | "capa" | "annual";

const QUICK_STATUSES = ["M", "A", "N", "J", "CP", "Abs", "Ma", "F", ""];
const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

export default function MobileApp() {
  const { showToast } = useToast();
  const [lang] = useState<Lang>(() => getMobileLang());
  const [offline, setOffline] = useState(false);
  const [absDay, setAbsDay] = useState(0);
  const [annualMonth, setAnnualMonth] = useState<number | null>(null);
  const [data, setData] = useState<InitialData | null>(null);
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [selection, setSelection] = useState("Tous");
  const [shiftFilter, setShiftFilter] = useState("Tous");
  const [tab, setTab] = useState<Tab>("equipe");
  const [mode, setMode] = useState<"production" | "support">("production");
  const [sheet, setSheet] = useState<{ id: string; name: string; date: string; status: string; details?: DayPresence } | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [capa, setCapa] = useState<Record<string, unknown> | null>(null);
  const [annualPerson, setAnnualPerson] = useState<string | null>(null);
  const [yearPresences, setYearPresences] = useState<Record<string, DayPresence>>({});
  const touchStart = useRef<{ x: number; y: number; id: string; date: string } | null>(null);
  const canEdit = data ? canUserEdit(data.currentUser.role) : false;

  const onTouchStart = (e: React.TouchEvent, id: string, date: string) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, id, date };
  };

  const onTouchEnd = (e: React.TouchEvent, personId: string, date: string, current: string) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.id !== personId || start.date !== date || !canEdit) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    const idx = QUICK_STATUSES.indexOf(current);
    const next =
      dx > 0
        ? QUICK_STATUSES[(idx + 1) % QUICK_STATUSES.length]
        : QUICK_STATUSES[(idx - 1 + QUICK_STATUSES.length) % QUICK_STATUSES.length];
    void quickSetStatus(personId, date, next);
  };

  const load = useCallback(async () => {
    try {
      const cacheKey = `planning-cache-${mode}`;
      const initRes = await fetch(`/api/initial-data?mode=${mode}`);
      const init = await initRes.json();
      setData(init);
      setOffline(false);
      localStorage.setItem(cacheKey, JSON.stringify(init));
      const params = new URLSearchParams({ selection, weekStart, mode, shiftFilter });
      const weekRes = await fetch(`/api/team/week?${params}`);
      const weekData = await weekRes.json();
      setWeekly(weekData);
      localStorage.setItem(`${cacheKey}-week`, JSON.stringify(weekData));
      const indRes = await fetch(`/api/indicators?mode=${mode}&date=${weekStart}&selection=${selection}`);
      setStats(await indRes.json());
      const capaRes = await fetch(`/api/capa?mode=${mode}&weekStart=${weekStart}`);
      setCapa(await capaRes.json());
    } catch {
      const cacheKey = `planning-cache-${mode}`;
      const cached = localStorage.getItem(cacheKey);
      const cachedWeek = localStorage.getItem(`${cacheKey}-week`);
      if (cached) { setData(JSON.parse(cached)); setOffline(true); }
      if (cachedWeek) setWeekly(JSON.parse(cachedWeek));
    }
  }, [selection, weekStart, shiftFilter, mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch au montage + polling
    void load();
    const interval = setInterval(() => void load(), 45000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!annualPerson) return;
    const year = new Date().getFullYear();
    fetch(`/api/presences?personnelId=${annualPerson}&year=${year}`).then((r) => r.json()).then(setYearPresences);
  }, [annualPerson]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const savePresence = async (payload: { status: string; comment?: string; hs?: string; location?: string }) => {
    if (!sheet || !data) return;
    await fetch("/api/presences/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personnelId: sheet.id, date: sheet.date, status: payload.status, comment: payload.comment, hs: payload.hs, location: payload.location }),
    });
    setSheet(null);
    showToast(t(lang, "mobile_toast_saved"));
    load();
  };

  const quickSetStatus = async (personId: string, date: string, status: string) => {
    await fetch("/api/presences/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personnelId: personId, date, status }),
    });
    showToast(t(lang, "mobile_toast_updated"));
    await load();
  };

  const indicators = stats as {
    workforceTotals?: { total: number };
    compagnons?: { daily: Record<string, string[]>; weekly: Record<string, string[]> };
    interimaires?: { daily: Record<string, string[]>; weekly: Record<string, string[]> };
    monthlyAbsenceBreakdown?: Record<string, number>;
  } | null;
  const workforce = indicators;
  const presentDay = (workforce?.compagnons?.daily?.presence?.length ?? 0) + (workforce?.interimaires?.daily?.presence?.length ?? 0);
  const total = workforce?.workforceTotals?.total ?? 1;
  const rate = Math.round((presentDay / total) * 100);
  const absences = [...(workforce?.compagnons?.daily?.Ma ?? []), ...(workforce?.compagnons?.daily?.CP ?? [])];
  const pareto = Object.entries(indicators?.monthlyAbsenceBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const year = new Date().getFullYear();

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f4f7f9] text-[#00205b]">
      {offline && (
        <div className="bg-amber-100 text-amber-900 text-center text-[10px] font-bold py-1" role="status">{t(lang, "mobile_offline")}</div>
      )}
      <MobilePresenceSheet
        open={!!sheet}
        date={sheet?.date ?? ""}
        memberName={sheet?.name ?? ""}
        current={{ status: sheet?.status ?? "", comment: sheet?.details?.c, hs: sheet?.details?.hs, location: sheet?.details?.loc }}
        canEdit={canEdit && sheet ? canModifyPerson(data!.currentUser.role, data!.currentUser.name, data!.currentUser.personnelId, weekly!.teamMembers.find((m) => m.id === sheet.id)!, data!.personnel) : false}
        onSave={savePresence}
        onClose={() => setSheet(null)}
      />

      <header className="glass-nav px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="font-black text-lg italic">{data?.settings.appName ?? "Planning"}</h1>
          <p className="text-[10px] text-slate-500">{data?.currentUser.role}{!canEdit && ` · ${t(lang, "read_only")}`}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode(mode === "production" ? "support" : "production")} aria-label={mode === "production" ? t(lang, "production") : t(lang, "support")} className="text-xs font-bold px-2 py-1 rounded-lg border">{mode === "production" ? t(lang, "production").slice(0, 4) : t(lang, "support").slice(0, 7)}</button>
          <LinkToDesktopView lang={lang} />
          <button type="button" onClick={() => signOut()} className="text-xs text-slate-500 px-2">{t(lang, "mobile_logout")}</button>
        </div>
      </header>

      <div className="flex border-b border-slate-200 px-1 overflow-x-auto" role="tablist" aria-label={data?.settings.appName ?? "Planning"}>
        {(["equipe", "stats", "capa", "annual"] as const).map((tabKey) => (
          <button key={tabKey} type="button" role="tab" aria-selected={tab === tabKey} onClick={() => setTab(tabKey)} className={`flex-1 min-w-[70px] py-2 text-[10px] font-black uppercase ${tab === tabKey ? "text-[#00b5e2] border-b-2 border-[#00b5e2]" : "text-slate-400"}`}>
            {tabKey === "equipe" ? t(lang, "mobile_tab_team") : tabKey === "stats" ? t(lang, "mobile_tab_stats") : tabKey === "capa" ? t(lang, "mobile_tab_capa") : t(lang, "mobile_tab_annual")}
          </button>
        ))}
      </div>

      {tab === "equipe" && (
        <>
          <div className="px-4 py-3 flex gap-2 overflow-x-auto items-center flex-wrap">
            <select value={selection} onChange={(e) => setSelection(e.target.value)} aria-label={t(lang, "team")} className="rounded-xl border px-3 py-2 text-xs font-bold bg-white">
              <option value="Tous">{t(lang, "all")}</option>
              {data?.chefsEquipe.map((c) => <option key={c.name} value={`${c.name} (${c.role})`}>{c.name}</option>)}
            </select>
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} aria-label={t(lang, "shift")} className="rounded-xl border px-2 py-2 text-xs font-bold bg-white">
              {["Tous", "M", "A", "N", "J"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => shiftWeek(-1)} aria-label={t(lang, "mobile_prev_week")} className="px-3 rounded-xl bg-white border text-sm">←</button>
            <button type="button" onClick={() => shiftWeek(1)} aria-label={t(lang, "mobile_next_week")} className="px-3 rounded-xl bg-white border text-sm">→</button>
          </div>
          <main className="flex-1 overflow-y-auto px-3 pb-6 space-y-3">
            {weekly?.teamMembers?.map((member) => (
              <div key={member.id} className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="font-bold text-sm mb-1">{member.prenom} {member.nom}</div>
                <div className="text-[10px] text-slate-400 mb-2">{member.posteDeTravail}</div>
                <div className="grid grid-cols-7 gap-1">
                  {weekly.weekDates.map((date) => {
                    const st = weekly.schedule[member.id]?.[date] || "";
                    const bg = STATUS_BG[st] ?? "bg-slate-50";
                    const editable = canEdit && data && canModifyPerson(data.currentUser.role, data.currentUser.name, data.currentUser.personnelId, member, data.personnel);
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={!editable}
                        className={`text-center rounded-lg py-1 ${bg} text-xs font-bold`}
                        onTouchStart={(e) => onTouchStart(e, member.id, date)}
                        onTouchEnd={(e) => onTouchEnd(e, member.id, date, st)}
                        onClick={() => editable && setSheet({ id: member.id, name: fullName(member), date, status: st })}
                      >
                        <div className="text-[9px] text-slate-400">{date.slice(8)}</div>
                        {st || "·"}
                        {weekly.details?.[member.id]?.[date]?.c && <span className="block w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </main>
        </>
      )}

      {tab === "stats" && (
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 text-center">
            <div className="text-4xl font-black text-[#00b5e2]">{rate}%</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">{t(lang, "mobile_presence_rate")}</div>
            <p className="text-sm mt-4 text-slate-600">{presentDay} / {total} présents</p>
          </div>
          <div className="flex gap-1 justify-center">
            {WEEK_DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setAbsDay(i)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${absDay === i ? "bg-[#00205b] text-white" : "bg-white border"}`}>{d}</button>
            ))}
          </div>
          {pareto.length > 0 && (
            <div className="bg-white rounded-3xl p-4">
              <p className="text-xs font-bold text-slate-500 mb-3">Pareto absences (mois)</p>
              <div className="space-y-2">
                {pareto.map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-xs font-bold mb-1"><span>{type}</span><span>{count}</span></div>
                    <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${(count / pareto[0][1]) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {absences.length > 0 && (
            <div className="bg-white rounded-3xl p-4">
              <p className="text-xs font-bold text-slate-500 mb-2">Absences du jour</p>
              <ul className="text-sm space-y-1">{absences.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </main>
      )}

      {tab === "capa" && capa && (
        <main className="flex-1 p-4 space-y-3 overflow-y-auto">
          {Object.entries((capa as { postes?: Record<string, { total: number; target: number; M: number; A: number; N: number; J: number }> }).postes ?? {}).map(([poste, p]) => (
            <div key={poste} className="bg-white rounded-3xl p-4">
              <div className="flex justify-between font-black text-sm mb-2"><span>{poste}</span><span className="text-[#00b5e2]">{p.total}{p.target ? ` / ${p.target}` : ""}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2"><div className="h-full bg-[#00b5e2]" style={{ width: `${p.target ? Math.min(100, (p.total / p.target) * 100) : 0}%` }} /></div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">{(["M", "A", "N", "J"] as const).map((s) => <div key={s} className="bg-slate-50 rounded-lg py-2"><div className="font-bold">{p[s]}</div><div className="text-slate-400">{s}</div></div>)}</div>
            </div>
          ))}
        </main>
      )}

      {tab === "annual" && (
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          <select value={annualPerson ?? ""} onChange={(e) => setAnnualPerson(e.target.value || null)} aria-label={t(lang, "mobile_choose_member")} className="w-full rounded-xl border px-3 py-2 text-sm font-bold">
            <option value="">{t(lang, "mobile_choose_member")}</option>
            {weekly?.teamMembers?.map((m) => <option key={m.id} value={m.id}>{fullName(m)}</option>)}
          </select>
          {annualPerson && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, mi) => (
                  <button key={mi} type="button" onClick={() => setAnnualMonth(annualMonth === mi ? null : mi)} className={`rounded-xl p-2 border text-center ${annualMonth === mi ? "border-[#00b5e2] bg-white" : "bg-white/80"}`}>
                    <p className="text-[10px] font-bold mb-1">M{mi + 1}</p>
                    <p className="text-xs font-black text-[#00b5e2]">
                      {Object.entries(yearPresences).filter(([k, v]) => k.startsWith(`${year}-${String(mi + 1).padStart(2, "0")}`) && ["M", "A", "N", "J"].includes(v.s)).length}
                    </p>
                  </button>
                ))}
              </div>
              {annualMonth !== null && (
                <div className="bg-white rounded-2xl p-3 border">
                  <p className="text-xs font-black mb-2">Mois {annualMonth + 1}</p>
                  <div className="grid grid-cols-7 gap-1 text-[9px]">
                    {Array.from({ length: new Date(Date.UTC(year, annualMonth + 1, 0)).getUTCDate() }, (_, d) => {
                      const day = d + 1;
                      const dateKey = `${year}-${String(annualMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const st = yearPresences[dateKey]?.s ?? "";
                      const bg = STATUS_BG[st] ?? "bg-slate-50";
                      return (
                        <div key={day} className={`text-center rounded py-1 ${bg} font-bold`}>
                          <div className="text-slate-400">{day}</div>
                          {st || "·"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}
