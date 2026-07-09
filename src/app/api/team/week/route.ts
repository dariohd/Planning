import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { filterPersonnelByMode, toPersonnelRecord } from "@/lib/personnel";
import { getPresencesForRange } from "@/lib/presences";
import { buildWeeklySchedule } from "@/lib/team";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const selection = req.nextUrl.searchParams.get("selection") ?? "Tous";
  const weekStart = req.nextUrl.searchParams.get("weekStart");
  const shiftFilter = req.nextUrl.searchParams.get("shiftFilter");
  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;

  if (!weekStart) {
    return NextResponse.json({ error: "weekStart requis (YYYY-MM-DD)" }, { status: 400 });
  }

  const rows = await prisma.personnel.findMany();
  const allPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const endDate = new Date(`${weekStart}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const endIso = endDate.toISOString().slice(0, 10);

  const memberIds = allPersonnel.map((p) => p.id);
  const presencesByPerson = await getPresencesForRange(memberIds, weekStart, endIso);

  const result = buildWeeklySchedule(
    selection,
    weekStart,
    allPersonnel,
    presencesByPerson,
    shiftFilter && shiftFilter !== "Tous" ? shiftFilter : null
  );

  return NextResponse.json(result);
}
