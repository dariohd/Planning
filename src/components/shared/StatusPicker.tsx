"use client";

import { ALL_STATUSES, STATUS_BG, STATUS_LABELS } from "@/lib/constants";

type Props = {
  open: boolean;
  current: string;
  onSelect: (status: string) => void;
  onClose: () => void;
};

export function StatusPicker({ open, current, onSelect, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass rounded-3xl p-4 max-w-lg w-full max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Choisir un statut"
      >
        <p className="text-sm font-bold text-slate-500 mb-3">Statut</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ALL_STATUSES.map((s) => {
            const bg = STATUS_BG[s] ?? "bg-white border border-slate-200 text-slate-700";
            const label = s ? (STATUS_LABELS[s] ?? s) : "—";
            const selected = s === current;
            return (
              <button
                key={s || "empty"}
                type="button"
                className={`rounded-xl py-2 text-xs font-bold ${bg} ${selected ? "ring-2 ring-[#00205b]" : ""}`}
                onClick={() => {
                  onSelect(s);
                  onClose();
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
