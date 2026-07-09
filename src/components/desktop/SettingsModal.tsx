"use client";

import { useEffect, useState } from "react";
import { DISPLAY_POSTES } from "@/lib/constants";

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
};

export function SettingsModal({ open, isAdmin, onClose, onGenerateYear }: Props) {
  const [tab, setTab] = useState<"general" | "access" | "capa" | "postes" | "actions">("general");
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

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: Config) => {
        setConfig(c);
        setMissionsText((c.missions ?? ["Mi"]).join(", "));
        setWorkstationsText((c.workstations ?? DISPLAY_POSTES).join(", "));
      });
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then((u) => Array.isArray(u) && setUsers(u));
    }
  }, [open, isAdmin]);

  if (!open || !isAdmin || !config) return null;

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
      setMsg("Réapplication des jours fériés...");
      await fetch("/api/schedule/reapply-holidays", { method: "POST" });
      setMsg("Jours fériés mis à jour");
    } else {
      setMsg("Paramètres enregistrés");
    }
    setTimeout(() => setMsg(null), 3000);
    onClose();
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
    setMsg(`Présences ${archiveYear} archivées`);
    setTimeout(() => setMsg(null), 3000);
  };

  const exportPersonnel = () => {
    const params = exportRoles.length ? `?roles=${exportRoles.join(",")}` : "";
    window.open(`/api/personnel/export${params}`, "_blank");
  };

  const addCustomRole = () => {
    const name = newRole.trim();
    if (!name || config.roles.includes(name)) return;
    setConfig((c) => c && ({ ...c, roles: [...c.roles, name] }));
    setNewRole("");
  };

  const tabs = ["general", "access", "capa", "postes", "actions"] as const;
  const tabLabels = { general: "Général", access: "Accès", capa: "Capa", postes: "Postes", actions: "Actions" };
  const allRoles = config.roles?.length ? config.roles : ["Administrateur", "REAP", "RP", "MFT", "Pilote", "Lecteur"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="glass rounded-3xl p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-[#00205b] mb-4">Configuration</h3>
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
              <button type="button" onClick={exportPersonnel} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">Exporter</button>
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
  );
}
