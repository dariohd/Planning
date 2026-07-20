"use client";

import { useCallback, useState } from "react";
import { ALL_STATUSES, STATUS_BG, STATUS_LABELS } from "@/lib/constants";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  open: boolean;
  personnelId: string;
  date: string;
  current: { status: string; comment?: string; hs?: string; location?: string };
  canEdit: boolean;
  missions?: string[];
  onSave: (data: {
    status: string;
    comment?: string;
    hs?: string;
    location?: string;
  }) => void;
  onClose: () => void;
};

export function PresenceEditor({ open, date, current, canEdit, missions = ["Mi"], onSave, onClose }: Props) {
  const [status, setStatus] = useState(current.status);
  const [comment, setComment] = useState(current.comment ?? "");
  const [hs, setHs] = useState(current.hs ?? "");
  const [location, setLocation] = useState(current.location ?? "");
  const handleClose = useCallback(() => onClose(), [onClose]);
  const dialogRef = useModalA11y(open, handleClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="glass rounded-3xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presence-editor-title"
        tabIndex={-1}
      >
        <p id="presence-editor-title" className="text-sm font-bold text-[#00205b] mb-1">Présence</p>
        <p className="text-xs text-slate-500 mb-4">{date}</p>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
          {ALL_STATUSES.map((s) => {
            const bg = STATUS_BG[s] ?? "bg-white border border-slate-200";
            const label = s ? (STATUS_LABELS[s] ?? s) : "—";
            return (
              <button
                key={s || "empty"}
                type="button"
                disabled={!canEdit}
                className={`rounded-xl py-2 text-xs font-bold ${bg} ${status === s ? "ring-2 ring-[#00205b]" : ""} disabled:opacity-50`}
                onClick={() => setStatus(s)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {(status === "Mi" || location) && (
          <label className="block mb-3">
            <span className="text-xs font-bold text-slate-500">Lieu mission</span>
            <div className="flex flex-wrap gap-1 mt-1 mb-2">
              {missions.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setLocation(m)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold border ${location === m ? "bg-violet-200 border-violet-400" : "bg-white"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              value={location}
              disabled={!canEdit}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Lieu personnalisé"
            />
          </label>
        )}

        <label className="block mb-3">
          <span className="text-xs font-bold text-slate-500">Commentaire</span>
          <input
            value={comment}
            disabled={!canEdit}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-bold text-slate-500">Heures sup.</span>
          <input
            value={hs}
            disabled={!canEdit}
            onChange={(e) => setHs(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Ex: 2h"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl border text-sm font-bold">
            Fermer
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onSave({ status, comment, hs, location: status === "Mi" ? location : undefined })}
              className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold"
            >
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
