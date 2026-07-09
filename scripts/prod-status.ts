import { prisma } from "../src/lib/db";
import { getAppConfig } from "../src/lib/app-config";

async function main() {
  const config = await getAppConfig();
  const [personnelCount, presenceCount, userCount] = await Promise.all([
    prisma.personnel.count(),
    prisma.presence.count(),
    prisma.user.count(),
  ]);
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true, personnelId: true },
  });
  const tristan = await prisma.personnel.findMany({
    where: {
      OR: [
        { nom: { contains: "menager", mode: "insensitive" } },
        { prenom: { contains: "tristan", mode: "insensitive" } },
      ],
    },
    select: { id: true, nom: true, prenom: true, role: true },
  });

  console.log(
    JSON.stringify(
      {
        personnelCount,
        presenceCount,
        userCount,
        dataStorage: config.dataStorage,
        sheetsWebAppUrl: config.sheetsWebAppUrl || null,
        sheetsSpreadsheetId: config.sheetsSpreadsheetId || null,
        users,
        tristanMatches: tristan,
        demoUsername: process.env.DEMO_USERNAME ?? null,
        hasCronSecret: Boolean(process.env.CRON_SECRET),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
