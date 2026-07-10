"use client";

import { t, type Lang } from "@/lib/i18n";

type Props = {
  open: boolean;
  lang: Lang;
  userRole: string;
  onClose: () => void;
};

export function GuideModal({ open, lang, userRole, onClose }: Props) {
  if (!open) return null;

  const isReap = userRole === "REAP";
  const steps = isReap
    ? [
        t(lang, "guide_reap_1"),
        t(lang, "guide_reap_2"),
        t(lang, "guide_reap_3"),
        t(lang, "guide_reap_4"),
        t(lang, "guide_reap_5"),
      ]
    : [
        t(lang, "guide_admin_1"),
        t(lang, "guide_admin_2"),
        t(lang, "guide_admin_3"),
        t(lang, "guide_admin_4"),
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="glass rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-[#00205b] mb-1">{t(lang, "guide_modal_title")}</h3>
        <p className="text-xs text-slate-500 mb-4">{t(lang, "guide_modal_subtitle")}</p>
        <ol className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#00205b] text-white text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-1 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-slate-500 mb-4 rounded-xl bg-slate-50 border p-3">{t(lang, "guide_modal_note")}</p>
        <button type="button" onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">
          {t(lang, "guide_dismiss")}
        </button>
      </div>
    </div>
  );
}
