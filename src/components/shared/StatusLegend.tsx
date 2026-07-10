"use client";

import { STATUS_BG, STATUS_LABELS } from "@/lib/constants";
import { statusLabel, t, type Lang } from "@/lib/i18n";

const LEGEND_CODES = ["M", "A", "N", "J", "CP", "JRTT", "Abs", "Ma", "F", "P", "RF", "Mi"] as const;

type Props = { lang: Lang; className?: string };

export function StatusLegend({ lang, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1">{t(lang, "status_legend")}</span>
      {LEGEND_CODES.map((code) => (
        <span
          key={code}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_BG[code] ?? "bg-slate-100"}`}
        >
          <span>{STATUS_LABELS[code] ?? code}</span>
          <span className="opacity-80 font-normal hidden sm:inline">{statusLabel(lang, code)}</span>
        </span>
      ))}
    </div>
  );
}
