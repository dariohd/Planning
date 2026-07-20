import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { exportDataSnapshot, snapshotToJson } from "@/lib/data-snapshot";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const snapshot = await exportDataSnapshot();
  const json = snapshotToJson(snapshot);
  const filename = `planning-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
