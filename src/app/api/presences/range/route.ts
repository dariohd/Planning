import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, assertDateRange } from "@/lib/api-errors";
import { requireSession } from "@/lib/api-auth";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { setPresence } from "@/lib/presences";
import { z } from "zod";

const schema = z.object({
  personnelId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  location: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSession();
    if ("error" in authResult && authResult.error) return authResult.error;

    const body = schema.parse(await req.json());
    assertDateRange(body.startDate, body.endDate);
    await ensureModificationAllowed(authResult.session!.user!.email!, body.personnelId);

    const start = new Date(`${body.startDate}T12:00:00Z`);
    const end = new Date(`${body.endDate}T12:00:00Z`);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dk = cursor.toISOString().slice(0, 10);
      await setPresence(body.personnelId, dk, body.status, body.location ?? null);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    await touchLastModified();
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
