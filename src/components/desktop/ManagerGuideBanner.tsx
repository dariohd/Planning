"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "planning-manager-guide-dismissed";

type Props = {
  lang: Lang;
  isAdmin: boolean;
  hasPresences: boolean;
  onOpenSettings: () => void;
};

export function ManagerGuideBanner({ lang, isAdmin, hasPresences, onOpenSettings }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture localStorage client
    setVisible(!dismissed);
  }, [isAdmin]);

  if (!visible || !isAdmin) return null;

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-[#00b5e2]/40 bg-gradient-to-r from-[#00b5e2]/10 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#00205b] mb-2">{t(lang, "guide_title")}</p>
          <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
            <li>{t(lang, "guide_step_team")}</li>
            <li>{t(lang, "guide_step_individual")}</li>
            {!hasPresences && <li className="font-bold text-[#00205b]">{t(lang, "guide_step_import")}</li>}
            <li>{t(lang, "guide_step_data")}</li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-lg bg-[#00205b] text-white text-xs font-bold"
          >
            {t(lang, "settings")}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "1");
              setVisible(false);
            }}
            className="px-3 py-1.5 rounded-lg border text-xs font-bold"
          >
            {t(lang, "guide_dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
