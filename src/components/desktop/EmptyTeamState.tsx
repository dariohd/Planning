"use client";

import { t, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  isAdmin: boolean;
  hasPersonnel: boolean;
  onGenerateYear: () => void;
  onAddPerson?: () => void;
};

export function EmptyTeamState({ lang, isAdmin, hasPersonnel, onGenerateYear, onAddPerson }: Props) {
  if (!hasPersonnel) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#00b5e2]/50 bg-[#00b5e2]/5 p-10 text-center">
        <p className="text-lg font-black text-[#00205b] mb-2">{t(lang, "empty_team_no_personnel_title")}</p>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{t(lang, "empty_team_no_personnel_body")}</p>
        {isAdmin && onAddPerson && (
          <button
            type="button"
            onClick={onAddPerson}
            className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold"
          >
            {t(lang, "add_person")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-10 text-center">
      <p className="text-lg font-black text-[#00205b] mb-2">{t(lang, "empty_team_title")}</p>
      <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{t(lang, "empty_team_body")}</p>
      {isAdmin && (
        <button
          type="button"
          onClick={onGenerateYear}
          className="px-4 py-2 rounded-xl bg-[#00b5e2] text-white text-sm font-bold"
        >
          {t(lang, "generate_year")}
        </button>
      )}
    </div>
  );
}
