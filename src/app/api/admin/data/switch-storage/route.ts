import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { saveAppConfig } from "@/lib/app-config";
import { exportDataSnapshot, importDataSnapshot } from "@/lib/data-snapshot";
import { pullSnapshotFromSheets, pushSnapshotToSheets } from "@/lib/google-sheets";
import { touchLastModified } from "@/lib/permissions";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json();
  const target = body.target as "database" | "google_sheets";
  const syncData = body.syncData !== false;
  const sheetsConfig = {
    spreadsheetId: body.sheetsSpreadsheetId as string | undefined,
    webAppUrl: body.sheetsWebAppUrl as string | undefined,
  };

  if (!target || !["database", "google_sheets"].includes(target)) {
    return NextResponse.json({ error: "Cible invalide." }, { status: 400 });
  }

  const steps: string[] = [];
  const email = authResult.session!.user!.email!;

  try {
    if (target === "google_sheets") {
      if (syncData) {
        if (!sheetsConfig.spreadsheetId?.trim() && !sheetsConfig.webAppUrl?.trim()) {
          return NextResponse.json(
            { error: "Renseignez le classeur Google ou l'URL de synchronisation." },
            { status: 400 }
          );
        }
        const snapshot = await exportDataSnapshot();
        await pushSnapshotToSheets(snapshot, sheetsConfig);
        steps.push("push_sheets");
      }

      await saveAppConfig({
        dataStorage: "google_sheets",
        sheetsSpreadsheetId: sheetsConfig.spreadsheetId ?? "",
        sheetsWebAppUrl: sheetsConfig.webAppUrl ?? "",
      });
      steps.push("config_updated");

      await touchLastModified();

      return NextResponse.json({
        success: true,
        target,
        steps,
        message:
          "Vos données sont maintenant liées à Google Sheets. Le classeur a été mis à jour. L'application utilise toujours la base en ligne pour l'affichage rapide.",
      });
    }

    if (target === "database") {
      if (syncData) {
        if (!sheetsConfig.spreadsheetId?.trim() && !sheetsConfig.webAppUrl?.trim()) {
          return NextResponse.json(
            { error: "Renseignez le classeur Google pour récupérer les données." },
            { status: 400 }
          );
        }
        const snapshot = await pullSnapshotFromSheets(sheetsConfig);
        await importDataSnapshot(snapshot, { preserveUsers: [email] });
        steps.push("pull_sheets");
      }

      await saveAppConfig({
        dataStorage: "database",
        sheetsSpreadsheetId: sheetsConfig.spreadsheetId ?? "",
        sheetsWebAppUrl: sheetsConfig.webAppUrl ?? "",
      });
      steps.push("config_updated");

      await touchLastModified();

      return NextResponse.json({
        success: true,
        target,
        steps,
        message:
          "Vos données sont maintenant sur la base en ligne. L'application utilise cette source pour le quotidien.",
      });
    }

    return NextResponse.json({ error: "Cible invalide." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Changement de stockage échoué";
    return NextResponse.json({ error: message, steps }, { status: 500 });
  }
}
