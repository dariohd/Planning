import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getLastModified, touchLastModified } from "@/lib/permissions";
import { generateYearlySchedules } from "@/lib/schedule-generator";

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const year = Number(body.year ?? new Date().getFullYear());

  const result = await generateYearlySchedules(year);
  await touchLastModified();

  return NextResponse.json({ success: true, year, ...result });
}

export async function GET() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const lastModified = await getLastModified();
  return NextResponse.json({ lastModified });
}
