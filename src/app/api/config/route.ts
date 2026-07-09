import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const config = await prisma.appConfig.findUnique({ where: { id: "default" } });
  const data = (config?.data as Record<string, unknown>) ?? {};

  return NextResponse.json({
    appName: data.appName ?? "Planning Présence",
    manualTargets: data.manualTargets ?? {},
    missions: data.missions ?? ["Mi"],
    holidayCountry: data.holidayCountry ?? "FR",
  });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = await req.json();
  const existing = await prisma.appConfig.findUnique({ where: { id: "default" } });
  const current = (existing?.data as Record<string, unknown>) ?? {};

  const merged = {
    ...current,
    ...(body.appName !== undefined ? { appName: body.appName } : {}),
    ...(body.manualTargets !== undefined ? { manualTargets: body.manualTargets } : {}),
    ...(body.holidayCountry !== undefined ? { holidayCountry: body.holidayCountry } : {}),
  };

  await prisma.appConfig.upsert({
    where: { id: "default" },
    create: { id: "default", data: merged },
    update: { data: merged },
  });

  return NextResponse.json({ success: true, ...merged });
}
