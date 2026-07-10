import type { SectorConfig } from "./app-config";

export const SECTOR_API_PREFIX = "__SECTOR__:";
export const SECTOR_OPTION_PREFIX = "Secteur — ";

export function sectorOptionLabel(sector: SectorConfig): string {
  return `${SECTOR_OPTION_PREFIX}${sector.label}`;
}

export function sectorApiToken(sector: SectorConfig): string {
  return `${SECTOR_API_PREFIX}${sector.id}`;
}

export function mapTeamSelectionForApi(selection: string, sectors: SectorConfig[]): string {
  if (selection === "Non affectés 3×8") return "__UNASSIGNED_3x8__";
  if (selection.startsWith(SECTOR_OPTION_PREFIX)) {
    const label = selection.slice(SECTOR_OPTION_PREFIX.length);
    const sector = sectors.find((s) => s.label === label);
    return sector ? sectorApiToken(sector) : selection;
  }
  return selection;
}

export function parseSectorsConfigText(raw: string): SectorConfig[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as SectorConfig[];
    if (!Array.isArray(parsed)) throw new Error("JSON invalide");
    return parsed.map((s, i) => ({
      id: String(s.id ?? `sector-${i + 1}`),
      label: String(s.label ?? `Secteur ${i + 1}`),
      reapIds: Array.isArray(s.reapIds) ? s.reapIds.map(String) : [],
    }));
  }
  return trimmed.split("\n").filter(Boolean).map((line, i) => {
    const [labelPart, idsPart] = line.split(":").map((p) => p.trim());
    const reapIds = (idsPart ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return { id: `sector-${i + 1}`, label: labelPart || `Secteur ${i + 1}`, reapIds };
  });
}
