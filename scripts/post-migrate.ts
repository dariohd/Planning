/**
 * Vérifications et finalisation après migration.
 * - Lie le compte démo au REAP correspondant
 * - Affiche les statistiques de la base
 *
 * Usage : npm run post-migrate
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { envValue } from "../src/lib/demo-auth";
import { touchLastModified } from "../src/lib/permissions";

async function linkDemoUser() {
  const demoUsername = envValue("DEMO_USERNAME");
  if (!demoUsername) {
    console.log("DEMO_USERNAME non défini — liaison démo ignorée.");
    return;
  }

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

  console.log(`Compte démo ${email} (${role})${personnelId ? " lié au personnel " + personnelId : " — pas de REAP correspondant trouvé"}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL requise.");
    process.exit(1);
  }

  const year = new Date().getFullYear();
  const [personnelCount, presenceCount, userCount, capaReelCount] = await Promise.all([
    prisma.personnel.count(),
    prisma.presence.count({ where: { date: { startsWith: `${year}-` } } }),
    prisma.user.count(),
    prisma.capaReel.count({ where: { year } }),
  ]);

  console.log(`\nÉtat base — ${year}`);
  console.log(`  Personnel      : ${personnelCount}`);
  console.log(`  Présences ${year} : ${presenceCount}`);
  console.log(`  Utilisateurs   : ${userCount}`);
  console.log(`  Capa réel ${year} : ${capaReelCount} saisies`);

  await linkDemoUser();
  await touchLastModified();
  console.log("\nPost-migration terminée.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
