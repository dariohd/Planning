import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getIndicatorsData } from "@/lib/indicators";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const selection = req.nextUrl.searchParams.get("selection") ?? "Tous";

  const data = await getIndicatorsData(mode, date, selection);
  return NextResponse.json(data);
}
