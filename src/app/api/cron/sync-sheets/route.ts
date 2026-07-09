import { NextRequest, NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { exportDataSnapshot, importDataSnapshot } from "@/lib/data-snapshot";
import { pullSnapshotFromSheets, pushSnapshotToSheets } from "@/lib/google-sheets";
import { touchLastModified } from "@/lib/permissions";

export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const config = await getAppConfig();
  if (config.dataStorage !== "google_sheets") {
    return NextResponse.json({ skipped: true, reason: "Mode base en ligne actif" });
  }

  const sheetsConfig = {
    spreadsheetId: config.sheetsSpreadsheetId,
    webAppUrl: config.sheetsWebAppUrl,
  };

  if (!sheetsConfig.spreadsheetId?.trim() && !sheetsConfig.webAppUrl?.trim()) {
    return NextResponse.json({ error: "Classeur Google non configuré" }, { status: 400 });
  }

  try {
    const snapshot = await exportDataSnapshot();
    await pushSnapshotToSheets(snapshot, sheetsConfig);
    await touchLastModified();
    return NextResponse.json({
      success: true,
      action: "push",
      message: "Synchronisation planifiée vers Google Sheets terminée.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync échouée";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const config = await getAppConfig();
  if (config.dataStorage !== "google_sheets") {
    return NextResponse.json({ skipped: true, reason: "Mode base en ligne actif" });
  }

  const body = await req.json().catch(() => ({}));
  const direction = (body.direction as string) ?? "push";
  const sheetsConfig = {
    spreadsheetId: config.sheetsSpreadsheetId,
    webAppUrl: config.sheetsWebAppUrl,
  };

  try {
    if (direction === "pull") {
      const snapshot = await pullSnapshotFromSheets(sheetsConfig);
      await importDataSnapshot(snapshot, { preserveUsers: [] });
      await touchLastModified();
      return NextResponse.json({ success: true, action: "pull" });
    }

    const snapshot = await exportDataSnapshot();
    await pushSnapshotToSheets(snapshot, sheetsConfig);
    await touchLastModified();
    return NextResponse.json({ success: true, action: "push" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync échouée";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
