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
