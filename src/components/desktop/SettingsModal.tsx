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

export function SettingsModal({ open, isAdmin, onClose, onGenerateYear }: Props) {
  const [tab, setTab] = useState<"general" | "access" | "capa" | "actions">("general");
  const [appName, setAppName] = useState("");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!open) return;
    fetch("/api/config").then((r) => r.json()).then((c) => {
      setAppName(c.appName ?? "");
      setTargets(c.manualTargets ?? {});
    });
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then((u) => Array.isArray(u) && setUsers(u));
    }
  }, [open, isAdmin]);

  if (!open || !isAdmin) return null;

  const saveConfig = async () => {
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, manualTargets: targets }),
    });
    onClose();
  };

  const updateRole = async (email: string, role: string) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setUsers((prev) => prev.map((u) => (u.email === email ? { ...u, role } : u)));
  };

  const tabs = ["general", "access", "capa", "actions"] as const;
  const tabLabels = { general: "Général", access: "Accès", capa: "Capa", actions: "Actions" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="glass rounded-3xl p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-[#00205b] mb-4">Configuration</h3>

        <div className="flex gap-1 mb-4">
          {tabs.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1 rounded-lg text-xs font-bold ${tab === t ? "bg-[#00205b] text-white" : "bg-white border"}`}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <label className="block mb-4 text-xs font-bold text-slate-500">
            Nom de l&apos;application
            <input value={appName} onChange={(e) => setAppName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" />
          </label>
        )}

        {tab === "access" && (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {users.map((u) => (
              <div key={u.email} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{u.email}</span>
                <select value={u.role} onChange={(e) => updateRole(u.email, e.target.value)} className="rounded-lg border px-2 py-1 text-xs">
                  {["Administrateur", "REAP", "RP", "MFT", "Lecteur", "Non Autorisé"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {tab === "capa" && (
          <div className="space-y-3 mb-4">
            {DISPLAY_POSTES.map((poste) => (
              <label key={poste} className="flex items-center justify-between text-sm">
                <span className="font-bold">{poste}</span>
                <input
                  type="number"
                  min={0}
                  value={targets[poste] ?? 0}
                  onChange={(e) => setTargets((t) => ({ ...t, [poste]: Number(e.target.value) }))}
                  className="w-20 rounded-lg border px-2 py-1 text-right"
                />
              </label>
            ))}
          </div>
        )}

        {tab === "actions" && (
          <div className="space-y-3 mb-4">
            <div className="flex gap-2 items-center">
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm w-28" />
              <button type="button" onClick={() => onGenerateYear(year)} className="px-4 py-2 rounded-xl bg-[#00b5e2] text-white text-sm font-bold">
                Générer plannings année
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Fermer</button>
          {(tab === "general" || tab === "capa") && (
            <button type="button" onClick={saveConfig} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold">Sauvegarder</button>
          )}
        </div>
      </div>
    </div>
  );
}
