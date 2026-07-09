import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runSeed } from "../src/lib/seed";
import { generateYearlySchedules } from "../src/lib/schedule-generator";
import { saveAppConfig, DEFAULT_CONFIG } from "../src/lib/app-config";
import { envValue } from "../src/lib/demo-auth";

async function linkDemoUser() {
  const demoUsername = envValue("DEMO_USERNAME");
  const demoPassword = envValue("DEMO_PASSWORD");
  if (!demoUsername || !demoPassword) return;

  const email = (process.env.DEMO_USER_EMAIL ?? `${demoUsername.toLowerCase()}@demo.planning.local`).toLowerCase();
  const role = envValue("DEMO_USER_ROLE") ?? "REAP";
  let personnelId: string | null = process.env.DEMO_PERSONNEL_ID?.trim() || null;

  if (!personnelId && process.env.DEMO_PERSONNEL_NAME) {
    const [prenom, ...rest] = process.env.DEMO_PERSONNEL_NAME.trim().split(/\s+/);
    const nom = rest.join(" ");
    const match = await prisma.personnel.findFirst({
      where: {
        prenom: { equals: prenom, mode: "insensitive" },
        ...(nom ? { nom: { equals: nom, mode: "insensitive" } } : {}),
      },
    });
    personnelId = match?.id ?? null;
  }

  if (!personnelId && role === "REAP") {
    const key = demoUsername.toLowerCase().replace(/[^a-z]/g, "");
    const reaps = await prisma.personnel.findMany({ where: { role: "REAP" } });
    const match = reaps.find((p) => {
      const n = `${p.prenom}${p.nom}`.toLowerCase().replace(/[^a-z]/g, "");
      return n.includes(key) || key.includes(n);
    });
    personnelId = match?.id ?? null;
  }

  await prisma.user.upsert({
    where: { email },
    create: { email, role, name: demoUsername, personnelId },
    update: { role, name: demoUsername, ...(personnelId ? { personnelId } : {}) },
  });

  console.log(`Compte démo : ${demoUsername} (${role})${personnelId ? " — lié au personnel" : ""}`);
}

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
    const result = await generateYearlySchedules(year);
    console.log(`Plannings générés : ${result.created} créés, ${result.skipped} ignorés.`);
  } else {
    console.log(`Présences ${year} déjà présentes (${presenceCount} lignes) — génération ignorée.`);
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
