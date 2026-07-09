import { DISPLAY_POSTES } from "./constants";
import { prisma } from "./db";

export type CapaRule = {
  calcMode?: "shift" | "reel";
  prodTime?: number;
  includedStations?: string;
  mapping?: string;
  maxStaffDay?: number;
  maxCapDay?: number;
  cycle?: string;
};

export type SectorConfig = { id: string; label: string; reapIds: string[] };

export type AppConfigData = {
  appName: string;
  manualTargets: Record<string, number>;
  weeklyTargets: Record<string, Record<string, number>>;
  missions: string[];
  missionColors: Record<string, string>;
  workstations: string[];
  holidayCountry: "FR" | "PT";
  groupByMachine: boolean;
  enableSectors: boolean;
  sectorsConfig: SectorConfig[];
  capaRules: Record<string, CapaRule>;
  targetMode: "manual" | "auto";
  roles: string[];
};

export const DEFAULT_CONFIG: AppConfigData = {
  appName: "Planning Présence",
  manualTargets: Object.fromEntries(DISPLAY_POSTES.map((p) => [p, 0])),
  weeklyTargets: {},
  missions: ["Mi"],
  missionColors: { Mi: "bg-violet-200 text-violet-900" },
  workstations: [...DISPLAY_POSTES],
  holidayCountry: "FR",
  groupByMachine: false,
  enableSectors: false,
  sectorsConfig: [],
  capaRules: Object.fromEntries(
    DISPLAY_POSTES.map((p) => [p, { calcMode: "shift" as const, includedStations: p, prodTime: 10 }])
  ),
  targetMode: "manual",
  roles: [
    "Administrateur",
    "REAP",
    "RP",
    "MFT",
    "Pilote",
    "Lecteur",
    "Non Autorisé",
    "Qualité",
    "Responsable Preparateur",
    "Responsable Qualité",
  ],
};

export async function getAppConfig(): Promise<AppConfigData> {
  const row = await prisma.appConfig.findUnique({ where: { id: "default" } });
  const data = (row?.data as Partial<AppConfigData>) ?? {};
  return {
    ...DEFAULT_CONFIG,
    ...data,
    manualTargets: { ...DEFAULT_CONFIG.manualTargets, ...(data.manualTargets ?? {}) },
    weeklyTargets: data.weeklyTargets ?? {},
    missions: data.missions?.length ? data.missions : DEFAULT_CONFIG.missions,
    missionColors: { ...DEFAULT_CONFIG.missionColors, ...(data.missionColors ?? {}) },
    workstations: data.workstations?.length ? data.workstations : DEFAULT_CONFIG.workstations,
    enableSectors: data.enableSectors ?? false,
    sectorsConfig: data.sectorsConfig ?? [],
    capaRules: { ...DEFAULT_CONFIG.capaRules, ...(data.capaRules ?? {}) },
    roles: data.roles?.length ? data.roles : DEFAULT_CONFIG.roles,
  };
}

export async function saveAppConfig(patch: Partial<AppConfigData>): Promise<AppConfigData> {
  const current = await getAppConfig();
  const merged = { ...current, ...patch };
  await prisma.appConfig.upsert({
    where: { id: "default" },
    create: { id: "default", data: merged },
    update: { data: merged },
  });
  return merged;
}
