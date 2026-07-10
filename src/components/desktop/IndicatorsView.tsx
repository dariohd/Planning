"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { AppMode } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend);

type Props = {
  mode: AppMode;
  selection: string;
  date: string;
  teamOptions?: string[];
};

type IndicatorsData = {
  compagnons: { daily: Stats; weekly: Stats; monthly: Stats };
  interimaires: { daily: Stats; weekly: Stats; monthly: Stats };
  labels: { group1: string; group2: string };
  monthlyAbsenceBreakdown: Record<string, number>;
  workforceTotals: { compagnons: number; interimaires: number; total: number };
  horsProd?: { daily: number; weekly: number };
};

type Stats = Record<string, string[]>;

type WeeklyComparison = {
  weekDates: string[];
  labels: { group1: string; group2: string };
  weeklyStats: Record<string, { group1: Stats; group2: Stats }>;
};

type WorkstationRow = Record<string, { theoretical: number; present: number; names: string[] }>;

export function IndicatorsView({ mode, selection: initialSelection, date: initialDate, teamOptions = ["Tous"] }: Props) {
  const [data, setData] = useState<IndicatorsData | null>(null);
  const [comparison, setComparison] = useState<WeeklyComparison | null>(null);
  const [workstations, setWorkstations] = useState<WorkstationRow | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [date, setDate] = useState(initialDate);
  const [selection, setSelection] = useState(initialSelection);
  const [kpiModal, setKpiModal] = useState<{ title: string; names: string[] } | null>(null);
  const [kpiSearch, setKpiSearch] = useState("");

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({ mode, date, selection });
      try {
        const [ind, comp, ws] = await Promise.all([
          fetch(`/api/indicators?${params}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("indicators")))),
          fetch(`/api/indicators/weekly-comparison?${params}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("comparison")))),
          fetch(`/api/indicators/workstations?${params}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("workstations")))),
        ]);
        if (cancelled) return;
        setData(ind);
        setComparison(comp);
        setWorkstations(ws);
        setLoadError(false);
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, date, selection]);

  if (loadError) {
    return <p className="text-center py-12 text-red-600 font-bold">Impossible de charger les indicateurs.</p>;
  }

  if (!data) {
    return <p className="text-center py-12 text-slate-500">Chargement des indicateurs...</p>;
  }

  const g1 = data.compagnons[period];
  const g2 = data.interimaires[period];
  const presentTotal = (g1.presence?.length ?? 0) + (g2.presence?.length ?? 0);
  const absentTotal =
    (g1.Ma?.length ?? 0) + (g1.CP?.length ?? 0) + (g1.Abs?.length ?? 0) +
    (g2.Ma?.length ?? 0) + (g2.CP?.length ?? 0) + (g2.Abs?.length ?? 0);
  const rate = data.workforceTotals.total > 0 ? Math.round((presentTotal / data.workforceTotals.total) * 100) : 0;
  const horsProd = period === "daily" ? (data.horsProd?.daily ?? 0) : (data.horsProd?.weekly ?? 0);

  const kpis = [
    { label: "Présents", value: presentTotal, color: "text-[#00b5e2]", names: [...(g1.presence ?? []), ...(g2.presence ?? [])] },
    { label: "Taux présence", value: `${rate}%`, color: "text-emerald-600", names: [] },
    { label: "Absences", value: absentTotal, color: "text-red-600", names: [...(g1.Ma ?? []), ...(g1.CP ?? []), ...(g1.Abs ?? []), ...(g2.Ma ?? []), ...(g2.CP ?? []), ...(g2.Abs ?? [])] },
    { label: "Hors prod.", value: horsProd, color: "text-amber-600", names: [...(g1.P ?? []), ...(g1.Z ?? []), ...(g1.S ?? []), ...(g2.P ?? []), ...(g2.Z ?? []), ...(g2.S ?? [])] },
  ];

  const absenceLabels = Object.keys(data.monthlyAbsenceBreakdown);
  const paretoSorted = Object.entries(data.monthlyAbsenceBreakdown).sort((a, b) => b[1] - a[1]);
  const paretoChart = paretoSorted.length
    ? {
        labels: paretoSorted.map(([k]) => k),
        datasets: [{ label: "Absences", data: paretoSorted.map(([, v]) => v), backgroundColor: "#f97316" }],
      }
    : null;

  const trendData = comparison
    ? {
        labels: comparison.weekDates.map((d) => d.slice(5)),
        datasets: [
          {
            label: comparison.labels.group1,
            data: comparison.weekDates.map((d) => comparison.weeklyStats[d]?.group1.presence?.length ?? 0),
            borderColor: "#00b5e2",
            tension: 0.3,
          },
          {
            label: comparison.labels.group2,
            data: comparison.weekDates.map((d) => comparison.weeklyStats[d]?.group2.presence?.length ?? 0),
            borderColor: "#00205b",
            tension: 0.3,
          },
        ],
      }
    : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center glass rounded-2xl p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-semibold" />
        <select value={selection} onChange={(e) => setSelection(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-semibold min-w-[180px]">
          {teamOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => k.names.length > 0 && setKpiModal({ title: k.label, names: k.names })}
            className="glass rounded-2xl p-4 text-center hover:shadow-md transition"
          >
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">{k.label}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-bold text-slate-500">Période :</span>
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button key={p} type="button" className={`px-4 py-2 rounded-xl text-sm font-bold ${period === p ? "bg-[#00205b] text-white" : "bg-white border"}`} onClick={() => setPeriod(p)}>
            {p === "daily" ? "Jour" : p === "weekly" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Présence</h3>
          <Bar data={{ labels: [data.labels.group1, data.labels.group2], datasets: [{ label: "Présents", data: [g1.presence?.length ?? 0, g2.presence?.length ?? 0], backgroundColor: ["#00b5e2", "#00205b"] }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Quarts</h3>
          <Bar data={{ labels: ["M", "A", "N", "J"], datasets: [{ label: data.labels.group1, data: ["M", "A", "N", "J"].map((k) => g1[k]?.length ?? 0), backgroundColor: "#00b5e2" }, { label: data.labels.group2, data: ["M", "A", "N", "J"].map((k) => g2[k]?.length ?? 0), backgroundColor: "#00205b" }] }} options={{ responsive: true }} />
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Absences du mois</h3>
          {absenceLabels.length ? <Doughnut data={{ labels: absenceLabels, datasets: [{ data: absenceLabels.map((k) => data.monthlyAbsenceBreakdown[k]), backgroundColor: ["#ef4444", "#f97316", "#ec4899", "#06b6d4", "#64748b"] }] }} /> : <p className="text-sm text-slate-500 text-center py-8">Aucune absence ce mois</p>}
        </div>
      </div>

      {paretoChart && (
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Pareto absences</h3>
          <Bar data={paretoChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      )}

      {trendData && (
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Tendance présence (semaine)</h3>
          <Line data={trendData} options={{ responsive: true }} />
        </div>
      )}

      {workstations && Object.keys(workstations).length > 0 && (
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Effectifs par poste</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(workstations).map(([poste, row]) => (
              <div key={poste} className="bg-white rounded-2xl p-4 border">
                <div className="flex justify-between font-bold text-sm mb-2">
                  <span>{poste}</span>
                  <span className="text-[#00b5e2]">{row.present} / {row.theoretical}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00b5e2]" style={{ width: `${row.theoretical ? (row.present / row.theoretical) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparison && (
        <div className="glass rounded-3xl p-6 overflow-x-auto">
          <h3 className="font-black text-[#00205b] mb-4">Comparaison hebdomadaire</h3>
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">Jour</th>
                <th className="border p-2">{comparison.labels.group1} présents</th>
                <th className="border p-2">{comparison.labels.group2} présents</th>
                <th className="border p-2">Absences</th>
              </tr>
            </thead>
            <tbody>
              {comparison.weekDates.map((d) => {
                const s = comparison.weeklyStats[d];
                const abs = [...(s?.group1.Ma ?? []), ...(s?.group1.CP ?? []), ...(s?.group2.Ma ?? []), ...(s?.group2.CP ?? [])];
                return (
                  <tr key={d}>
                    <td className="border p-2 font-bold">{d}</td>
                    <td className="border p-2">{s?.group1.presence?.length ?? 0}</td>
                    <td className="border p-2">{s?.group2.presence?.length ?? 0}</td>
                    <td className="border p-2">{abs.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {kpiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kpi-modal-title"
          onClick={() => { setKpiModal(null); setKpiSearch(""); }}
          onKeyDown={(e) => e.key === "Escape" && (setKpiModal(null), setKpiSearch(""))}
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h4 id="kpi-modal-title" className="font-black text-[#00205b] mb-3">{kpiModal.title}</h4>
            <input
              type="search"
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full mb-3 rounded-xl border px-3 py-2 text-sm"
            />
            <ul className="text-sm space-y-1">
              {kpiModal.names
                .filter((n) => !kpiSearch.trim() || n.toLowerCase().includes(kpiSearch.toLowerCase()))
                .map((n) => (
                  <li key={n}>{n}</li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
