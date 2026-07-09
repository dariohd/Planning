"use client";

import { useEffect, useRef, useState } from "react";
import { DISPLAY_POSTES } from "@/lib/constants";
import { DeleteDataConfirmModal } from "./DeleteDataConfirmModal";
import { StorageSwitchModal } from "./StorageSwitchModal";

type Props = {
  open: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onGenerateYear: (year: number) => void;
};

type UserRow = { email: string; role: string; name: string | null };

type Config = {
  appName: string;
  manualTargets: Record<string, number>;
  weeklyTargets: Record<string, Record<string, number>>;
  missions: string[];
  missionColors: Record<string, string>;
  workstations: string[];
  holidayCountry: "FR" | "PT";
  groupByMachine: boolean;
  enableSectors: boolean;
  sectorsConfig: { id: string; label: string; reapIds: string[] }[];
  targetMode: "manual" | "auto";
  capaRules: Record<string, { calcMode?: string; prodTime?: number; mapping?: string; includedStations?: string }>;
  roles: string[];
  dataStorage: "database" | "google_sheets";
  sheetsSpreadsheetId: string;
  sheetsWebAppUrl: string;
};

type Tab = "general" | "access" | "capa" | "postes" | "donnees" | "actions";

export function SettingsModal({ open, isAdmin, onClose, onGenerateYear }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [config, setConfig] = useState<Config | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Lecteur");
  const [year, setYear] = useState(new Date().getFullYear());
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear() - 1);
  const [missionsText, setMissionsText] = useState("Mi");
  const [workstationsText, setWorkstationsText] = useState(DISPLAY_POSTES.join(", "));
  const [newRole, setNewRole] = useState("");
  const [exportRoles, setExportRoles] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const importCsvRef = useRef<HTMLInputElement>(null);
  const importGasRef = useRef<HTMLInputElement>(null);
  const [csvImportType, setCsvImportType] = useState<"personnel" | "presences" | "capa">("personnel");
  const [savedStorage, setSavedStorage] = useState<"database" | "google_sheets">("database");
  const [switchTarget, setSwitchTarget] = useState<"database" | "google_sheets" | null>(null);
  const exportYear = new Date().getFullYear();

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: Config) => {
        setConfig(c);
        setSavedStorage(c.dataStorage ?? "database");
        setMissionsText((c.missions ?? ["Mi"]).join(", "));
        setWorkstationsText((c.workstations ?? DISPLAY_POSTES).join(", "));
      });
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then((u) => Array.isArray(u) && setUsers(u));
    }
  }, [open, isAdmin]);

  if (!open || !isAdmin || !config) return null;

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  };

  const saveConfig = async (reapplyHolidays = false) => {
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        missions: missionsText.split(",").map((s) => s.trim()).filter(Boolean),
        workstations: workstationsText.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    if (reapplyHolidays) {
      flash("Réapplication des jours fériés...");
      await fetch("/api/schedule/reapply-holidays", { method: "POST" });
      flash("Jours fériés mis à jour");
    } else {
      flash("Paramètres enregistrés");
    }
    if (!reapplyHolidays) onClose();
  };

  const updateRole = async (email: string, role: string) => {
    await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    setUsers((prev) => prev.map((u) => (u.email === email ? { ...u, role } : u)));
  };

  const addUser = async () => {
    if (!newUserEmail) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUserEmail, role: newUserRole }),
    });
    if (res.ok) {
      const u = await res.json();
      setUsers((prev) => [...prev, u]);
      setNewUserEmail("");
    }
  };

  const archiveSchedules = async () => {
    if (!confirm(`Supprimer toutes les présences de ${archiveYear} ?`)) return;
    await fetch("/api/schedule/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: archiveYear }),
    });
    flash(`Présences ${archiveYear} archivées`);
  };

  const exportPersonnelCsv = () => {
    const params = exportRoles.length ? `?roles=${exportRoles.join(",")}` : "";
    window.open(`/api/personnel/export${params}`, "_blank");
  };

  const exportFullBackup = () => {
    window.open("/api/admin/data/export", "_blank");
  };

  const exportCsv = (type: "personnel" | "presences" | "capa") => {
    const q = type === "personnel" ? "?type=personnel" : `?type=${type}&year=${exportYear}`;
    window.open(`/api/admin/data/export/csv${q}`, "_blank");
  };

  const exportAllCsv = () => {
    exportCsv("personnel");
    setTimeout(() => exportCsv("presences"), 400);
    setTimeout(() => exportCsv("capa"), 800);
  };

  const importGasJson = async (file: File) => {
    setDataBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/data/import/presences", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import GAS échoué");
      flash(data.message ?? `${data.imported} présences importées`);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Erreur import GAS");
    } finally {
      setDataBusy(false);
      if (importGasRef.current) importGasRef.current.value = "";
    }
  };

  const importCsv = async (file: File, type: "personnel" | "presences" | "capa") => {
    setDataBusy(true);
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("file", file);
      const res = await fetch("/api/admin/data/import/csv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import échoué");
      const labels = { personnel: "collaborateurs", presences: "présences", capa: "lignes capa" };
      flash(`Import réussi : ${data.count} ${labels[type]}`);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Erreur import CSV");
    } finally {
      setDataBusy(false);
      if (importCsvRef.current) importCsvRef.current.value = "";
    }
  };

  const importBackup = async (file: File) => {
    setDataBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/data/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import échoué");
      flash(`Import réussi : ${data.personnel} collaborateurs, ${data.presences} présences`);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Erreur import");
    } finally {
      setDataBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const handleDeleteAll = async (exportFirst: boolean) => {
    if (exportFirst) exportAllCsv();
    const res = await fetch("/api/admin/data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "SUPPRIMER" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Suppression échouée");
    flash("Toutes les données ont été supprimées");
    onClose();
  };

  const syncSheets = async (action: "push" | "pull" | "test") => {
    setDataBusy(true);
    try {
      await saveConfigFields();
      const res = await fetch("/api/admin/data/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          spreadsheetId: config.sheetsSpreadsheetId,
          webAppUrl: config.sheetsWebAppUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Synchronisation échouée");
      flash(data.message ?? "Synchronisation terminée");
      if (action === "pull") onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDataBusy(false);
    }
  };

  const saveConfigFields = async () => {
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        missions: missionsText.split(",").map((s) => s.trim()).filter(Boolean),
        workstations: workstationsText.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
  };

  const requestStorageSwitch = (target: "database" | "google_sheets") => {
    if (target === savedStorage) return;
    setSwitchTarget(target);
  };

  const handleStorageSwitch = async (options: {
    exportCsv: boolean;
    syncData: boolean;
    sheetsSpreadsheetId: string;
    sheetsWebAppUrl: string;
  }) => {
    if (!switchTarget) return;

    if (options.exportCsv) exportAllCsv();

    setConfig((c) =>
      c
        ? {
            ...c,
            dataStorage: switchTarget,
            sheetsSpreadsheetId: options.sheetsSpreadsheetId,
            sheetsWebAppUrl: options.sheetsWebAppUrl,
          }
        : c
    );

    const res = await fetch("/api/admin/data/switch-storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: switchTarget,
        syncData: options.syncData,
        sheetsSpreadsheetId: options.sheetsSpreadsheetId,
        sheetsWebAppUrl: options.sheetsWebAppUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Changement échoué");

    setSavedStorage(switchTarget);
    setSwitchTarget(null);
    flash(data.message ?? "Stockage mis à jour");
    onClose();
  };

  const storageLabel =
    savedStorage === "google_sheets"
      ? "Google Sheets (référence) + base en ligne (affichage)"
      : "Base en ligne";

  const storageBadgeClass =
    savedStorage === "google_sheets"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-[#00205b]/5 text-[#00205b] border-[#00205b]/20";

  const addCustomRole = () => {
    const name = newRole.trim();
    if (!name || config.roles.includes(name)) return;
    setConfig((c) => c && ({ ...c, roles: [...c.roles, name] }));
    setNewRole("");
  };

  const tabs: Tab[] = ["general", "access", "capa", "postes", "donnees", "actions"];
  const tabLabels: Record<Tab, string> = {
    general: "Général",
    access: "Accès",
    capa: "Capa",
    postes: "Postes",
    donnees: "Données",
    actions: "Actions",
  };
  const allRoles = config.roles?.length ? config.roles : ["Administrateur", "REAP", "RP", "MFT", "Pilote", "Lecteur"];

  return (
    <>
      <DeleteDataConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAll}
      />

      <StorageSwitchModal
        open={switchTarget !== null}
        target={switchTarget ?? "database"}
        current={savedStorage}
        sheetsSpreadsheetId={config.sheetsSpreadsheetId}
        sheetsWebAppUrl={config.sheetsWebAppUrl}
        onSheetsConfigChange={(patch) => setConfig((c) => c && ({ ...c, ...patch }))}
        onClose={() => setSwitchTarget(null)}
        onConfirm={handleStorageSwitch}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="glass rounded-3xl p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-black text-[#00205b] mb-4">Paramètres</h3>
          {msg && <p className="text-xs font-bold text-[#00b5e2] mb-2">{msg}</p>}
          <div className="flex flex-wrap gap-1 mb-4">
            {tabs.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1 rounded-lg text-xs font-bold ${tab === t ? "bg-[#00205b] text-white" : "bg-white border"}`}>{tabLabels[t]}</button>
            ))}
          </div>

          {tab === "general" && (
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-500">Nom de l&apos;application
                <input value={config.appName} onChange={(e) => setConfig((c) => c && ({ ...c, appName: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-500">Pays fériés
                <select value={config.holidayCountry} onChange={(e) => setConfig((c) => c && ({ ...c, holidayCountry: e.target.value as "FR" | "PT" }))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="FR">France</option>
                  <option value="PT">Portugal</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={config.groupByMachine} onChange={(e) => setConfig((c) => c && ({ ...c, groupByMachine: e.target.checked }))} />
                Grouper la vue équipe par poste
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={config.enableSectors} onChange={(e) => setConfig((c) => c && ({ ...c, enableSectors: e.target.checked }))} />
                Activer les secteurs personnalisés
              </label>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Rôles personnalisés</p>
                <div className="flex gap-2 mb-2">
                  <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Nouveau rôle" className="flex-1 rounded-xl border px-3 py-2 text-sm" />
                  <button type="button" onClick={addCustomRole} className="px-3 py-2 rounded-xl bg-[#00205b] text-white text-xs font-bold">Ajouter</button>
                </div>
                <p className="text-[10px] text-slate-400">{allRoles.join(", ")}</p>
              </div>
            </div>
          )}

          {tab === "access" && (
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@domaine.com" className="flex-1 rounded-xl border px-3 py-2 text-sm" />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="rounded-xl border px-2 text-xs">
                  {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="button" onClick={addUser} className="px-3 py-2 rounded-xl bg-[#00205b] text-white text-xs font-bold">Ajouter</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {users.map((u) => (
                  <div key={u.email} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{u.email}</span>
                    <select value={u.role} onChange={(e) => updateRole(u.email, e.target.value)} className="rounded-lg border px-2 py-1 text-xs">
                      {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "capa" && (
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-500">Mode objectifs
                <select value={config.targetMode} onChange={(e) => setConfig((c) => c && ({ ...c, targetMode: e.target.value as "manual" | "auto" }))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="manual">Manuel</option>
                  <option value="auto">Auto (ADECC)</option>
                </select>
              </label>
              {DISPLAY_POSTES.map((poste) => (
                <div key={poste} className="border rounded-xl p-3 space-y-2">
                  <label className="flex items-center justify-between text-sm font-bold">{poste}
                    <input type="number" min={0} value={config.manualTargets[poste] ?? 0} onChange={(e) => setConfig((c) => c && ({ ...c, manualTargets: { ...c.manualTargets, [poste]: Number(e.target.value) } }))} className="w-20 rounded-lg border px-2 py-1 text-right text-sm" />
                  </label>
                  <label className="text-[10px] font-bold text-slate-500">Mapping ADECC
                    <input value={config.capaRules[poste]?.mapping ?? poste} onChange={(e) => setConfig((c) => c && ({ ...c, capaRules: { ...c.capaRules, [poste]: { ...c.capaRules[poste], mapping: e.target.value } } }))} className="mt-1 w-full rounded-lg border px-2 py-1 text-xs" />
                  </label>
                  <label className="text-[10px] font-bold text-slate-500">Mode calcul
                    <select value={config.capaRules[poste]?.calcMode ?? "shift"} onChange={(e) => setConfig((c) => c && ({ ...c, capaRules: { ...c.capaRules, [poste]: { ...c.capaRules[poste], calcMode: e.target.value } } }))} className="mt-1 w-full rounded-lg border px-2 py-1 text-xs">
                      <option value="shift">Théorique (ETP)</option>
                      <option value="reel">Temps réel</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          )}

          {tab === "postes" && (
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-500">Postes (séparés par virgule)
                <textarea value={workstationsText} onChange={(e) => setWorkstationsText(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-500">Missions Mi (séparées par virgule)
                <textarea value={missionsText} onChange={(e) => setMissionsText(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" />
              </label>
            </div>
          )}

          {tab === "donnees" && (
            <div className="space-y-4 mb-4">
              <div className="rounded-xl border border-[#00b5e2]/30 bg-[#00b5e2]/5 p-3">
                <p className="text-sm font-bold text-[#00205b] mb-1">Gestion des données</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Choisissez où stocker vos données, puis utilisez les exports CSV pour sauvegarder ou transférer vers Excel.
                  Les deux modes permettent d&apos;importer et d&apos;exporter en CSV.
                </p>
              </div>

              <div className={`rounded-xl border p-3 mb-2 ${storageBadgeClass}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Mode actif</p>
                <p className="text-sm font-black">{storageLabel}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Changer de mode (1 clic + confirmation)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => requestStorageSwitch("database")}
                    className={`text-left rounded-xl border p-3 transition ${savedStorage === "database" ? "border-[#00205b] bg-[#00205b]/5 ring-2 ring-[#00205b]/20" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <p className="text-sm font-black text-[#00205b]">Base en ligne</p>
                    <p className="text-[11px] text-slate-500 mt-1">Recommandé. Rapide et sécurisé pour le quotidien.</p>
                    {savedStorage === "database" && <p className="text-[10px] font-bold text-[#00205b] mt-2">Actif</p>}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestStorageSwitch("google_sheets")}
                    className={`text-left rounded-xl border p-3 transition ${savedStorage === "google_sheets" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <p className="text-sm font-black text-[#00205b]">Google Sheets</p>
                    <p className="text-[11px] text-slate-500 mt-1">Comme l&apos;ancienne version. Tableur Google en référence.</p>
                    {savedStorage === "google_sheets" && <p className="text-[10px] font-bold text-emerald-700 mt-2">Actif</p>}
                  </button>
                </div>
              </div>

              {savedStorage === "google_sheets" && (
                <div className="rounded-xl border p-3 space-y-3 bg-white">
                  <p className="text-xs font-bold text-slate-600">2. Lier votre classeur Google</p>
                  <label className="block text-[11px] font-bold text-slate-500">
                    Lien ou ID du classeur Google Sheets
                    <input
                      value={config.sheetsSpreadsheetId}
                      onChange={(e) => setConfig((c) => c && ({ ...c, sheetsSpreadsheetId: e.target.value }))}
                      placeholder="https://docs.google.com/spreadsheets/d/... ou l'ID"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-xs font-normal"
                    />
                  </label>
                  <label className="block text-[11px] font-bold text-slate-500">
                    Lien de synchronisation (fourni par votre admin IT)
                    <input
                      value={config.sheetsWebAppUrl}
                      onChange={(e) => setConfig((c) => c && ({ ...c, sheetsWebAppUrl: e.target.value }))}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-xs font-normal"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={dataBusy} onClick={() => syncSheets("test")} className="px-3 py-1.5 rounded-lg border text-xs font-bold">Vérifier la connexion</button>
                    <button type="button" disabled={dataBusy} onClick={() => syncSheets("push")} className="px-3 py-1.5 rounded-lg bg-[#00205b] text-white text-xs font-bold">Envoyer vers Sheets</button>
                    <button type="button" disabled={dataBusy} onClick={() => syncSheets("pull")} className="px-3 py-1.5 rounded-lg bg-[#00b5e2] text-white text-xs font-bold">Récupérer depuis Sheets</button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border p-3 space-y-3 bg-white">
                <p className="text-xs font-bold text-slate-600">
                  {savedStorage === "google_sheets" ? "3" : "2"}. Exporter en CSV (Excel)
                </p>
                <p className="text-[11px] text-slate-500">
                  Fichiers compatibles Excel, point-virgule, encodage UTF-8. Ouvrez avec Excel ou Google Sheets.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => exportCsv("personnel")} className="px-3 py-2 rounded-xl border text-xs font-bold">Personnel</button>
                  <button type="button" onClick={() => exportCsv("presences")} className="px-3 py-2 rounded-xl border text-xs font-bold">Présences {exportYear}</button>
                  <button type="button" onClick={() => exportCsv("capa")} className="px-3 py-2 rounded-xl border text-xs font-bold">Capa {exportYear}</button>
                  <button type="button" onClick={exportAllCsv} className="px-3 py-2 rounded-xl bg-[#00205b] text-white text-xs font-bold">Tout exporter</button>
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-3 bg-white">
                <p className="text-xs font-bold text-slate-600">
                  {savedStorage === "google_sheets" ? "4" : "3"}. Importer un CSV
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(["personnel", "presences", "capa"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCsvImportType(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${csvImportType === t ? "bg-[#00205b] text-white" : "border"}`}
                    >
                      {t === "personnel" ? "Personnel" : t === "presences" ? "Présences" : "Capa"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={dataBusy}
                  onClick={() => importCsvRef.current?.click()}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-[#00b5e2] hover:text-[#00205b]"
                >
                  Choisir un fichier CSV ({csvImportType === "personnel" ? "personnel" : csvImportType === "presences" ? "présences" : "capa"})
                </button>
                <input
                  ref={importCsvRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importCsv(file, csvImportType);
                  }}
                />
                <div className="border-t pt-3 mt-3">
                  <p className="text-[11px] font-bold text-slate-600 mb-2">Import export GAS (JSON)</p>
                  <p className="text-[10px] text-slate-500 mb-2">Fichier généré par exportPresencesJson dans l&apos;ancienne application.</p>
                  <button
                    type="button"
                    disabled={dataBusy}
                    onClick={() => importGasRef.current?.click()}
                    className="w-full px-4 py-2 rounded-xl border text-sm font-bold"
                  >
                    Choisir export-presences.json
                  </button>
                  <input
                    ref={importGasRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importGasJson(file);
                    }}
                  />
                </div>
                <details className="text-[10px] text-slate-400">
                  <summary className="cursor-pointer font-bold text-slate-500">Sauvegarde technique (JSON)</summary>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={exportFullBackup} className="px-3 py-1 rounded-lg border text-xs font-bold">Exporter JSON</button>
                    <button type="button" disabled={dataBusy} onClick={() => importRef.current?.click()} className="px-3 py-1 rounded-lg border text-xs font-bold">Importer JSON</button>
                  </div>
                  <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importBackup(file); }} />
                </details>
              </div>

              <div className="border-t border-red-200 pt-4">
                <p className="text-xs font-bold text-red-700 mb-1">Zone sensible</p>
                <p className="text-[11px] text-slate-500 mb-2">Réinitialise toute l&apos;application. Une exportation CSV vous sera proposée avant.</p>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-full px-4 py-2 rounded-xl border border-red-400 text-red-700 text-sm font-bold"
                >
                  Supprimer toutes les données
                </button>
              </div>
            </div>
          )}

          {tab === "actions" && (
            <div className="space-y-4 mb-4">
              <div className="flex gap-2 items-center">
                <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm w-28" />
                <button type="button" onClick={() => onGenerateYear(year)} className="px-4 py-2 rounded-xl bg-[#00b5e2] text-white text-sm font-bold">Générer plannings année</button>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={archiveYear} onChange={(e) => setArchiveYear(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm w-28" />
                <button type="button" onClick={archiveSchedules} className="px-4 py-2 rounded-xl border border-red-300 text-red-700 text-sm font-bold">Archiver présences année</button>
              </div>
              <button type="button" onClick={() => saveConfig(true)} className="w-full px-4 py-2 rounded-xl border text-sm font-bold">Réappliquer les jours fériés sur tous les plannings</button>
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-slate-500 mb-2">Export personnel (CSV)</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {allRoles.filter((r) => !["Non Autorisé"].includes(r)).map((r) => (
                    <label key={r} className="text-[10px] font-bold flex items-center gap-1 border rounded-lg px-2 py-1">
                      <input type="checkbox" checked={exportRoles.includes(r)} onChange={(e) => setExportRoles((prev) => e.target.checked ? [...prev, r] : prev.filter((x) => x !== r))} />
                      {r}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={exportPersonnelCsv} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">Exporter CSV</button>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Fermer</button>
            {tab !== "actions" && tab !== "access" && (
              <button type="button" onClick={() => saveConfig(false)} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">Sauvegarder</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
