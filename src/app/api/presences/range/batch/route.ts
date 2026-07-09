import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { setPresence } from "@/lib/presences";
import { z } from "zod";

const schema = z.object({
  personnelIds: z.array(z.string()).min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  location: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = schema.parse(await req.json());
  const email = authResult.session!.user!.email!;

  for (const personnelId of body.personnelIds) {
    await ensureModificationAllowed(email, personnelId);
  }

  const start = new Date(`${body.startDate}T12:00:00Z`);
  const end = new Date(`${body.endDate}T12:00:00Z`);
  const cursor = new Date(start);

  while (cursor <= end) {
    const dk = cursor.toISOString().slice(0, 10);
    for (const personnelId of body.personnelIds) {
      await setPresence(personnelId, dk, body.status, body.location ?? null);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  await touchLastModified();
  return NextResponse.json({ success: true, count: body.personnelIds.length });
}
