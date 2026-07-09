import { prisma } from "./db";
import { touchLastModified } from "./permissions";

export type GasDayVal = string | { s?: string; c?: string; hs?: string; loc?: string };
export type GasPresenceRow = {
  personnelId?: string;
  matricule?: string | null;
  nom?: string;
  prenom?: string;
  year: number;
  presences?: Record<string, GasDayVal>;
  months?: Record<string, Record<string, GasDayVal>>;
};

export type PresenceImportEntry = {
  personnelKey: string;
  date: string;
  status: string;
  comment?: string;
  hs?: string;
  location?: string;
};

export function parseGasDay(val: GasDayVal | undefined): {
  status: string;
  comment?: string;
  hs?: string;
  location?: string;
} | null {
  if (!val) return null;
  if (typeof val === "string") return val ? { status: val } : null;
  if (!val.s) return null;
  return {
    status: val.s,
    comment: val.c ?? undefined,
    hs: val.hs != null ? String(val.hs) : undefined,
    location: val.loc ?? undefined,
  };
}

export function expandGasRow(row: GasPresenceRow): PresenceImportEntry[] {
  const out: PresenceImportEntry[] = [];
  const key = row.personnelId ?? row.matricule ?? `${row.nom ?? ""}|${row.prenom ?? ""}`;

  if (row.presences) {
    for (const [date, val] of Object.entries(row.presences)) {
      const parsed = parseGasDay(val);
      if (parsed) out.push({ personnelKey: key, date, ...parsed });
    }
  }

  if (row.months) {
    for (const [month, days] of Object.entries(row.months)) {
      for (const [day, val] of Object.entries(days)) {
        const parsed = parseGasDay(val);
        if (!parsed) continue;
        const date = `${row.year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        out.push({ personnelKey: key, date, ...parsed });
      }
    }
  }

  return out;
}

export function resolvePersonnelIdFromRow(
  key: string,
  row: GasPresenceRow,
  byId: Map<string, string>,
  byMatricule: Map<string, string>,
  byName: Map<string, string>
): string | null {
  if (byId.has(key)) return byId.get(key)!;
  if (row.matricule && byMatricule.has(row.matricule)) return byMatricule.get(row.matricule)!;
  const nameKey = `${(row.prenom ?? "").toLowerCase()}|${(row.nom ?? "").toLowerCase()}`;
  if (byName.has(nameKey)) return byName.get(nameKey)!;
  if (key.includes("|")) {
    const [prenom, nom] = key.split("|");
    const nk = `${prenom.toLowerCase()}|${nom.toLowerCase()}`;
    if (byName.has(nk)) return byName.get(nk)!;
  }
  return byId.has(key) ? key : null;
}

export type ImportPresencesOptions = {
  yearFilter?: string;
  dryRun?: boolean;
};

export type ImportPresencesResult = {
  imported: number;
  skipped: number;
  unknownKeys: string[];
};

async function upsertPresenceEntries(
  entries: PresenceImportEntry[],
  rowByKey: Map<string, GasPresenceRow>,
  byId: Map<string, string>,
  byMatricule: Map<string, string>,
  byName: Map<string, string>,
  dryRun?: boolean
): Promise<ImportPresencesResult> {
  let imported = 0;
  let skipped = 0;
  const unknown = new Set<string>();

  for (const entry of entries) {
    const row = rowByKey.get(entry.personnelKey) ?? ({ year: Number(entry.date.slice(0, 4)) } as GasPresenceRow);
    const personnelId = resolvePersonnelIdFromRow(entry.personnelKey, row, byId, byMatricule, byName);
    if (!personnelId) {
      unknown.add(entry.personnelKey);
      skipped++;
      continue;
    }

    if (dryRun) {
      imported++;
      continue;
    }

    await prisma.presence.upsert({
      where: { personnelId_date: { personnelId, date: entry.date } },
      create: {
        personnelId,
        date: entry.date,
        status: entry.status,
        comment: entry.comment ?? null,
        hs: entry.hs ?? null,
        location: entry.location ?? null,
      },
      update: {
        status: entry.status,
        comment: entry.comment ?? null,
        hs: entry.hs ?? null,
        location: entry.location ?? null,
      },
    });
    imported++;
  }

  return { imported, skipped, unknownKeys: [...unknown] };
}

export async function importPresencesFromGas(
  rows: GasPresenceRow[],
  options: ImportPresencesOptions = {}
): Promise<ImportPresencesResult> {
  const personnel = await prisma.personnel.findMany();
  const byId = new Map(personnel.map((p) => [p.id, p.id]));
  const byMatricule = new Map(personnel.filter((p) => p.matricule).map((p) => [p.matricule!, p.id]));
  const byName = new Map(personnel.map((p) => [`${p.prenom.toLowerCase()}|${p.nom.toLowerCase()}`, p.id]));
  const { yearFilter, dryRun } = options;

  const rowByKey = new Map(
    rows.map((r) => {
      const key = r.personnelId ?? r.matricule ?? `${r.nom ?? ""}|${r.prenom ?? ""}`;
      return [key, r] as const;
    })
  );

  const allEntries: PresenceImportEntry[] = [];
  for (const row of rows) {
    if (yearFilter && String(row.year) !== yearFilter) continue;
    for (const entry of expandGasRow(row)) {
      if (!yearFilter || entry.date.startsWith(`${yearFilter}-`)) allEntries.push(entry);
    }
  }

  const result = await upsertPresenceEntries(allEntries, rowByKey, byId, byMatricule, byName, dryRun);

  if (!dryRun && result.imported > 0) {
    await touchLastModified();
  }

  return result;
}

export async function importPresencesFromGasUrl(
  webAppUrl: string,
  options: ImportPresencesOptions = {}
): Promise<ImportPresencesResult> {
  const base = webAppUrl.trim();
  if (!base) throw new Error("URL de synchronisation requise.");

  const url = base.includes("?") ? `${base}&action=export` : `${base}?action=export`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de récupérer les données (${res.status}).`);

  const data = (await res.json()) as
    | GasPresenceRow[]
    | {
        presences?: Array<{
          personnelId: string;
          date: string;
          status: string;
          comment?: string | null;
          hs?: string | null;
          location?: string | null;
        }>;
      };

  if (Array.isArray(data)) {
    return importPresencesFromGas(data, options);
  }

  if (!data.presences?.length) {
    throw new Error("Aucune présence trouvée dans le classeur.");
  }

  const personnel = await prisma.personnel.findMany();
  const byId = new Map(personnel.map((p) => [p.id, p.id]));
  const byMatricule = new Map(personnel.filter((p) => p.matricule).map((p) => [p.matricule!, p.id]));
  const byName = new Map(personnel.map((p) => [`${p.prenom.toLowerCase()}|${p.nom.toLowerCase()}`, p.id]));
  const rowByKey = new Map<string, GasPresenceRow>();

  const entries: PresenceImportEntry[] = data.presences
    .filter((p) => p.status)
    .map((p) => ({
      personnelKey: p.personnelId,
      date: p.date,
      status: p.status,
      comment: p.comment ?? undefined,
      hs: p.hs ?? undefined,
      location: p.location ?? undefined,
    }))
    .filter((e) => !options.yearFilter || e.date.startsWith(`${options.yearFilter}-`));

  const result = await upsertPresenceEntries(entries, rowByKey, byId, byMatricule, byName, options.dryRun);

  if (!options.dryRun && result.imported > 0) {
    await touchLastModified();
  }

  return result;
}
