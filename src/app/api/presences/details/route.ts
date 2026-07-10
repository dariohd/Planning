import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/api-auth";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { setPresenceFull } from "@/lib/presences";
import { z } from "zod";

const schema = z.object({
  personnelId: z.string(),
  date: z.string(),
  status: z.string(),
  location: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  hs: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSession();
    if ("error" in authResult && authResult.error) return authResult.error;

    const body = schema.parse(await req.json());
    await ensureModificationAllowed(authResult.session!.user!.email!, body.personnelId);

    await setPresenceFull(body.personnelId, body.date, {
      status: body.status,
      location: body.location,
      comment: body.comment,
      hs: body.hs,
    });
    await touchLastModified();

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
