"use client";

import { useEffect, useState } from "react";
import { DISPLAY_POSTES } from "@/lib/constants";
import type { AppMode } from "@/lib/types";

type Props = {
  mode: AppMode;
  weekStart: string;
};

type CapaData = {
  weekStart: string;
  weekEnd: string;
  postes: Record<string, { M: number; A: number; N: number; J: number; total: number; target: number }>;
};

export function CapaView({ mode, weekStart }: Props) {
  const [data, setData] = useState<CapaData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ mode, weekStart });
    fetch(`/api/capa?${params}`)
      .then((r) => r.json())
      .then(setData);
  }, [mode, weekStart]);

  if (!data) {
    return <p className="text-center py-12 text-slate-500">Chargement Capa...</p>;
  }

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="text-xl font-black text-[#00205b] mb-2">Capacité par poste</h2>
      <p className="text-sm text-slate-500 mb-6">
        Semaine du {data.weekStart} au {data.weekEnd}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {DISPLAY_POSTES.map((poste) => {
          const p = data.postes[poste] ?? { M: 0, A: 0, N: 0, J: 0, total: 0, target: 0 };
          const pct = p.target > 0 ? Math.round((p.total / p.target) * 100) : null;
          return (
            <div key={poste} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-[#00205b]">{poste}</span>
                {pct !== null && (
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${pct >= 100 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {pct}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {(["M", "A", "N", "J"] as const).map((shift) => (
                  <div key={shift} className="rounded-xl bg-slate-50 py-2">
                    <div className="font-bold text-[#00205b]">{p[shift]}</div>
                    <div className="text-slate-400">{shift}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Total présences : <strong>{p.total}</strong>
                {p.target > 0 && (
                  <>
                    {" "}
                    / objectif <strong>{p.target}</strong>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
