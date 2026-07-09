import "dotenv/config";
import { prisma } from "../src/lib/db";
import { getDatabaseStats, linkDemoUser } from "../src/lib/post-migrate";
import { touchLastModified } from "../src/lib/permissions";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL requise.");
    process.exit(1);
  }

  const stats = await getDatabaseStats();
  console.log(`\nÉtat base — ${stats.year}`);
  console.log(`  Personnel      : ${stats.personnelCount}`);
  console.log(`  Présences ${stats.year} : ${stats.presenceCount}`);
  console.log(`  Utilisateurs   : ${stats.userCount}`);
  console.log(`  Capa réel ${stats.year} : ${stats.capaReelCount} saisies`);

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
