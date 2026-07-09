"use client";

import { useState } from "react";
import { ALL_STATUSES, STATUS_BG, STATUS_LABELS } from "@/lib/constants";

type Props = {
  open: boolean;
  date: string;
  memberName: string;
  current: { status: string; comment?: string; hs?: string; location?: string };
  canEdit: boolean;
  onSave: (data: { status: string; comment?: string; hs?: string; location?: string }) => void;
  onClose: () => void;
};

export function MobilePresenceSheet({ open, date, memberName, current, canEdit, onSave, onClose }: Props) {
  const [status, setStatus] = useState(current.status);
  const [comment, setComment] = useState(current.comment ?? "");
  const [hs, setHs] = useState(current.hs ?? "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="font-black text-[#00205b]">{memberName}</p>
        <p className="text-xs text-slate-500 mb-4">{date}</p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {ALL_STATUSES.filter(Boolean).map((s) => {
            const bg = STATUS_BG[s] ?? "bg-slate-100";
            return (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                className={`rounded-xl py-2 text-xs font-bold ${bg} ${status === s ? "ring-2 ring-[#00205b]" : ""}`}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            );
          })}
        </div>

        {canEdit && (
          <>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire"
              className="w-full rounded-xl border px-3 py-2 text-sm mb-2"
            />
            <input
              value={hs}
              onChange={(e) => setHs(e.target.value)}
              placeholder="Heures sup."
              className="w-full rounded-xl border px-3 py-2 text-sm mb-4"
            />
            <button
              type="button"
              onClick={() => { onSave({ status, comment, hs }); onClose(); }}
              className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold"
            >
              Enregistrer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
