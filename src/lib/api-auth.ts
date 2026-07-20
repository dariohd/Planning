import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  if (session.user.role === "Non Autorisé") {
    return { error: NextResponse.json({ error: "Accès refusé. Contactez un administrateur." }, { status: 403 }) };
  }
  return { session };
}

export async function requireAdmin() {
  const result = await requireSession();
  if ("error" in result && result.error) return result;
  if (result.session!.user!.role !== "Administrateur") {
    return { error: NextResponse.json({ error: "Administrateur requis." }, { status: 403 }) };
  }
  return result;
}
