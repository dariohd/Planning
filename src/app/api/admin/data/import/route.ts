import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { importDataSnapshot, parseSnapshotJson } from "@/lib/data-snapshot";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let snapshot;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
      }
      const text = await file.text();
      snapshot = parseSnapshotJson(text);
    } else {
      const body = await req.json();
      snapshot = body.data ? parseSnapshotJson(JSON.stringify(body.data)) : parseSnapshotJson(JSON.stringify(body));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fichier invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const merge = req.nextUrl.searchParams.get("merge") === "true";
  const email = authResult.session!.user!.email!;

  try {
    const result = await importDataSnapshot(snapshot, {
      merge,
      preserveUsers: [email],
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
