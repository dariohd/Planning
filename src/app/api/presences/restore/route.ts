import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { setPresenceFull } from "@/lib/presences";

const schema = z.object({
  batch: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        s: z.string(),
        c: z.string().optional().nullable(),
        hs: z.string().optional().nullable(),
        loc: z.string().optional().nullable(),
      })
    )
  ),
});

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = schema.parse(await req.json());
  const email = authResult.session!.user!.email!;

  for (const personnelId of Object.keys(body.batch)) {
    await ensureModificationAllowed(email, personnelId);
    for (const [date, val] of Object.entries(body.batch[personnelId])) {
      if (!val.s) {
        await prisma.presence.deleteMany({ where: { personnelId, date } });
      } else {
        await setPresenceFull(personnelId, date, {
          status: val.s,
          comment: val.c ?? undefined,
          hs: val.hs ?? undefined,
          location: val.loc ?? undefined,
        });
      }
    }
  }

  await touchLastModified();
  return NextResponse.json({ success: true });
}
