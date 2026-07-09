import { prisma } from "./db";
import { parseCsv, toCsv } from "./csv-utils";

export async function exportPersonnelCsv(): Promise<string> {
  const rows = await prisma.personnel.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  const headers = [
    "matricule", "nom", "prenom", "role", "section", "type_quart", "quart_defaut",
    "poste", "reap", "mft", "responsable", "statut", "efficacite",
  ];
  return toCsv(
    headers,
    rows.map((p) => [
      p.matricule ?? "",
      p.nom,
      p.prenom,
      p.role,
      p.section ?? "",
      p.typeQuart ?? "",
      p.quartDefaut ?? "",
      p.posteDeTravail ?? "",
      p.chefEquipeAssocie ?? "",
      p.mftAssocie ?? "",
      p.responsableHierarchique ?? "",
      p.statut,
      p.tauxEfficacite,
    ])
  );
}

export async function exportPresencesCsv(year?: number): Promise<string> {
  const personnel = await prisma.personnel.findMany();
  const byId = new Map(personnel.map((p) => [p.id, p]));
  const where = year ? { date: { startsWith: `${year}-` } } : undefined;
  const presences = await prisma.presence.findMany({
    where,
    orderBy: [{ date: "asc" }, { personnelId: "asc" }],
  });

  const headers = ["matricule", "nom", "prenom", "date", "statut", "commentaire", "heures_sup", "lieu"];
  return toCsv(
    headers,
    presences.map((pr) => {
      const p = byId.get(pr.personnelId);
      return [
        p?.matricule ?? "",
        p?.nom ?? "",
        p?.prenom ?? "",
        pr.date,
        pr.status,
        pr.comment ?? "",
        pr.hs ?? "",
        pr.location ?? "",
      ];
    })
  );
}

export async function exportCapaCsv(year?: number): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const rows = await prisma.capaReel.findMany({
    where: { year: y },
    orderBy: [{ week: "asc" }, { poste: "asc" }],
  });
  return toCsv(
    ["annee", "semaine", "poste", "valeur"],
    rows.map((r) => [r.year, r.week, r.poste, r.value ?? ""])
  );
}

export async function importPersonnelCsv(content: string): Promise<number> {
  const { headers, rows } = parseCsv(content);
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase().replace(/\s/g, "_") === name);

  let count = 0;
  for (const cols of rows) {
    const matricule = cols[idx("matricule")] || null;
    const nom = cols[idx("nom")];
    const prenom = cols[idx("prenom")];
    if (!nom || !prenom) continue;

    const id =
      cols[idx("id")] ||
      matricule ||
      `${prenom.toLowerCase()}-${nom.toLowerCase()}`.replace(/[^a-z0-9-]/g, "");

    const data = {
      id,
      matricule,
      nom,
      prenom,
      role: cols[idx("role")] || "Compagnon",
      section: cols[idx("section")] || null,
      typeQuart: cols[idx("type_quart")] || cols[idx("typequart")] || null,
      quartDefaut: cols[idx("quart_defaut")] || cols[idx("quartdefaut")] || null,
      posteDeTravail: cols[idx("poste")] || cols[idx("postedetravail")] || null,
      chefEquipeAssocie: cols[idx("reap")] || cols[idx("chefequipeassocie")] || null,
      mftAssocie: cols[idx("mft")] || null,
      responsableHierarchique: cols[idx("responsable")] || null,
      statut: cols[idx("statut")] || "Actif",
      tauxEfficacite: Number(cols[idx("efficacite")] || cols[idx("tauxefficacite")] || 100),
    };

    await prisma.personnel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
    count++;
  }
  return count;
}

export async function importPresencesCsv(content: string): Promise<number> {
  const personnel = await prisma.personnel.findMany();
  const byMatricule = new Map(personnel.filter((p) => p.matricule).map((p) => [p.matricule!.toLowerCase(), p.id]));
  const byName = new Map(personnel.map((p) => [`${p.prenom.toLowerCase()}|${p.nom.toLowerCase()}`, p.id]));
  const byId = new Map(personnel.map((p) => [p.id, p.id]));

  const { headers, rows } = parseCsv(content);
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase().replace(/\s/g, "_") === name);

  let count = 0;
  for (const cols of rows) {
    const date = cols[idx("date")];
    const status = cols[idx("statut")] || cols[idx("status")];
    if (!date || !status) continue;

    let personnelId = cols[idx("personnel_id")] || cols[idx("personnelid")] || "";
    if (!personnelId) {
      const mat = cols[idx("matricule")]?.toLowerCase();
      if (mat && byMatricule.has(mat)) personnelId = byMatricule.get(mat)!;
      else {
        const nk = `${cols[idx("prenom")]?.toLowerCase()}|${cols[idx("nom")]?.toLowerCase()}`;
        personnelId = byName.get(nk) ?? "";
      }
    }
    if (!personnelId || !byId.has(personnelId)) continue;

    await prisma.presence.upsert({
      where: { personnelId_date: { personnelId, date } },
      create: {
        personnelId,
        date,
        status,
        comment: cols[idx("commentaire")] || cols[idx("comment")] || null,
        hs: cols[idx("heures_sup")] || cols[idx("hs")] || null,
        location: cols[idx("lieu")] || cols[idx("location")] || null,
      },
      update: {
        status,
        comment: cols[idx("commentaire")] || cols[idx("comment")] || null,
        hs: cols[idx("heures_sup")] || cols[idx("hs")] || null,
        location: cols[idx("lieu")] || cols[idx("location")] || null,
      },
    });
    count++;
  }
  return count;
}

export async function importCapaCsv(content: string): Promise<number> {
  const { headers, rows } = parseCsv(content);
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name);
  let count = 0;
  for (const cols of rows) {
    const year = Number(cols[idx("annee")] || cols[idx("year")]);
    const week = Number(cols[idx("semaine")] || cols[idx("week")]);
    const poste = cols[idx("poste")];
    if (!year || !week || !poste) continue;
    const raw = cols[idx("valeur")] || cols[idx("value")];
    const value = raw === "" ? null : Number(raw);
    await prisma.capaReel.upsert({
      where: { year_week_poste: { year, week, poste } },
      create: { year, week, poste, value },
      update: { value },
    });
    count++;
  }
  return count;
}
