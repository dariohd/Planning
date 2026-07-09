import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { importPresencesFromGas, type GasPresenceRow } from "@/lib/import-presences";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const yearFilter = req.nextUrl.searchParams.get("year") ?? undefined;
  let rows: GasPresenceRow[];

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Fichier JSON requis." }, { status: 400 });
      }
      rows = JSON.parse(await file.text()) as GasPresenceRow[];
    } else {
      const body = await req.json();
      rows = (Array.isArray(body) ? body : body.rows ?? body.data) as GasPresenceRow[];
    }
  } catch {
    return NextResponse.json({ error: "Format JSON invalide (export GAS attendu)." }, { status: 400 });
  }

  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Le fichier doit contenir un tableau JSON." }, { status: 400 });
  }

  try {
    const result = await importPresencesFromGas(rows, { yearFilter });
    return NextResponse.json({
      success: true,
      ...result,
      message: `${result.imported} présences importées${result.skipped ? `, ${result.skipped} ignorées` : ""}.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import échoué";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
