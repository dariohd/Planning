/**
 * Import des présences depuis un export JSON GAS.
 *
 * Formats supportés :
 * - { personnelId, year, presences: { "2026-01-06": { s, c?, hs?, loc? } } }
 * - { personnelId, year, months: { "1": { "6": "M" | { s } } } }
 *
 * Usage :
 *   npx tsx scripts/import-presences.ts export.json
 *   npx tsx scripts/import-presences.ts export.json --dry-run
 *   npx tsx scripts/import-presences.ts export.json --year=2026
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "../src/lib/db";

type DayVal = string | { s?: string; c?: string; hs?: string; loc?: string };
type ExportRow = {
  personnelId?: string;
  matricule?: string | null;
  nom?: string;
  prenom?: string;
  year: number;
  presences?: Record<string, DayVal>;
  months?: Record<string, Record<string, DayVal>>;
};

function parseDay(val: DayVal | undefined): { status: string; comment?: string; hs?: string; location?: string } | null {
  if (!val) return null;
  if (typeof val === "string") return val ? { status: val } : null;
  if (!val.s) return null;
  return {
    status: val.s,
    comment: val.c ?? undefined,
    hs: val.hs != null ? String(val.hs) : undefined,
    location: val.loc ?? undefined,
  };
}

function expandRow(row: ExportRow): { personnelKey: string; date: string; status: string; comment?: string; hs?: string; location?: string }[] {
  const out: { personnelKey: string; date: string; status: string; comment?: string; hs?: string; location?: string }[] = [];
  const key = row.personnelId ?? row.matricule ?? `${row.nom ?? ""}|${row.prenom ?? ""}`;

  if (row.presences) {
    for (const [date, val] of Object.entries(row.presences)) {
      const parsed = parseDay(val);
      if (parsed) out.push({ personnelKey: key, date, ...parsed });
    }
  }

  if (row.months) {
    for (const [month, days] of Object.entries(row.months)) {
      for (const [day, val] of Object.entries(days)) {
        const parsed = parseDay(val);
        if (!parsed) continue;
        const date = `${row.year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        out.push({ personnelKey: key, date, ...parsed });
      }
    }
  }

  return out;
}

async function resolvePersonnelId(
  key: string,
  row: ExportRow,
  byId: Map<string, string>,
  byMatricule: Map<string, string>,
  byName: Map<string, string>
): Promise<string | null> {
  if (byId.has(key)) return byId.get(key)!;
  if (row.matricule && byMatricule.has(row.matricule)) return byMatricule.get(row.matricule)!;
  const nameKey = `${(row.prenom ?? "").toLowerCase()}|${(row.nom ?? "").toLowerCase()}`;
  if (byName.has(nameKey)) return byName.get(nameKey)!;
  if (key.includes("|")) {
    const [prenom, nom] = key.split("|");
    const nk = `${prenom.toLowerCase()}|${nom.toLowerCase()}`;
    if (byName.has(nk)) return byName.get(nk)!;
  }
  return byId.has(key) ? key : null;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const yearFilter = args.find((a) => a.startsWith("--year="))?.split("=")[1];

  if (!file) {
    console.error("Usage: npx tsx scripts/import-presences.ts <export.json> [--dry-run] [--year=2026]");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL requise.");
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(file, "utf-8")) as ExportRow[];
  const personnel = await prisma.personnel.findMany();
  const byId = new Map(personnel.map((p) => [p.id, p.id]));
  const byMatricule = new Map(personnel.filter((p) => p.matricule).map((p) => [p.matricule!, p.id]));
  const byName = new Map(personnel.map((p) => [`${p.prenom.toLowerCase()}|${p.nom.toLowerCase()}`, p.id]));

  let imported = 0;
  let skipped = 0;
  const unknown = new Set<string>();

  for (const row of rows) {
    if (yearFilter && String(row.year) !== yearFilter) continue;
    const entries = expandRow(row);

    for (const entry of entries) {
      if (yearFilter && !entry.date.startsWith(`${yearFilter}-`)) continue;
      const personnelId = await resolvePersonnelId(entry.personnelKey, row, byId, byMatricule, byName);
      if (!personnelId) {
        unknown.add(entry.personnelKey);
        skipped++;
        continue;
      }

      if (dryRun) {
        imported++;
        continue;
      }

      await prisma.presence.upsert({
        where: { personnelId_date: { personnelId, date: entry.date } },
        create: {
          personnelId,
          date: entry.date,
          status: entry.status,
          comment: entry.comment ?? null,
          hs: entry.hs ?? null,
          location: entry.location ?? null,
        },
        update: {
          status: entry.status,
          comment: entry.comment ?? null,
          hs: entry.hs ?? null,
          location: entry.location ?? null,
        },
      });
      imported++;
    }
  }

  console.log(dryRun ? `[dry-run] ${imported} présences à importer` : `${imported} présences importées`);
  if (skipped) console.log(`${skipped} lignes ignorées (collaborateur introuvable)`);
  if (unknown.size) {
    console.log("Clés non résolues (extrait) :", [...unknown].slice(0, 10).join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
