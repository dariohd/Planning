import { NextRequest, NextResponse } from "next/server";
import { checkAdminRateLimit } from "@/lib/admin-rate-limit";
import { requireSession } from "@/lib/api-auth";
import { deleteAllData } from "@/lib/data-snapshot";

export async function DELETE(req: NextRequest) {
  const limited = checkAdminRateLimit(req, "admin-data-delete", 5);
  if (limited) return limited;

  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "SUPPRIMER") {
    return NextResponse.json(
      { error: "Confirmation requise. Envoyez { confirm: \"SUPPRIMER\" }." },
      { status: 400 }
    );
  }

  const email = authResult.session!.user!.email!;
  await deleteAllData([email]);

  return NextResponse.json({ success: true, message: "Toutes les données ont été supprimées." });
}
