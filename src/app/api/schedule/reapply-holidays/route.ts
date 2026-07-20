import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { reapplyHolidaysForAllPersonnel } from "@/lib/schedule-generator";
import { touchLastModified } from "@/lib/permissions";

export async function POST() {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const result = await reapplyHolidaysForAllPersonnel();
  await touchLastModified();
  return NextResponse.json({ success: true, ...result });
}
