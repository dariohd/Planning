"use client";

import { useCallback, useEffect, useState } from "react";
import type { InitialData, WeeklySchedule } from "@/lib/types";
import { getMondayOfWeek } from "@/lib/shifts";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function MobileApp() {
  const [data, setData] = useState<InitialData | null>(null);
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [selection, setSelection] = useState("Tous");

  const load = useCallback(async () => {
    const initRes = await fetch("/api/initial-data?mode=production");
    const init = await initRes.json();
    setData(init);

    const params = new URLSearchParams({ selection, weekStart, mode: "production", shiftFilter: "Tous" });
    const weekRes = await fetch(`/api/team/week?${params}`);
    setWeekly(await weekRes.json());
  }, [selection, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f4f7f9] text-[#00205b]">
      <header className="glass-nav px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="font-black text-lg italic">Planning</h1>
          <p className="text-[10px] text-slate-500">{data?.currentUser.role}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/desktop" className="text-xs font-bold px-3 py-2 rounded-xl bg-white border">
            Bureau
          </Link>
          <button type="button" onClick={() => signOut()} className="text-xs text-slate-500 px-2">
            Sortir
          </button>
        </div>
      </header>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        <select
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-bold bg-white flex-shrink-0"
        >
          <option value="Tous">Tous</option>
          {data?.chefsEquipe.map((c) => (
            <option key={c.name} value={`${c.name} (${c.role})`}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => shiftWeek(-1)} className="px-3 rounded-xl bg-white border text-sm">
          ←
        </button>
        <button type="button" onClick={() => shiftWeek(1)} className="px-3 rounded-xl bg-white border text-sm">
          →
        </button>
      </div>

      <main className="flex-1 overflow-y-auto px-3 pb-6 space-y-3">
        {weekly?.teamMembers?.map((member) => (
          <div key={member.id} className="bg-white rounded-3xl p-4 shadow-sm">
            <div className="font-bold text-sm mb-2">
              {member.prenom} {member.nom}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekly.weekDates.map((date) => (
                <div key={date} className="text-center">
                  <div className="text-[9px] text-slate-400 mb-1">{date.slice(8)}</div>
                  <div className="text-xs font-bold rounded-lg py-1 bg-slate-50">
                    {weekly.schedule[member.id]?.[date] || "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
