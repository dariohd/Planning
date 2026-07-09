import { NextRequest, NextResponse } from "next/server";
import { getAppConfig, saveAppConfig } from "@/lib/app-config";
import { importPresencesFromGasUrl } from "@/lib/import-presences";
import { getDatabaseStats, linkDemoUser } from "@/lib/post-migrate";

export const maxDuration = 120;

function requireSeed(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = requireSeed(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const webAppUrl = (body.webAppUrl as string) || process.env.GAS_WEB_APP_URL || "";
  const yearFilter = body.year as string | undefined;
  const demoPersonnelName = body.demoPersonnelName as string | undefined;

  try {
    if (demoPersonnelName) {
      process.env.DEMO_PERSONNEL_NAME = demoPersonnelName;
    }

    await linkDemoUser();

    let importResult = null;
    const config = await getAppConfig();
    const url = webAppUrl || config.sheetsWebAppUrl;

    if (url?.trim()) {
      if (webAppUrl && webAppUrl !== config.sheetsWebAppUrl) {
        await saveAppConfig({ ...config, sheetsWebAppUrl: webAppUrl });
      }
      importResult = await importPresencesFromGasUrl(url, { yearFilter });
    }

    const stats = await getDatabaseStats();
    return NextResponse.json({
      success: true,
      stats,
      import: importResult,
      message: importResult
        ? `${importResult.imported} présences importées.`
        : "Post-setup terminé (pas d'import : URL GAS absente).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Post-setup échoué";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
