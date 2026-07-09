import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { filterPersonnelByMode, toPersonnelRecord } from "@/lib/personnel";
import { getPresencesForRange } from "@/lib/presences";
import { buildMonthlySchedule } from "@/lib/team";
import type { AppMode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const selection = req.nextUrl.searchParams.get("selection") ?? "Tous";
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(req.nextUrl.searchParams.get("month") ?? new Date().getMonth());
  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;
  const shiftFilter = req.nextUrl.searchParams.get("shiftFilter") ?? "Tous";

  const rows = await prisma.personnel.findMany();
  const allPersonnel = filterPersonnelByMode(
    rows.map(toPersonnelRecord).filter((p) => p.statut !== "Archivé"),
    mode
  );

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const presencesByPerson = await getPresencesForRange(
    allPersonnel.map((p) => p.id),
    startDate,
    endDate
  );

  const monthly = buildMonthlySchedule(
    selection,
    year,
    month,
    allPersonnel,
    presencesByPerson,
    shiftFilter === "Tous" ? null : shiftFilter
  );

  return NextResponse.json(monthly);
}
