"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (exportFirst: boolean) => Promise<void>;
};

export function DeleteDataConfirmModal({ open, onClose, onConfirm }: Props) {
  const [exportFirst, setExportFirst] = useState(true);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const canConfirm = typed === "SUPPRIMER";

  const handleConfirm = async () => {
    if (!canConfirm || busy) return;
    setBusy(true);
    try {
      await onConfirm(exportFirst);
      setTyped("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="glass rounded-3xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-red-700 text-lg mb-2">Supprimer toutes les données</h3>
        <p className="text-sm text-slate-600 mb-4">
          Cette action efface le personnel, les présences, les utilisateurs (sauf votre compte), la capa réelle et la configuration.
          Elle est irréversible.
        </p>

        <label className="flex items-start gap-3 text-sm font-bold mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={exportFirst}
            onChange={(e) => setExportFirst(e.target.checked)}
            className="mt-1"
          />
          <span>
            Exporter les données avant suppression
            <span className="block text-xs font-normal text-slate-500 mt-1">
              Télécharge les fichiers CSV (personnel, présences, capa).
            </span>
          </span>
        </label>

        <label className="block text-xs font-bold text-slate-500 mb-4">
          Tapez SUPPRIMER pour confirmer
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            placeholder="SUPPRIMER"
            autoComplete="off"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border text-sm font-bold">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || busy}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-40"
          >
            {busy ? "En cours..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
