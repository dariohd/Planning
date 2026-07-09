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
