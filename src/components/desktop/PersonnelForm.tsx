"use client";

import { useCallback, useState } from "react";
import type { InitialData, PersonnelRecord } from "@/lib/types";
import { fullName } from "@/lib/personnel";
import { useModalA11y } from "@/hooks/useModalA11y";

const ROLES_PROD = ["REAP", "Compagnon", "Intérimaire", "Pilote", "Apprenti Atelier"];
const ROLES_SUPPORT = ["RP", "REAP", "MFT", "Apprenti", "Responsable Preparateur", "Préparateur", "Responsable Qualité", "Qualité"];
const QUART_TYPES = ["2x8", "3x8", "9x10", "9x10 Portugal", "Nuit Portugal", "Journée"];

function defaultForm(person: PersonnelRecord | null) {
  return {
    nom: person?.nom ?? "",
    prenom: person?.prenom ?? "",
    matricule: person?.matricule ?? "",
    role: person?.role ?? "Compagnon",
    chefEquipeAssocie: person?.chefEquipeAssocie ?? "",
    section: person?.section ?? "",
    typeQuart: person?.typeQuart?.replace(/\*/g, "x") ?? "3x8",
    quartDefaut: person?.quartDefaut ?? "M",
    posteDeTravail: person?.posteDeTravail ?? "",
    mftAssocie: person?.mftAssocie ?? "",
    responsableHierarchique: person?.responsableHierarchique ?? "",
    tauxEfficacite: person?.tauxEfficacite ?? 100,
    startDate: new Date().toISOString().slice(0, 10),
  };
}

type Props = {
  open: boolean;
  data: InitialData;
  person: PersonnelRecord | null;
  workstations?: string[];
  onSaved: () => void;
  onClose: () => void;
};

export function PersonnelForm({ open, data, person, workstations = [], onSaved, onClose }: Props) {
  const isEdit = Boolean(person);
  const isAdmin = data.currentUser.role === "Administrateur";
  const roles = [...new Set([...ROLES_PROD, ...ROLES_SUPPORT])];
  const posteOptions = workstations.length ? workstations : ["DRA718", "DRA716", "DRA715", "DRA714"];

  const [tab, setTab] = useState<"hierarchy" | "planning">("hierarchy");
  const [form, setForm] = useState(() => defaultForm(person));
  const [formError, setFormError] = useState<string | null>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  const dialogRef = useModalA11y(open, handleClose);

  if (!open) return null;

  const submit = async () => {
    if (!form.nom || !form.prenom) return;
    setFormError(null);
    if (!person) {
      const dupRes = await fetch(`/api/personnel/check-duplicate?nom=${encodeURIComponent(form.nom)}&prenom=${encodeURIComponent(form.prenom)}&matricule=${encodeURIComponent(form.matricule)}`);
      const dup = await dupRes.json();
      if (dup.duplicates?.length) {
        const names = dup.duplicates.map((d: { prenom: string; nom: string }) => `${d.prenom} ${d.nom}`).join(", ");
        if (!confirm(`Doublon possible : ${names}. Créer quand même ?`)) return;
      }
    }
    const payload = {
      ...(person ? { id: person.id } : {}),
      ...form,
      matricule: form.matricule || null,
      chefEquipeAssocie: form.chefEquipeAssocie || null,
      section: form.section || null,
      posteDeTravail: form.posteDeTravail || null,
      mftAssocie: form.mftAssocie || null,
      responsableHierarchique: form.responsableHierarchique || null,
    };
    const res = await fetch("/api/personnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      onSaved();
      onClose();
      return;
    }
    const err = await res.json().catch(() => ({}));
    setFormError((err as { error?: string }).error ?? "Enregistrement du collaborateur échoué");
  };

  const remove = async () => {
    if (!person || !confirm(`Supprimer ${fullName(person)} ? Cette action est irréversible.`)) return;
    setFormError(null);
    const res = await fetch(`/api/personnel/${person.id}`, { method: "DELETE" });
    if (res.ok) {
      onSaved();
      onClose();
      return;
    }
    const err = await res.json().catch(() => ({}));
    setFormError((err as { error?: string }).error ?? "Suppression échouée");
  };

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="glass rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personnel-form-title"
        tabIndex={-1}
      >
        <h3 id="personnel-form-title" className="font-black text-[#00205b] mb-4">{isEdit ? "Modifier" : "Ajouter"} un collaborateur</h3>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setTab("hierarchy")} className={`px-3 py-1 rounded-lg text-xs font-bold ${tab === "hierarchy" ? "bg-[#00205b] text-white" : "border"}`}>Hiérarchie</button>
          <button type="button" onClick={() => setTab("planning")} className={`px-3 py-1 rounded-lg text-xs font-bold ${tab === "planning" ? "bg-[#00205b] text-white" : "border"}`}>Planning</button>
        </div>

        {tab === "hierarchy" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-xs font-bold text-slate-500">Nom<input value={form.nom} onChange={(e) => set("nom", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-500">Prénom<input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-500">Matricule<input value={form.matricule} onChange={(e) => set("matricule", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-500">Rôle<select value={form.role} onChange={(e) => set("role", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
            <label className="col-span-2 text-xs font-bold text-slate-500">Section<input value={form.section} onChange={(e) => set("section", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="col-span-2 text-xs font-bold text-slate-500">REAP<select value={form.chefEquipeAssocie} onChange={(e) => set("chefEquipeAssocie", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">—</option>{data.reapListForForm.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            <label className="col-span-2 text-xs font-bold text-slate-500">MFT<select value={form.mftAssocie} onChange={(e) => set("mftAssocie", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">—</option>{data.personnel.filter((p) => p.role === "MFT").map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></label>
            <label className="col-span-2 text-xs font-bold text-slate-500">Resp. hiérarchique<select value={form.responsableHierarchique} onChange={(e) => set("responsableHierarchique", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">—</option>{data.respPrepList.concat(data.respQualiteList).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          </div>
        )}

        {tab === "planning" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-xs font-bold text-slate-500">Type quart<select value={form.typeQuart} onChange={(e) => set("typeQuart", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{QUART_TYPES.map((q) => <option key={q} value={q}>{q}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-500">Quart défaut<select value={form.quartDefaut} onChange={(e) => set("quartDefaut", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{["M", "A", "N", "J", "SC", "SL"].map((q) => <option key={q} value={q}>{q}</option>)}</select></label>
            <label className="col-span-2 text-xs font-bold text-slate-500">Poste(s)<input value={form.posteDeTravail} onChange={(e) => set("posteDeTravail", e.target.value)} placeholder="DRA714, DRA715" list="poste-list" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /><datalist id="poste-list">{posteOptions.map((p) => <option key={p} value={p} />)}</datalist></label>
            <label className="text-xs font-bold text-slate-500">Taux efficacité %<input type="number" min={0} max={100} value={form.tauxEfficacite} onChange={(e) => set("tauxEfficacite", Number(e.target.value))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-500">{isEdit ? "Date effet" : "Date début"}<input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
          </div>
        )}

        {formError && <p className="text-sm text-red-600 font-medium mb-3" role="alert">{formError}</p>}

        <div className="flex gap-2 justify-between">
          {isEdit && isAdmin ? (
            <button type="button" onClick={remove} className="px-4 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-bold">Supprimer</button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Annuler</button>
            <button type="button" onClick={submit} disabled={!form.nom || !form.prenom} className="px-4 py-2 rounded-xl bg-[#00205b] text-white text-sm font-bold disabled:opacity-40">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
