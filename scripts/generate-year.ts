/**
 * Génère les plannings annuels pour tous les collaborateurs actifs.
 * Usage : npm run generate:year -- 2026
 */
import "dotenv/config";
import { generateYearlySchedules } from "../src/lib/schedule-generator";
import { touchLastModified } from "../src/lib/permissions";

async function main() {
  const year = Number(process.argv[2] ?? new Date().getFullYear());
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL requise.");
    process.exit(1);
  }

  console.log(`Génération plannings ${year}...`);
  const result = await generateYearlySchedules(year);
  await touchLastModified();
  console.log(`Terminé : ${result.created} créés, ${result.skipped} déjà présents.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
