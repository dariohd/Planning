import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession } from "@/lib/api-auth";
import { getAppConfig, saveAppConfig } from "@/lib/app-config";

export async function GET() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const config = await getAppConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = await req.json();
  const merged = await saveAppConfig(body);
  return NextResponse.json({ success: true, ...merged });
}
