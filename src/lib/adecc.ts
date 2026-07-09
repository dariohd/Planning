import { DISPLAY_POSTES } from "./constants";
import type { CapaRule } from "./app-config";

const DEFAULT_SPREADSHEET_ID = "1m_1QjM77r2GNAn6Utv9ExGk2yobKHayrHELJMI0h4Vk";
const SHEET_NAMES = ["PPR_F10X", "PPR_H175", "PPR_LR", "PPR_MA", "PPR_SA", "PPR_XWB"];

type TargetsByStation = Record<string, Record<number, number>>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

async function fetchSheetCsv(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const text = await res.text();
  return text.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
}

export async function fetchAdeccTargets(
  year: number,
  postes: string[] = [...DISPLAY_POSTES],
  capaRules: Record<string, CapaRule> = {}
): Promise<TargetsByStation> {
  const spreadsheetId = process.env.ADECC_SPREADSHEET_ID ?? DEFAULT_SPREADSHEET_ID;
  const targets: TargetsByStation = {};
  for (const p of postes) targets[p] = {};

  try {
    for (const sheetName of SHEET_NAMES) {
      const rows = await fetchSheetCsv(spreadsheetId, sheetName);
      if (rows.length < 2) continue;
      const headers = rows[0];
      const colMap: Record<number, string> = {};

      for (let i = 1; i < headers.length; i++) {
        const cleanHeader = headers[i].replace(/^PPR\s+/i, "").trim();
        for (const poste of postes) {
          const rule = capaRules[poste] ?? {};
          const mapping = (rule as CapaRule & { mapping?: string }).mapping ?? poste;
          if (cleanHeader === mapping || cleanHeader === poste) {
            colMap[i] = poste;
            break;
          }
        }
      }

      for (let r = 1; r < rows.length && r <= 52; r++) {
        const weekNum = r;
        for (const [colIndex, station] of Object.entries(colMap)) {
          const val = Number(rows[r][Number(colIndex)]) || 0;
          targets[station][weekNum] = (targets[station][weekNum] ?? 0) + val;
        }
      }
    }
  } catch (e) {
    console.error("ADECC fetch error:", e);
  }

  void year;
  return targets;
}
