import type { DataSnapshot } from "./data-snapshot";

export type SheetsStorageConfig = {
  spreadsheetId?: string;
  webAppUrl?: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function base64Url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getServiceAccount(): Promise<ServiceAccount | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(json) as ServiceAccount;
  } catch {
    return null;
  }
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = base64Url(sign.sign(sa.private_key));
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) throw new Error(`Authentification Google échouée (${res.status})`);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function sheetsApi(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets API : ${res.status} — ${err.slice(0, 200)}`);
  }
  return res.json();
}

const TAB_NAMES = ["Personnel", "Presences", "Users", "CapaReel", "Config", "Meta"] as const;

async function ensureTabs(spreadsheetId: string, token: string): Promise<void> {
  const meta = (await sheetsApi("GET", spreadsheetId, token)) as {
    sheets?: { properties?: { title?: string } }[];
  };
  const existing = new Set((meta.sheets ?? []).map((s) => s.properties?.title));
  const requests = TAB_NAMES.filter((t) => !existing.has(t)).map((title) => ({
    addSheet: { properties: { title } },
  }));
  if (requests.length) {
    await sheetsApi("POST", `${spreadsheetId}:batchUpdate`, token, { requests });
  }
}

function personnelRows(snapshot: DataSnapshot): string[][] {
  const header = [
    "id", "matricule", "nom", "prenom", "role", "chefEquipeAssocie", "section",
    "typeQuart", "quartDefaut", "posteDeTravail", "mftAssocie", "responsableHierarchique",
    "statut", "tauxEfficacite",
  ];
  const rows = snapshot.personnel.map((p) =>
    header.map((k) => String((p as Record<string, unknown>)[k] ?? ""))
  );
  return [header, ...rows];
}

function presenceRows(snapshot: DataSnapshot): string[][] {
  const byPersonYear = new Map<string, Map<number, Record<string, Record<string, unknown>>>>();

  for (const p of snapshot.presences) {
    const year = Number(p.date.slice(0, 4));
    const month = Number(p.date.slice(5, 7));
    const day = String(Number(p.date.slice(8, 10)));
    const key = `${p.personnelId}|${year}`;
    if (!byPersonYear.has(key)) byPersonYear.set(key, new Map());
    const months = byPersonYear.get(key)!;
    if (!months.has(month)) months.set(month, {});
    const dayData: Record<string, unknown> = { s: p.status };
    if (p.comment) dayData.c = p.comment;
    if (p.hs) dayData.hs = p.hs;
    if (p.location) dayData.loc = p.location;
    months.get(month)![day] = dayData;
  }

  const rows: string[][] = [["personnelId", "year", ...Array.from({ length: 12 }, (_, i) => `m${i + 1}`)]];
  for (const [key, months] of byPersonYear) {
    const [personnelId, yearStr] = key.split("|");
    const row = [personnelId, yearStr];
    for (let m = 1; m <= 12; m++) {
      const monthData = months.get(m);
      row.push(monthData ? JSON.stringify(monthData) : "");
    }
    rows.push(row);
  }
  return rows;
}

function userRows(snapshot: DataSnapshot): string[][] {
  const header = ["email", "role", "name", "personnelId"];
  return [header, ...snapshot.users.map((u) => header.map((k) => String((u as Record<string, unknown>)[k] ?? "")))];
}

function capaRows(snapshot: DataSnapshot): string[][] {
  const header = ["year", "week", "poste", "value"];
  return [header, ...snapshot.capaReel.map((c) => [String(c.year), String(c.week), c.poste, c.value != null ? String(c.value) : ""])];
}

async function writeTab(
  spreadsheetId: string,
  token: string,
  tab: string,
  rows: string[][]
): Promise<void> {
  await sheetsApi("PUT", `${spreadsheetId}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`, token, {
    range: `${tab}!A1`,
    majorDimension: "ROWS",
    values: rows,
  });
}

export async function pushSnapshotToSheets(
  snapshot: DataSnapshot,
  config: SheetsStorageConfig
): Promise<{ method: "api" | "webapp" }> {
  if (config.webAppUrl) {
    const res = await fetch(config.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", data: snapshot }),
    });
    if (!res.ok) throw new Error(`Web App GAS : ${res.status}`);
    return { method: "webapp" };
  }

  const spreadsheetId = config.spreadsheetId?.trim();
  if (!spreadsheetId) throw new Error("ID du classeur Google Sheets requis.");

  const sa = await getServiceAccount();
  if (!sa) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON non configuré. Utilisez une Web App GAS ou ajoutez un compte de service.");

  const token = await getAccessToken(sa);
  await ensureTabs(spreadsheetId, token);

  await Promise.all([
    writeTab(spreadsheetId, token, "Personnel", personnelRows(snapshot)),
    writeTab(spreadsheetId, token, "Presences", presenceRows(snapshot)),
    writeTab(spreadsheetId, token, "Users", userRows(snapshot)),
    writeTab(spreadsheetId, token, "CapaReel", capaRows(snapshot)),
    writeTab(spreadsheetId, token, "Config", [["json"], [JSON.stringify(snapshot.config)]]),
    writeTab(spreadsheetId, token, "Meta", [["exportedAt"], [snapshot.exportedAt]]),
  ]);

  return { method: "api" };
}

export async function pullSnapshotFromSheets(config: SheetsStorageConfig): Promise<DataSnapshot> {
  if (config.webAppUrl) {
    const url = config.webAppUrl.includes("?")
      ? `${config.webAppUrl}&action=export`
      : `${config.webAppUrl}?action=export`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Web App GAS : ${res.status}`);
    return (await res.json()) as DataSnapshot;
  }

  const spreadsheetId = config.spreadsheetId?.trim();
  if (!spreadsheetId) throw new Error("ID du classeur Google Sheets requis.");

  const sa = await getServiceAccount();
  if (!sa) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON non configuré.");

  const token = await getAccessToken(sa);

  async function readTab(tab: string): Promise<string[][]> {
    const data = (await sheetsApi(
      "GET",
      `${spreadsheetId}/values/${encodeURIComponent(tab)}!A:ZZ`,
      token
    )) as { values?: string[][] };
    return data.values ?? [];
  }

  const [personnelData, presencesData, usersData, capaData, configData] = await Promise.all([
    readTab("Personnel"),
    readTab("Presences"),
    readTab("Users"),
    readTab("CapaReel"),
    readTab("Config"),
  ]);

  const personnelHeader = personnelData[0] ?? [];
  const personnel = personnelData.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    personnelHeader.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return {
      id: obj.id,
      matricule: obj.matricule || null,
      nom: obj.nom,
      prenom: obj.prenom,
      role: obj.role,
      chefEquipeAssocie: obj.chefEquipeAssocie || null,
      section: obj.section || null,
      typeQuart: obj.typeQuart || null,
      quartDefaut: obj.quartDefaut || null,
      posteDeTravail: obj.posteDeTravail || null,
      mftAssocie: obj.mftAssocie || null,
      responsableHierarchique: obj.responsableHierarchique || null,
      statut: obj.statut || "Actif",
      tauxEfficacite: Number(obj.tauxEfficacite) || 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const presences: DataSnapshot["presences"] = [];
  for (const row of presencesData.slice(1)) {
    const personnelId = row[0];
    const year = row[1];
    if (!personnelId || !year) continue;
    for (let m = 1; m <= 12; m++) {
      const cell = row[m + 1];
      if (!cell) continue;
      try {
        const monthData = JSON.parse(cell) as Record<string, Record<string, unknown>>;
        for (const [day, dayData] of Object.entries(monthData)) {
          const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = typeof dayData === "string" ? dayData : String(dayData.s ?? "");
          if (!status) continue;
          presences.push({
            id: `${personnelId}-${date}`,
            personnelId,
            date,
            status,
            location: dayData.loc ? String(dayData.loc) : null,
            comment: dayData.c ? String(dayData.c) : null,
            hs: dayData.hs != null ? String(dayData.hs) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch {
        /* ignore malformed cell */
      }
    }
  }

  const usersHeader = usersData[0] ?? [];
  const users = usersData.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    usersHeader.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return {
      id: obj.email,
      email: obj.email,
      role: obj.role,
      name: obj.name || null,
      personnelId: obj.personnelId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const capaHeader = capaData[0] ?? [];
  const capaReel = capaData.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    capaHeader.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return {
      id: `${obj.year}-${obj.week}-${obj.poste}`,
      year: Number(obj.year),
      week: Number(obj.week),
      poste: obj.poste,
      value: obj.value ? Number(obj.value) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  let appConfig: DataSnapshot["config"];
  try {
    appConfig = JSON.parse(configData[1]?.[0] ?? "{}") as DataSnapshot["config"];
  } catch {
    appConfig = {} as DataSnapshot["config"];
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    personnel,
    presences,
    users,
    capaReel,
    appMeta: [],
    config: appConfig,
  };
}

export async function testSheetsConnection(config: SheetsStorageConfig): Promise<string> {
  if (config.webAppUrl) {
    const url = config.webAppUrl.includes("?")
      ? `${config.webAppUrl}&action=ping`
      : `${config.webAppUrl}?action=ping`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Web App inaccessible (${res.status})`);
    return "Web App GAS connectée";
  }

  const spreadsheetId = config.spreadsheetId?.trim();
  if (!spreadsheetId) throw new Error("Renseignez l'ID du classeur ou l'URL Web App.");

  const sa = await getServiceAccount();
  if (!sa) throw new Error("Compte de service Google non configuré.");

  const token = await getAccessToken(sa);
  const meta = (await sheetsApi("GET", spreadsheetId, token)) as { properties?: { title?: string } };
  return `Classeur « ${meta.properties?.title ?? spreadsheetId} » accessible`;
}
