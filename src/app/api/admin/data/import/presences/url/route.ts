import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getAppConfig } from "@/lib/app-config";
import { importPresencesFromGasUrl } from "@/lib/import-presences";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const config = await getAppConfig();
  const webAppUrl = (body.webAppUrl as string) || config.sheetsWebAppUrl;
  const yearFilter = (body.year as string) ?? req.nextUrl.searchParams.get("year") ?? undefined;

  if (!webAppUrl?.trim()) {
    return NextResponse.json(
      { error: "Renseignez l'URL de synchronisation Google Sheets dans Paramètres > Données." },
      { status: 400 }
    );
  }

  try {
    const result = await importPresencesFromGasUrl(webAppUrl, { yearFilter });
    return NextResponse.json({
      success: true,
      ...result,
      message: `${result.imported} présences importées depuis Google Sheets.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import depuis Sheets échoué";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
