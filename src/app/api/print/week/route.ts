import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { filterPersonnelByMode, toPersonnelRecord } from "@/lib/personnel";
import { getPresencesForRange } from "@/lib/presences";
import { buildPrintableHtml, schedulesFromWeekly } from "@/lib/print";
import { buildWeeklySchedule } from "@/lib/team";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const selection = req.nextUrl.searchParams.get("selection") ?? "Tous";
  const weekStart = req.nextUrl.searchParams.get("weekStart");
  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;
  const lang = (req.nextUrl.searchParams.get("lang") ?? "fr") as "fr" | "en" | "pt";

  const shiftFilter = req.nextUrl.searchParams.get("shiftFilter") ?? "Tous";

  if (!weekStart) {
    return NextResponse.json({ error: "weekStart requis" }, { status: 400 });
  }

  const rows = await prisma.personnel.findMany();
  const allPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const endDate = new Date(`${weekStart}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);

  const presencesByPerson = await getPresencesForRange(
    allPersonnel.map((p) => p.id),
    weekStart,
    endDate.toISOString().slice(0, 10)
  );

  const weekly = buildWeeklySchedule(selection, weekStart, allPersonnel, presencesByPerson, shiftFilter);
  const html = buildPrintableHtml(schedulesFromWeekly(weekly, selection), lang);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
