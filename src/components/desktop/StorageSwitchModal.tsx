"use client";

import { useCallback, useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";

type StorageMode = "database" | "google_sheets";

type Props = {
  open: boolean;
  target: StorageMode;
  current: StorageMode;
  sheetsSpreadsheetId: string;
  sheetsWebAppUrl: string;
  onSheetsConfigChange: (patch: { sheetsSpreadsheetId?: string; sheetsWebAppUrl?: string }) => void;
  onClose: () => void;
  onConfirm: (options: {
    exportCsv: boolean;
    syncData: boolean;
    sheetsSpreadsheetId: string;
    sheetsWebAppUrl: string;
  }) => Promise<void>;
};

const COPY: Record<StorageMode, { title: string; lead: string; syncLabel: string; syncHelp: string; confirm: string }> = {
  google_sheets: {
    title: "Passer sur Google Sheets",
    lead: "Vos données seront copiées dans votre classeur Google. L'application continue d'utiliser la base en ligne pour la rapidité, mais Google Sheets devient votre référence de sauvegarde.",
    syncLabel: "Envoyer les données actuelles vers Google Sheets",
    syncHelp: "Recommandé : met à jour le tableur avec le personnel, les présences et la capa.",
    confirm: "Confirmer le passage sur Google Sheets",
  },
  database: {
    title: "Passer sur la base en ligne",
    lead: "Vos données seront chargées depuis la base sécurisée de l'application. C'est le mode recommandé pour le quotidien.",
    syncLabel: "Récupérer les données depuis Google Sheets avant le changement",
    syncHelp: "Importe le contenu du classeur dans l'application. Décochez si la base est déjà à jour.",
    confirm: "Confirmer le passage sur la base en ligne",
  },
};

export function StorageSwitchModal({
  open,
  target,
  current,
  sheetsSpreadsheetId,
  sheetsWebAppUrl,
  onSheetsConfigChange,
  onClose,
  onConfirm,
}: Props) {
  const [exportCsv, setExportCsv] = useState(true);
  const [syncData, setSyncData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  const dialogRef = useModalA11y(open && target !== current, handleClose);

  if (!open || target === current) return null;

  const copy = COPY[target];
  const needsSheetsConfig = target === "google_sheets" || (target === "database" && syncData);
  const sheetsReady = Boolean(sheetsSpreadsheetId.trim() || sheetsWebAppUrl.trim());

  const handleConfirm = async () => {
    if (needsSheetsConfig && syncData && !sheetsReady) {
      setError("Renseignez le lien du classeur Google ou l'URL de synchronisation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm({
        exportCsv,
        syncData,
        sheetsSpreadsheetId: sheetsSpreadsheetId.trim(),
        sheetsWebAppUrl: sheetsWebAppUrl.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le changement a échoué");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="glass rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-switch-title"
        tabIndex={-1}
      >
        <h3 id="storage-switch-title" className="font-black text-[#00205b] text-lg mb-2">{copy.title}</h3>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{copy.lead}</p>

        <label className="flex items-start gap-3 text-sm font-bold mb-3 cursor-pointer">
          <input type="checkbox" checked={exportCsv} onChange={(e) => setExportCsv(e.target.checked)} className="mt-1" />
          <span>
            Exporter une sauvegarde CSV avant le changement
            <span className="block text-xs font-normal text-slate-500 mt-1">Télécharge personnel, présences et capa.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm font-bold mb-4 cursor-pointer">
          <input type="checkbox" checked={syncData} onChange={(e) => setSyncData(e.target.checked)} className="mt-1" />
          <span>
            {copy.syncLabel}
            <span className="block text-xs font-normal text-slate-500 mt-1">{copy.syncHelp}</span>
          </span>
        </label>

        {needsSheetsConfig && syncData && (
          <div className="rounded-xl border p-3 mb-4 space-y-2 bg-white">
            <p className="text-xs font-bold text-slate-600">Classeur Google Sheets</p>
            <input
              value={sheetsSpreadsheetId}
              onChange={(e) => onSheetsConfigChange({ sheetsSpreadsheetId: e.target.value })}
              placeholder="Lien ou ID du classeur"
              className="w-full rounded-lg border px-3 py-2 text-xs"
            />
            <input
              value={sheetsWebAppUrl}
              onChange={(e) => onSheetsConfigChange({ sheetsWebAppUrl: e.target.value })}
              placeholder="Lien de synchronisation (optionnel)"
              className="w-full rounded-lg border px-3 py-2 text-xs"
            />
          </div>
        )}

        {error && <p className="text-xs font-bold text-red-600 mb-3" role="alert">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleClose} disabled={busy} className="px-4 py-2 rounded-xl border text-sm font-bold">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold disabled:opacity-50"
          >
            {busy ? "Changement en cours..." : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
