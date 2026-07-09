import { prisma } from "./db";
import { envValue } from "./demo-auth";
import { touchLastModified } from "./permissions";
import { generateYearlySchedules } from "./schedule-generator";

export async function linkDemoUser(): Promise<void> {
  const demoUsername = envValue("DEMO_USERNAME");
  if (!demoUsername) return;

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
}

export async function maybeGenerateYearlySchedules(): Promise<{ created: number; skipped: number } | null> {
  const year = new Date().getFullYear();
  const [personnelCount, presenceCount] = await Promise.all([
    prisma.personnel.count(),
    prisma.presence.count({ where: { date: { startsWith: `${year}-` } } }),
  ]);

  if (personnelCount === 0 || presenceCount > 0) return null;

  const result = await generateYearlySchedules(year);
  await touchLastModified();
  return result;
}

export async function getDatabaseStats() {
  const year = new Date().getFullYear();
  const [personnelCount, presenceCount, userCount, capaReelCount] = await Promise.all([
    prisma.personnel.count(),
    prisma.presence.count({ where: { date: { startsWith: `${year}-` } } }),
    prisma.user.count(),
    prisma.capaReel.count({ where: { year } }),
  ]);
  return { year, personnelCount, presenceCount, userCount, capaReelCount };
}
