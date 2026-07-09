"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { AppMode } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Props = {
  mode: AppMode;
  selection: string;
  date: string;
};

type IndicatorsData = {
  compagnons: { daily: Stats; weekly: Stats; monthly: Stats };
  interimaires: { daily: Stats; weekly: Stats; monthly: Stats };
  labels: { group1: string; group2: string };
  monthlyAbsenceBreakdown: Record<string, number>;
  workforceTotals: { compagnons: number; interimaires: number; total: number };
};

type Stats = Record<string, string[]>;

export function IndicatorsView({ mode, selection, date }: Props) {
  const [data, setData] = useState<IndicatorsData | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const params = new URLSearchParams({ mode, date, selection });
    fetch(`/api/indicators?${params}`)
      .then((r) => r.json())
      .then(setData);
  }, [mode, selection, date]);

  if (!data) {
    return <p className="text-center py-12 text-slate-500">Chargement des indicateurs...</p>;
  }

  const g1 = data.compagnons[period];
  const g2 = data.interimaires[period];
  const presentTotal = (g1.presence?.length ?? 0) + (g2.presence?.length ?? 0);
  const absentTotal =
    (g1.Ma?.length ?? 0) + (g1.CP?.length ?? 0) + (g1.Abs?.length ?? 0) +
    (g2.Ma?.length ?? 0) + (g2.CP?.length ?? 0) + (g2.Abs?.length ?? 0);
  const rate = data.workforceTotals.total > 0
    ? Math.round((presentTotal / data.workforceTotals.total) * 100)
    : 0;

  const kpis = [
    { label: "Présents", value: presentTotal, color: "text-[#00b5e2]" },
    { label: "Taux présence", value: `${rate}%`, color: "text-emerald-600" },
    { label: "Absences", value: absentTotal, color: "text-red-600" },
    { label: "Effectif", value: data.workforceTotals.total, color: "text-[#00205b]" },
  ];

  const presenceChart = {
    labels: [data.labels.group1, data.labels.group2],
    datasets: [
      {
        label: "Présents",
        data: [g1.presence?.length ?? 0, g2.presence?.length ?? 0],
        backgroundColor: ["#00b5e2", "#00205b"],
      },
    ],
  };

  const shiftChart = {
    labels: ["M", "A", "N", "J"],
    datasets: [
      {
        label: data.labels.group1,
        data: ["M", "A", "N", "J"].map((k) => g1[k]?.length ?? 0),
        backgroundColor: "#00b5e2",
      },
      {
        label: data.labels.group2,
        data: ["M", "A", "N", "J"].map((k) => g2[k]?.length ?? 0),
        backgroundColor: "#00205b",
      },
    ],
  };

  const absenceLabels = Object.keys(data.monthlyAbsenceBreakdown);
  const absenceChart = {
    labels: absenceLabels,
    datasets: [
      {
        data: absenceLabels.map((k) => data.monthlyAbsenceBreakdown[k]),
        backgroundColor: ["#ef4444", "#f97316", "#ec4899", "#06b6d4", "#64748b"],
      },
    ],
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-bold text-slate-500">Période :</span>
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-bold ${period === p ? "bg-[#00205b] text-white" : "bg-white border"}`}
            onClick={() => setPeriod(p)}
          >
            {p === "daily" ? "Jour" : p === "weekly" ? "Semaine" : "Mois"}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500">
          Effectif : {data.workforceTotals.total} ({data.workforceTotals.compagnons} +{" "}
          {data.workforceTotals.interimaires})
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Présence</h3>
          <Bar data={presenceChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Quarts</h3>
          <Bar data={shiftChart} options={{ responsive: true }} />
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-black text-[#00205b] mb-4">Absences du mois</h3>
          {absenceLabels.length ? (
            <Doughnut data={absenceChart} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">Aucune absence ce mois</p>
          )}
        </div>
      </div>
    </section>
  );
}
