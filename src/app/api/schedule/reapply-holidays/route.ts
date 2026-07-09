import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { reapplyHolidaysForAllPersonnel } from "@/lib/schedule-generator";
import { touchLastModified } from "@/lib/permissions";

export async function POST() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const result = await reapplyHolidaysForAllPersonnel();
  await touchLastModified();
  return NextResponse.json({ success: true, ...result });
}
