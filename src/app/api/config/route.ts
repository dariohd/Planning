import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getAppConfig, saveAppConfig } from "@/lib/app-config";

export async function GET() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const config = await getAppConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json();
  const merged = await saveAppConfig(body);
  return NextResponse.json({ success: true, ...merged });
}
