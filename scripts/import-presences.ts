/**
 * Import des présences depuis un export JSON GAS.
 * Usage : npx tsx scripts/import-presences.ts export.json [--dry-run] [--year=2026]
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "../src/lib/db";
import { importPresencesFromGas, type GasPresenceRow } from "../src/lib/import-presences";

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

  const rows = JSON.parse(readFileSync(file, "utf-8")) as GasPresenceRow[];
  const result = await importPresencesFromGas(rows, { yearFilter, dryRun });

  console.log(dryRun ? `[dry-run] ${result.imported} présences à importer` : `${result.imported} présences importées`);
  if (result.skipped) console.log(`${result.skipped} lignes ignorées (collaborateur introuvable)`);
  if (result.unknownKeys.length) {
    console.log("Clés non résolues (extrait) :", result.unknownKeys.slice(0, 10).join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
