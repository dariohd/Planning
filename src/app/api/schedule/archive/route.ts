import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { archivePreviousYearSchedules } from "@/lib/schedule-generator";
import { touchLastModified } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const year = Number(body.year ?? new Date().getFullYear() - 1);
  const deleted = await archivePreviousYearSchedules(year);
  await touchLastModified();
  return NextResponse.json({ success: true, year, deleted });
}
