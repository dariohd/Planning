import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/api-auth";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { getPresencesForYear, setPresence } from "@/lib/presences";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireSession();
    if ("error" in authResult && authResult.error) return authResult.error;

    const personnelId = req.nextUrl.searchParams.get("personnelId");
    const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());

    if (!personnelId) {
      return NextResponse.json({ error: "personnelId requis" }, { status: 400 });
    }

    const presences = await getPresencesForYear(personnelId, year);
    return NextResponse.json(presences);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const setSchema = z.object({
  personnelId: z.string(),
  date: z.string(),
  status: z.string(),
  loc: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSession();
    if ("error" in authResult && authResult.error) return authResult.error;

    const body = setSchema.parse(await req.json());
    const email = authResult.session!.user!.email!;

    await ensureModificationAllowed(email, body.personnelId);
    await setPresence(body.personnelId, body.date, body.status, body.loc ?? null);
    await touchLastModified();

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
