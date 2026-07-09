"use client";

import { useCallback, useEffect, useState } from "react";
import type { DayPresence, InitialData, WeeklySchedule } from "@/lib/types";
import { STATUS_BG } from "@/lib/constants";
import { canModifyPerson, canUserEdit } from "@/lib/client-permissions";
import { getMondayOfWeek } from "@/lib/shifts";
import { fullName } from "@/lib/personnel";
import { MobilePresenceSheet } from "@/components/mobile/MobilePresenceSheet";
import Link from "next/link";
import { signOut } from "next-auth/react";

type Tab = "equipe" | "stats" | "capa";

export default function MobileApp() {
  const [data, setData] = useState<InitialData | null>(null);
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [selection, setSelection] = useState("Tous");
  const [shiftFilter, setShiftFilter] = useState("Tous");
  const [tab, setTab] = useState<Tab>("equipe");
  const [sheet, setSheet] = useState<{
    id: string;
    name: string;
    date: string;
    status: string;
    details?: DayPresence;
  } | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [capa, setCapa] = useState<Record<string, unknown> | null>(null);

  const canEdit = data ? canUserEdit(data.currentUser.role) : false;

  const load = useCallback(async () => {
    const initRes = await fetch("/api/initial-data?mode=production");
    const init = await initRes.json();
    setData(init);

    const params = new URLSearchParams({ selection, weekStart, mode: "production", shiftFilter });
    const weekRes = await fetch(`/api/team/week?${params}`);
    setWeekly(await weekRes.json());

    const indRes = await fetch(`/api/indicators?mode=production&date=${weekStart}&selection=${selection}`);
    setStats(await indRes.json());

    const capaRes = await fetch(`/api/capa?mode=production&weekStart=${weekStart}`);
    setCapa(await capaRes.json());
  }, [selection, weekStart, shiftFilter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, [load]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const savePresence = async (payload: { status: string; comment?: string; hs?: string }) => {
    if (!sheet || !data) return;
    await fetch("/api/presences/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId: sheet.id,
        date: sheet.date,
        status: payload.status,
        comment: payload.comment,
        hs: payload.hs,
      }),
    });
    load();
  };

  const presentCount = weekly?.teamMembers?.reduce((acc, m) => {
    for (const d of weekly.weekDates ?? []) {
      const s = weekly.schedule[m.id]?.[d];
      if (s === "M" || s === "A" || s === "N" || s === "J") acc++;
    }
    return acc;
  }, 0);

  const workforce = stats as { workforceTotals?: { total: number }; compagnons?: { daily: { presence?: string[] } }; interimaires?: { daily: { presence?: string[] } } } | null;
  const presentDay = (workforce?.compagnons?.daily?.presence?.length ?? 0) + (workforce?.interimaires?.daily?.presence?.length ?? 0);
  const total = workforce?.workforceTotals?.total ?? 1;
  const rate = Math.round((presentDay / total) * 100);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f4f7f9] text-[#00205b]">
      <MobilePresenceSheet
        open={!!sheet}
        date={sheet?.date ?? ""}
        memberName={sheet?.name ?? ""}
        current={{ status: sheet?.status ?? "", comment: sheet?.details?.c, hs: sheet?.details?.hs }}
        canEdit={canEdit && sheet ? canModifyPerson(data!.currentUser.role, data!.currentUser.name, data!.currentUser.personnelId, weekly!.teamMembers.find((m) => m.id === sheet.id)!, data!.personnel) : false}
        onSave={savePresence}
        onClose={() => setSheet(null)}
      />

      <header className="glass-nav px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="font-black text-lg italic">{data?.settings.appName ?? "Planning"}</h1>
          <p className="text-[10px] text-slate-500">{data?.currentUser.role}{!canEdit && " · lecture seule"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/desktop" className="text-xs font-bold px-3 py-2 rounded-xl bg-white border">Bureau</Link>
          <button type="button" onClick={() => signOut()} className="text-xs text-slate-500 px-2">Sortir</button>
        </div>
      </header>

      <div className="flex border-b border-slate-200 px-2">
        {(["equipe", "stats", "capa"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-black uppercase ${tab === t ? "text-[#00b5e2] border-b-2 border-[#00b5e2]" : "text-slate-400"}`}>
            {t === "equipe" ? "Équipe" : t === "stats" ? "Stats" : "Capa"}
          </button>
        ))}
      </div>

      {tab === "equipe" && (
        <>
          <div className="px-4 py-3 flex gap-2 overflow-x-auto items-center">
            <select value={selection} onChange={(e) => setSelection(e.target.value)} className="rounded-xl border px-3 py-2 text-xs font-bold bg-white flex-shrink-0">
              <option value="Tous">Tous</option>
              {data?.chefsEquipe.map((c) => (
                <option key={c.name} value={`${c.name} (${c.role})`}>{c.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => shiftWeek(-1)} className="px-3 rounded-xl bg-white border text-sm">←</button>
            <button type="button" onClick={() => shiftWeek(1)} className="px-3 rounded-xl bg-white border text-sm">→</button>
          </div>
          <main className="flex-1 overflow-y-auto px-3 pb-6 space-y-3">
            {weekly?.teamMembers?.map((member) => (
              <div key={member.id} className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="font-bold text-sm mb-1">{member.prenom} {member.nom}</div>
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
                        onClick={() => editable && setSheet({ id: member.id, name: fullName(member), date, status: st })}
                      >
                        <div className="text-[9px] text-slate-400">{date.slice(8)}</div>
                        {st || "·"}
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
        <main className="flex-1 p-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 text-center">
            <div className="text-4xl font-black text-[#00b5e2]">{rate}%</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">Taux de présence</div>
            <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#00b5e2] rounded-full" style={{ width: `${rate}%` }} />
            </div>
            <p className="text-sm mt-4 text-slate-600">{presentDay} / {total} présents aujourd&apos;hui</p>
          </div>
          <div className="bg-white rounded-3xl p-4">
            <p className="text-xs font-bold text-slate-500 mb-2">Semaine</p>
            <p className="text-sm font-bold">{presentCount ?? 0} présences enregistrées</p>
          </div>
        </main>
      )}

      {tab === "capa" && capa && (
        <main className="flex-1 p-4 space-y-3 overflow-y-auto">
          {Object.entries((capa as { postes?: Record<string, { total: number; target: number; M: number; A: number; N: number; J: number }> }).postes ?? {}).map(([poste, p]) => (
            <div key={poste} className="bg-white rounded-3xl p-4">
              <div className="flex justify-between font-black text-sm mb-2">
                <span>{poste}</span>
                <span className="text-[#00b5e2]">{p.total}{p.target ? ` / ${p.target}` : ""}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {(["M", "A", "N", "J"] as const).map((s) => (
                  <div key={s} className="bg-slate-50 rounded-lg py-2"><div className="font-bold">{p[s]}</div><div className="text-slate-400">{s}</div></div>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}
    </div>
  );
}
