"use client";

import { t, type Lang } from "@/lib/i18n";

type Props = {
  lang?: Lang;
};

export function LoadingSkeleton({ lang = "fr" }: Props) {
  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6" role="status" aria-live="polite" aria-label={t(lang, "loading")}>
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-14 rounded-2xl bg-slate-200/80" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-10 rounded-xl bg-slate-200/70" />
          <div className="h-10 rounded-xl bg-slate-200/70" />
          <div className="h-10 rounded-xl bg-slate-200/70" />
        </div>
        <div className="h-72 rounded-3xl bg-slate-200/60" />
        <div className="h-40 rounded-3xl bg-slate-200/50" />
        <p className="sr-only">{t(lang, "loading")}</p>
      </div>
    </div>
  );
}
