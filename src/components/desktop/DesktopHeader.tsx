"use client";

import { signOut } from "next-auth/react";
import { t, type Lang } from "@/lib/i18n";
import { LinkToMobileView } from "@/components/shared/DeviceViewSwitch";
import type { AppMode } from "@/lib/types";

type Props = {
  appName: string;
  userName?: string | null;
  userRole: string;
  canEdit: boolean;
  view: string;
  lang: Lang;
  mode: AppMode;
  isAdmin: boolean;
  onViewChange: (view: "equipe" | "individuelle" | "indicateurs" | "capa") => void;
  onSettingsOpen: () => void;
  onGuideOpen: () => void;
  onLangChange: (lang: string) => void;
  onModeToggle: () => void;
};

export function DesktopHeader({
  appName,
  userName,
  userRole,
  canEdit,
  view,
  lang,
  mode,
  isAdmin,
  onViewChange,
  onSettingsOpen,
  onGuideOpen,
  onLangChange,
  onModeToggle,
}: Props) {
  return (
    <header className="sticky top-0 z-20 glass border-b border-white/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#00205b]">{appName}</h1>
        <p className="text-xs text-slate-500">
          {userName} — {userRole}
          {!canEdit && ` (${t(lang, "read_only")})`}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 items-center">
        {(["equipe", "individuelle", "indicateurs", "capa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`nav-link px-4 py-2 rounded-xl text-sm font-bold ${view === v ? "bg-[#00205b] text-white" : ""}`}
            aria-current={view === v ? "page" : undefined}
            onClick={() => onViewChange(v)}
          >
            {t(lang, v === "equipe" ? "team" : v === "individuelle" ? "individual" : v === "indicateurs" ? "indicators" : "capa")}
          </button>
        ))}
        <LinkToMobileView lang={lang} />
        <button type="button" onClick={onGuideOpen} className="px-3 py-2 rounded-xl border border-[#00b5e2] text-[#00205b] text-sm font-bold">
          {t(lang, "guide_link")}
        </button>
        {isAdmin && (
          <button type="button" onClick={onSettingsOpen} className="px-3 py-2 rounded-xl border text-sm font-bold">
            {t(lang, "settings")}
          </button>
        )}
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value)}
          className="rounded-xl border px-2 py-2 text-xs font-bold"
          aria-label="Langue"
        >
          <option value="fr">FR</option>
          <option value="en">EN</option>
          <option value="pt">PT</option>
        </select>
        <button
          type="button"
          onClick={onModeToggle}
          className="px-4 py-2 rounded-xl text-sm font-bold border border-[#00205b] text-[#00205b]"
        >
          {t(lang, mode)}
        </button>
        <button type="button" onClick={() => signOut()} className="px-3 py-2 text-sm text-slate-500">
          {t(lang, "logout")}
        </button>
      </nav>
    </header>
  );
}
