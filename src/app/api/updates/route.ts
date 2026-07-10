import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getLastModified } from "@/lib/permissions";
import { getInitialData } from "@/lib/initial-data";
import type { AppMode } from "@/lib/types";

export async function GET(req: Request) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const url = new URL(req.url);
  const clientTs = url.searchParams.get("since");
  const mode = (url.searchParams.get("mode") ?? "production") as AppMode;
  const includeArchived = url.searchParams.get("archived") === "true";
  const serverTs = await getLastModified();

  if (!clientTs || Number(serverTs) > Number(clientTs)) {
    const data = await getInitialData(authResult.session!.user!.email!, mode, includeArchived);
    if ("error" in data) {
      return NextResponse.json({ error: data.error }, { status: 403 });
    }
    return NextResponse.json({ hasChanges: true, lastModified: serverTs, newData: data });
  }

  return NextResponse.json({ hasChanges: false, lastModified: serverTs });
}
