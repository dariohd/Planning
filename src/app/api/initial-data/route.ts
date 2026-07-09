import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getInitialData } from "@/lib/initial-data";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "true";
  const data = await getInitialData(authResult.session!.user!.email!, mode, includeArchived);
  if ("error" in data) {
    return NextResponse.json(data, { status: 403 });
  }
  return NextResponse.json(data);
}
