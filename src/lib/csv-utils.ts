export function parseCsvLine(line: string, sep = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

export function escapeCsvCell(value: unknown, sep = ";"): string {
  const s = String(value ?? "");
  if (s.includes(sep) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][], sep = ";"): string {
  const lines = [
    headers.join(sep),
    ...rows.map((row) => row.map((c) => escapeCsvCell(c, sep)).join(sep)),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function parseCsv(content: string, sep = ";"): { headers: string[]; rows: string[][] } {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0], sep);
  const rows = lines.slice(1).map((l) => parseCsvLine(l, sep));
  return { headers, rows };
}
