import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { importCapaCsv, importPersonnelCsv, importPresencesCsv } from "@/lib/data-csv";
import { touchLastModified } from "@/lib/permissions";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const form = await req.formData();
  const type = String(form.get("type") ?? "personnel");
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Fichier CSV requis." }, { status: 400 });
  }

  const content = await file.text();

  try {
    let count = 0;
    if (type === "personnel") count = await importPersonnelCsv(content);
    else if (type === "presences") count = await importPresencesCsv(content);
    else if (type === "capa") count = await importCapaCsv(content);
    else return NextResponse.json({ error: "Type invalide (personnel, presences, capa)." }, { status: 400 });

    await touchLastModified();
    return NextResponse.json({ success: true, count, type });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import CSV échoué";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
