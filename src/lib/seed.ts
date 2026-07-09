import { readFileSync } from "fs";
import path from "path";
import { prisma } from "./db";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

export async function runSeed(): Promise<{ personnelCount: number }> {
  const csvPath = path.join(
    process.cwd(),
    "_legacy-export",
    "Application Planning Exemple - Personnel.csv"
  );
  const content = readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);

  const idx = (name: string) => header.findIndex((h) => h === name);

  await prisma.presence.deleteMany();
  await prisma.personnel.deleteMany();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const id = cols[idx("Personnel_ID")];
    if (!id) continue;

    await prisma.personnel.upsert({
      where: { id },
      create: {
        id,
        matricule: cols[idx("Matricule")] || null,
        nom: cols[idx("Nom")] ?? "",
        prenom: cols[idx("Prenom")] ?? "",
        role: cols[idx("Role")] ?? "Compagnon",
        chefEquipeAssocie: cols[idx("REAP_Associe")] || null,
        section: cols[idx("Section")] || null,
        typeQuart: cols[idx("Type_Quart")] || null,
        quartDefaut: cols[idx("Quart_Depart")] || null,
        posteDeTravail: cols[idx("PosteDeTravail")] || null,
        mftAssocie: cols[10] || null,
        responsableHierarchique: cols[11] || null,
        statut: "Actif",
        tauxEfficacite: 100,
      },
      update: {
        matricule: cols[idx("Matricule")] || null,
        nom: cols[idx("Nom")] ?? "",
        prenom: cols[idx("Prenom")] ?? "",
        role: cols[idx("Role")] ?? "Compagnon",
        chefEquipeAssocie: cols[idx("REAP_Associe")] || null,
        section: cols[idx("Section")] || null,
        typeQuart: cols[idx("Type_Quart")] || null,
        quartDefaut: cols[idx("Quart_Depart")] || null,
        posteDeTravail: cols[idx("PosteDeTravail")] || null,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    create: { email: "admin@local.dev", role: "Administrateur", name: "Admin Local" },
    update: { role: "Administrateur" },
  });

  await prisma.appConfig.upsert({
    where: { id: "default" },
    create: { id: "default", data: { appName: "Planning Présence" } },
    update: {},
  });

  await prisma.appMeta.upsert({
    where: { key: "lastModified" },
    create: { key: "lastModified", value: Date.now().toString() },
    update: { value: Date.now().toString() },
  });

  const personnelCount = await prisma.personnel.count();
  return { personnelCount };
}
