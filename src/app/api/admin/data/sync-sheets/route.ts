import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { exportDataSnapshot, importDataSnapshot } from "@/lib/data-snapshot";
import { getAppConfig } from "@/lib/app-config";
import { pullSnapshotFromSheets, pushSnapshotToSheets, testSheetsConnection } from "@/lib/google-sheets";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action as "push" | "pull" | "test";
  const config = await getAppConfig();
  const sheetsConfig = {
    spreadsheetId: body.spreadsheetId ?? config.sheetsSpreadsheetId,
    webAppUrl: body.webAppUrl ?? config.sheetsWebAppUrl,
  };

  try {
    if (action === "test") {
      const message = await testSheetsConnection(sheetsConfig);
      return NextResponse.json({ success: true, message });
    }

    if (action === "push") {
      const snapshot = await exportDataSnapshot();
      const result = await pushSnapshotToSheets(snapshot, sheetsConfig);
      return NextResponse.json({ success: true, method: result.method, message: "Données envoyées vers Google Sheets." });
    }

    if (action === "pull") {
      const snapshot = await pullSnapshotFromSheets(sheetsConfig);
      const email = authResult.session!.user!.email!;
      const result = await importDataSnapshot(snapshot, { preserveUsers: [email] });
      return NextResponse.json({ success: true, ...result, message: "Données importées depuis Google Sheets." });
    }

    return NextResponse.json({ error: "Action invalide (push, pull, test)." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur synchronisation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
