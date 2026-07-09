import { execSync } from "child_process";
import { prisma } from "../src/lib/db";
import { runSeed } from "../src/lib/seed";

async function ensureAdmins() {
  await prisma.user.upsert({
    where: { email: "darioh@tuta.io" },
    create: { email: "darioh@tuta.io", role: "Administrateur", name: "Dario H" },
    update: { role: "Administrateur" },
  });
  console.log("Administrateur darioh@tuta.io configuré.");
}

async function maybeSeed() {
  const count = await prisma.personnel.count();
  if (count > 0) {
    console.log(`Base déjà peuplée (${count} collaborateurs) — import ignoré.`);
    return;
  }
  const { personnelCount } = await runSeed();
  console.log(`Import terminé : ${personnelCount} collaborateurs.`);
}

async function main() {
  execSync("npx prisma generate", { stdio: "inherit" });

  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL détectée — application du schéma Prisma...");
    execSync("npx prisma db push", { stdio: "inherit" });
    await maybeSeed();
    await ensureAdmins();
    await prisma.$disconnect();
  } else {
    console.warn("DATABASE_URL absente — schéma non appliqué.");
  }

  execSync("npx next build", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
