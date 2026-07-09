import { prisma } from "./db";
import { DEFAULT_CONFIG, getAppConfig, saveAppConfig, type AppConfigData } from "./app-config";
import { touchLastModified } from "./permissions";

export const DATA_SNAPSHOT_VERSION = 1;

export type DataSnapshot = {
  version: number;
  exportedAt: string;
  personnel: Awaited<ReturnType<typeof prisma.personnel.findMany>>;
  presences: Awaited<ReturnType<typeof prisma.presence.findMany>>;
  users: Awaited<ReturnType<typeof prisma.user.findMany>>;
  capaReel: Awaited<ReturnType<typeof prisma.capaReel.findMany>>;
  appMeta: Awaited<ReturnType<typeof prisma.appMeta.findMany>>;
  config: AppConfigData;
};

export async function exportDataSnapshot(): Promise<DataSnapshot> {
  const [personnel, presences, users, capaReel, appMeta, config] = await Promise.all([
    prisma.personnel.findMany({ orderBy: { nom: "asc" } }),
    prisma.presence.findMany({ orderBy: [{ personnelId: "asc" }, { date: "asc" }] }),
    prisma.user.findMany({ orderBy: { email: "asc" } }),
    prisma.capaReel.findMany({ orderBy: [{ year: "asc" }, { week: "asc" }] }),
    prisma.appMeta.findMany(),
    getAppConfig(),
  ]);

  return {
    version: DATA_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    personnel,
    presences,
    users,
    capaReel,
    appMeta,
    config,
  };
}

export type ImportOptions = {
  merge?: boolean;
  preserveUsers?: string[];
};

export async function importDataSnapshot(snapshot: DataSnapshot, options: ImportOptions = {}): Promise<{
  personnel: number;
  presences: number;
  users: number;
  capaReel: number;
}> {
  if (!snapshot.version || !Array.isArray(snapshot.personnel)) {
    throw new Error("Format de sauvegarde invalide.");
  }

  const preserve = new Set((options.preserveUsers ?? []).map((e) => e.toLowerCase()));

  if (!options.merge) {
    await prisma.$transaction([
      prisma.presence.deleteMany(),
      prisma.capaReel.deleteMany(),
      prisma.personnel.deleteMany(),
      prisma.user.deleteMany({
        where: preserve.size ? { email: { notIn: [...preserve] } } : undefined,
      }),
      prisma.appMeta.deleteMany(),
    ]);
  }

  let personnelCount = 0;
  for (const p of snapshot.personnel) {
    const row = p as Record<string, unknown>;
    const data = {
      id: String(row.id),
      matricule: row.matricule ? String(row.matricule) : null,
      nom: String(row.nom),
      prenom: String(row.prenom),
      role: String(row.role),
      chefEquipeAssocie: row.chefEquipeAssocie ? String(row.chefEquipeAssocie) : null,
      section: row.section ? String(row.section) : null,
      typeQuart: row.typeQuart ? String(row.typeQuart) : null,
      quartDefaut: row.quartDefaut ? String(row.quartDefaut) : null,
      posteDeTravail: row.posteDeTravail ? String(row.posteDeTravail) : null,
      mftAssocie: row.mftAssocie ? String(row.mftAssocie) : null,
      responsableHierarchique: row.responsableHierarchique ? String(row.responsableHierarchique) : null,
      statut: row.statut ? String(row.statut) : "Actif",
      tauxEfficacite: Number(row.tauxEfficacite) || 100,
    };
    await prisma.personnel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
    personnelCount++;
  }

  let presenceCount = 0;
  if (!options.merge) {
    await prisma.presence.deleteMany();
  }
  for (const row of snapshot.presences) {
    const p = row as Record<string, unknown>;
    const data = {
      personnelId: String(p.personnelId),
      date: String(p.date),
      status: String(p.status),
      location: p.location ? String(p.location) : null,
      comment: p.comment ? String(p.comment) : null,
      hs: p.hs != null ? String(p.hs) : null,
    };
    await prisma.presence.upsert({
      where: { personnelId_date: { personnelId: data.personnelId, date: data.date } },
      create: data,
      update: {
        status: data.status,
        location: data.location,
        comment: data.comment,
        hs: data.hs,
      },
    });
    presenceCount++;
  }

  let userCount = 0;
  for (const u of snapshot.users) {
    if (preserve.has(u.email.toLowerCase())) continue;
    const data = {
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
      personnelId: u.personnelId,
    };
    await prisma.user.upsert({
      where: { email: data.email },
      create: data,
      update: { role: data.role, name: data.name, personnelId: data.personnelId },
    });
    userCount++;
  }

  let capaCount = 0;
  if (!options.merge) {
    await prisma.capaReel.deleteMany();
  }
  for (const c of snapshot.capaReel) {
    const data = {
      year: c.year,
      week: c.week,
      poste: c.poste,
      value: c.value,
    };
    await prisma.capaReel.upsert({
      where: { year_week_poste: { year: data.year, week: data.week, poste: data.poste } },
      create: data,
      update: { value: data.value },
    });
    capaCount++;
  }

  if (snapshot.appMeta?.length) {
    for (const m of snapshot.appMeta) {
      await prisma.appMeta.upsert({
        where: { key: m.key },
        create: { key: m.key, value: m.value },
        update: { value: m.value },
      });
    }
  }

  if (snapshot.config) {
    await saveAppConfig(snapshot.config);
  }

  await touchLastModified();

  return {
    personnel: personnelCount,
    presences: presenceCount,
    users: userCount,
    capaReel: capaCount,
  };
}

export async function deleteAllData(keepUserEmails: string[] = []): Promise<void> {
  const keep = keepUserEmails.map((e) => e.toLowerCase());

  await prisma.$transaction([
    prisma.presence.deleteMany(),
    prisma.capaReel.deleteMany(),
    prisma.personnel.deleteMany(),
    prisma.user.deleteMany({
      where: keep.length ? { email: { notIn: keep } } : undefined,
    }),
    prisma.appMeta.deleteMany(),
  ]);

  await saveAppConfig(DEFAULT_CONFIG);
  await touchLastModified();
}

export function snapshotToJson(snapshot: DataSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseSnapshotJson(raw: string): DataSnapshot {
  const data = JSON.parse(raw) as DataSnapshot;
  if (!data.version) throw new Error("Fichier de sauvegarde non reconnu.");
  return data;
}
