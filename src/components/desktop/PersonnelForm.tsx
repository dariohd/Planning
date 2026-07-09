"use client";

import { useEffect, useState } from "react";
import type { InitialData, PersonnelRecord } from "@/lib/types";

const ROLES_PROD = ["REAP", "Compagnon", "Intérimaire", "Pilote", "Apprenti Atelier"];
const ROLES_SUPPORT = ["RP", "REAP", "MFT", "Apprenti", "Responsable Preparateur", "Préparateur", "Responsable Qualité", "Qualité"];
const QUART_TYPES = ["2x8", "3x8", "9x10", "Journée"];

type Props = {
  open: boolean;
  data: InitialData;
  person: PersonnelRecord | null;
  onSaved: () => void;
  onClose: () => void;
};

export function PersonnelForm({ open, data, person, onSaved, onClose }: Props) {
  const isEdit = Boolean(person);
  const roles = data.currentUser.role === "Administrateur" || data.personnel.some((p) => p.role === "RP")
    ? [...ROLES_PROD, ...ROLES_SUPPORT]
    : ROLES_PROD;

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    role: "Compagnon",
    chefEquipeAssocie: "",
    section: "",
    typeQuart: "3x8",
    quartDefaut: "M",
    posteDeTravail: "",
    tauxEfficacite: 100,
    startDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (person) {
      setForm({
        nom: person.nom,
        prenom: person.prenom,
        matricule: person.matricule ?? "",
        role: person.role,
        chefEquipeAssocie: person.chefEquipeAssocie ?? "",
        section: person.section ?? "",
        typeQuart: person.typeQuart ?? "3x8",
        quartDefaut: person.quartDefaut ?? "M",
        posteDeTravail: person.posteDeTravail ?? "",
        tauxEfficacite: person.tauxEfficacite,
        startDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [person]);

  if (!open) return null;

  const submit = async () => {
    const payload = {
      ...(person ? { id: person.id } : {}),
      nom: form.nom,
      prenom: form.prenom,
      matricule: form.matricule || null,
      role: form.role,
      chefEquipeAssocie: form.chefEquipeAssocie || null,
      section: form.section || null,
      typeQuart: form.typeQuart,
      quartDefaut: form.quartDefaut,
      posteDeTravail: form.posteDeTravail || null,
      tauxEfficacite: form.tauxEfficacite,
      startDate: form.startDate,
    };

    const res = await fetch("/api/personnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      onSaved();
      onClose();
    }
  };

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="glass rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-[#00205b] mb-4">{isEdit ? "Modifier" : "Ajouter"} un collaborateur</h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-xs font-bold text-slate-500">Nom<input value={form.nom} onChange={(e) => set("nom", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-slate-500">Prénom<input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-slate-500">Matricule<input value={form.matricule} onChange={(e) => set("matricule", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-slate-500">Rôle
            <select value={form.role} onChange={(e) => set("role", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal">
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">Type quart
            <select value={form.typeQuart} onChange={(e) => set("typeQuart", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal">
              {QUART_TYPES.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">Quart défaut
            <select value={form.quartDefaut} onChange={(e) => set("quartDefaut", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal">
              {["M", "A", "N", "J"].map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-bold text-slate-500">Poste<input value={form.posteDeTravail} onChange={(e) => set("posteDeTravail", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
          <label className="col-span-2 text-xs font-bold text-slate-500">REAP associé
            <select value={form.chefEquipeAssocie} onChange={(e) => set("chefEquipeAssocie", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal">
              <option value="">—</option>
              {data.reapListForForm.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          {!isEdit && (
            <label className="col-span-2 text-xs font-bold text-slate-500">Date début planning<input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Annuler</button>
          <button type="button" onClick={submit} disabled={!form.nom || !form.prenom} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold disabled:opacity-40">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
