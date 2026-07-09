import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getCapaDashboardData } from "@/lib/capa";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const weekStart = req.nextUrl.searchParams.get("weekStart") ?? undefined;

  const data = await getCapaDashboardData(mode, year, weekStart);
  return NextResponse.json(data);
}
