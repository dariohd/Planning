"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { DISPLAY_POSTES } from "@/lib/constants";
import type { AppMode } from "@/lib/types";
import { getMondayOfWeek } from "@/lib/shifts";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type Props = {
  mode: AppMode;
  weekStart: string;
  isAdmin?: boolean;
};

type WeeklyCapa = {
  weekStart: string;
  weekEnd: string;
  postes: Record<string, { M: number; A: number; N: number; J: number; total: number; target: number }>;
};

type AnnualCapa = {
  year: number;
  kpis?: { coverage: number; criticalWeeks: number; okWeeks: number };
  postes: Record<
    string,
    { weeks: number[]; targets: number[]; reels: (number | null)[]; etp: number[]; capa: number[] }
  >;
};

export function CapaView({ mode, weekStart, isAdmin }: Props) {
  const [view, setView] = useState<"week" | "year">("year");
  const [yearMode, setYearMode] = useState<"52" | "10">("10");
  const [weekNav, setWeekNav] = useState(weekStart);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedPoste, setSelectedPoste] = useState<string>(DISPLAY_POSTES[0]);
  const [weekly, setWeekly] = useState<WeeklyCapa | null>(null);
  const [annual, setAnnual] = useState<AnnualCapa | null>(null);
  const [reelInput, setReelInput] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(1);

  const activeWeekStart = view === "week" ? weekNav : weekStart;

  useEffect(() => {
    if (view === "week") {
      const params = new URLSearchParams({ mode, weekStart: activeWeekStart });
      fetch(`/api/capa?${params}`).then((r) => r.json()).then(setWeekly);
    } else {
      const params = new URLSearchParams({ mode, year: String(year), annual: "true" });
      if (yearMode === "10") params.set("window", "10");
      fetch(`/api/capa?${params}`).then((r) => r.json()).then(setAnnual);
    }
  }, [view, mode, activeWeekStart, year, yearMode]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekNav}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekNav(d.toISOString().slice(0, 10));
  };

  const posteData = annual?.postes[selectedPoste];

  const annualChart = useMemo(() => {
    if (!posteData) return null;
    return {
      labels: posteData.weeks.map((w) => `S${w}`),
      datasets: [
        { label: "ETP", data: posteData.etp, borderColor: "#00b5e2", backgroundColor: "#00b5e2", tension: 0.2 },
        { label: "Cible", data: posteData.targets, borderColor: "#00205b", borderDash: [4, 4], tension: 0.2 },
        { label: "Réel", data: posteData.reels.map((v) => v ?? null), borderColor: "#f97316", tension: 0.2 },
      ],
    };
  }, [posteData]);

  const saveReel = async () => {
    if (!isAdmin) return;
    const value = reelInput === "" ? null : Number(reelInput);
    await fetch("/api/capa/reel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, week: selectedWeek, poste: selectedPoste, value }),
    });
    const params = new URLSearchParams({ mode, year: String(year), annual: "true" });
    const data = await fetch(`/api/capa?${params}`).then((r) => r.json());
    setAnnual(data);
    setReelInput("");
  };

  return (
    <section className="glass rounded-3xl p-6 space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-xl font-black text-[#00205b]">Capacité</h2>
        <div className="flex rounded-xl border overflow-hidden text-sm font-bold">
          <button type="button" className={`px-4 py-2 ${view === "week" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => setView("week")}>Semaine</button>
          <button type="button" className={`px-4 py-2 ${view === "year" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => setView("year")}>Année (52 sem.)</button>
        </div>
      </div>

      {view === "week" && weekly && (
        <>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={() => shiftWeek(-1)} className="px-3 py-2 rounded-lg border bg-white">←</button>
            <span className="text-sm font-bold">Semaine du {weekly.weekStart} au {weekly.weekEnd}</span>
            <button type="button" onClick={() => shiftWeek(1)} className="px-3 py-2 rounded-lg border bg-white">→</button>
            <button type="button" onClick={() => setWeekNav(getMondayOfWeek())} className="px-3 py-2 rounded-lg border bg-white text-xs font-bold">Aujourd&apos;hui</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {DISPLAY_POSTES.map((poste) => {
              const p = weekly.postes[poste] ?? { M: 0, A: 0, N: 0, J: 0, total: 0, target: 0 };
              const pct = p.target > 0 ? Math.round((p.total / p.target) * 100) : null;
              return (
                <div key={poste} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-black text-[#00205b]">{poste}</span>
                    {pct !== null && <span className={`text-xs font-bold px-2 py-1 rounded-lg ${pct >= 100 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{pct}%</span>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {(["M", "A", "N", "J"] as const).map((shift) => (
                      <div key={shift} className="rounded-xl bg-slate-50 py-2">
                        <div className="font-bold text-[#00205b]">{p[shift]}</div>
                        <div className="text-slate-400">{shift}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Total : <strong>{p.total}</strong>{p.target > 0 && <> / objectif <strong>{p.target}</strong></>}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "year" && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <button type="button" onClick={() => setYear((y) => y - 1)} className="px-3 py-2 rounded-lg border bg-white">←</button>
            <span className="font-bold">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} className="px-3 py-2 rounded-lg border bg-white">→</button>
            <div className="flex rounded-xl border overflow-hidden text-xs font-bold">
              <button type="button" className={`px-3 py-2 ${yearMode === "10" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => setYearMode("10")}>10 sem.</button>
              <button type="button" className={`px-3 py-2 ${yearMode === "52" ? "bg-[#00205b] text-white" : "bg-white"}`} onClick={() => setYearMode("52")}>52 sem.</button>
            </div>
            <select value={selectedPoste} onChange={(e) => setSelectedPoste(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {DISPLAY_POSTES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {annual?.kpis && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border text-center">
                <p className="text-3xl font-black text-[#00205b]">{annual.kpis.coverage}%</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Couverture moyenne</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border text-center">
                <p className="text-3xl font-black text-amber-600">{annual.kpis.criticalWeeks}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Semaines critiques</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border text-center">
                <p className="text-3xl font-black text-emerald-600">{annual.kpis.okWeeks}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Semaines conformes</p>
              </div>
            </div>
          )}

          {annualChart && (
            <div className="bg-white rounded-2xl p-4 border">
              <Line data={annualChart} options={{ responsive: true, interaction: { mode: "index", intersect: false } }} />
            </div>
          )}

          {posteData && (
            <div className="bg-white rounded-2xl p-4 border overflow-x-auto">
              <Bar
                data={{
                  labels: posteData.weeks.map((w) => `S${w}`),
                  datasets: [
                    { label: "Capa calculée", data: posteData.capa, backgroundColor: "#00b5e2" },
                    { label: "Cible", data: posteData.targets, backgroundColor: "#00205b" },
                  ],
                }}
                options={{ responsive: true, plugins: { legend: { position: "bottom" } } }}
              />
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-wrap gap-2 items-end p-4 bg-white/60 rounded-2xl border">
              <label className="text-xs font-bold text-slate-500">Saisie production réelle
                <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="mt-1 block rounded-lg border px-2 py-1 text-sm">
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => <option key={w} value={w}>Semaine {w}</option>)}
                </select>
              </label>
              <input type="number" step="0.1" value={reelInput} onChange={(e) => setReelInput(e.target.value)} placeholder="Valeur réelle" className="rounded-lg border px-3 py-2 text-sm" />
              <button type="button" onClick={saveReel} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">Enregistrer réel</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
