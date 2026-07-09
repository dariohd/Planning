"use client";

import { useState } from "react";
import { ALL_STATUSES } from "@/lib/constants";
import type { PersonnelRecord } from "@/lib/types";
import { fullName } from "@/lib/personnel";

type Props = {
  open: boolean;
  members: PersonnelRecord[];
  onApply: (data: {
    personnelIds: string[];
    startDate: string;
    endDate: string;
    status: string;
    location?: string;
  }) => void;
  onClose: () => void;
};

export function MassUpdateModal({ open, members, onApply, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("CP");
  const [location, setLocation] = useState("");

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(members.map((m) => m.id)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="glass rounded-3xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-[#00205b] mb-4">Modification groupée</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
          <span className="self-center text-slate-400">→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
            {ALL_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {status === "Mi" && (
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" className="rounded-xl border px-3 py-2 text-sm" />
          )}
        </div>

        <div className="flex gap-2 mb-2">
          <button type="button" onClick={selectAll} className="text-xs font-bold underline">Tout sélectionner</button>
          <span className="text-xs text-slate-500">{selected.size} sélectionné(s)</span>
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-2xl p-2 mb-4 space-y-1">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm p-1 hover:bg-white/60 rounded-lg cursor-pointer">
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
              {fullName(m)} <span className="text-slate-400 text-xs">{m.role}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Annuler</button>
          <button
            type="button"
            disabled={!startDate || !endDate || selected.size === 0}
            onClick={() => {
              onApply({
                personnelIds: [...selected],
                startDate,
                endDate,
                status,
                location: status === "Mi" ? location : undefined,
              });
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold disabled:opacity-40"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
