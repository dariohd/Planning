"use client";

import { useCallback } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  open: boolean;
  lang: Lang;
  userRole: string;
  onClose: () => void;
};

export function GuideModal({ open, lang, userRole, onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  const dialogRef = useModalA11y(open, handleClose);

  if (!open) return null;

  const isReap = userRole === "REAP";
  const isAdmin = userRole === "Administrateur";

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
        ...(isAdmin ? [t(lang, "guide_admin_5")] : []),
      ];

  const sheetsSteps = isAdmin
    ? [
        t(lang, "guide_sheets_1"),
        t(lang, "guide_sheets_2"),
        t(lang, "guide_sheets_3"),
        t(lang, "guide_sheets_4"),
        t(lang, "guide_sheets_5"),
        t(lang, "guide_sheets_6"),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="glass rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        tabIndex={-1}
      >
        <h3 id="guide-modal-title" className="text-xl font-black text-[#00205b] mb-1">{t(lang, "guide_modal_title")}</h3>
        <p className="text-xs text-slate-500 mb-4">{t(lang, "guide_modal_subtitle")}</p>

        <p className="text-xs font-bold text-[#00205b] mb-2">{t(lang, "guide_section_basics")}</p>
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

        <div className="mb-6 rounded-xl border border-[#00b5e2]/30 bg-[#00b5e2]/5 p-4">
          <p className="text-sm font-black text-[#00205b] mb-1">{t(lang, "guide_section_interfaces")}</p>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">{t(lang, "guide_interfaces_intro")}</p>
          <ul className="space-y-2 text-sm text-slate-700 list-disc pl-4">
            <li>{t(lang, "guide_interfaces_desktop")}</li>
            <li>{t(lang, "guide_interfaces_mobile")}</li>
            <li className="font-bold text-[#00205b]">{t(lang, "guide_interface_switch")}</li>
          </ul>
        </div>

        {isAdmin && sheetsSteps.length > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-sm font-black text-[#00205b] mb-1">{t(lang, "guide_section_sheets")}</p>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">{t(lang, "guide_sheets_intro")}</p>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-4">
              {sheetsSteps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="text-[11px] text-slate-500 mb-4 rounded-xl bg-slate-50 border p-3">{t(lang, "guide_modal_note")}</p>
        <button type="button" onClick={handleClose} className="w-full px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">
          {t(lang, "guide_dismiss")}
        </button>
      </div>
    </div>
  );
}
