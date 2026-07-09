import { prisma } from "../src/lib/db";
import { runSeed } from "../src/lib/seed";

runSeed()
  .then(({ personnelCount }) => {
    console.log(`Seed terminé : ${personnelCount} collaborateurs importés.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
