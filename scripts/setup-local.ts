import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runSeed } from "../src/lib/seed";
import { saveAppConfig, DEFAULT_CONFIG } from "../src/lib/app-config";
import { linkDemoUser, maybeGenerateYearlySchedules } from "../src/lib/post-migrate";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL requise. Options :");
    console.error("  - PostgreSQL local : postgresql://user:password@localhost:5432/planning");
    console.error("  - Neon / Vercel : npx vercel env pull .env.local puis copier DATABASE_URL");
    console.error("  - Dev cloud : npx vercel dev (injecte les variables Vercel)");
    process.exit(1);
  }

  const personnelCount = await prisma.personnel.count();
  if (personnelCount === 0) {
    console.log("Import du personnel depuis le CSV legacy...");
    const { personnelCount: imported } = await runSeed();
    console.log(`Import terminé : ${imported} collaborateurs.`);
  } else {
    console.log(`Personnel déjà en base : ${personnelCount} collaborateurs.`);
  }

  await saveAppConfig(DEFAULT_CONFIG);
  console.log("Configuration par défaut enregistrée.");

  const year = new Date().getFullYear();
  const presenceCount = await prisma.presence.count({
    where: { date: { startsWith: `${year}-` } },
  });

  if (presenceCount === 0) {
    console.log(`Génération des plannings ${year}...`);
    const result = await maybeGenerateYearlySchedules();
    if (result) console.log(`Plannings générés : ${result.created} créés, ${result.skipped} ignorés.`);
  } else {
    console.log(`Présences ${year} déjà présentes (${presenceCount} lignes).`);
  }

  await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    create: { email: "admin@local.dev", role: "Administrateur", name: "Admin Local" },
    update: { role: "Administrateur" },
  });
  console.log("Compte admin local : admin@local.dev (connexion dev sans mot de passe)");

  await linkDemoUser();

  console.log("\nSetup terminé. Lancez : npm run dev  (ou npx vercel dev pour les variables Vercel)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
