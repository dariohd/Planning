import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { saveCapaReel } from "@/lib/capa";
import { touchLastModified } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  year: z.number(),
  week: z.number().min(1).max(53),
  poste: z.string(),
  value: z.number().nullable(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (!["Administrateur", "REAP", "RP"].includes(authResult.session!.user!.role ?? "")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  await saveCapaReel(body.year, body.week, body.poste, body.value);
  await touchLastModified();
  return NextResponse.json({ success: true });
}
