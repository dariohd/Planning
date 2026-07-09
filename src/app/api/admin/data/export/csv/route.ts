import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { exportCapaCsv, exportPersonnelCsv, exportPresencesCsv } from "@/lib/data-csv";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "personnel";
  const year = req.nextUrl.searchParams.get("year");
  const yearNum = year ? Number(year) : undefined;
  const date = new Date().toISOString().slice(0, 10);

  let csv: string;
  let filename: string;

  switch (type) {
    case "presences":
      csv = await exportPresencesCsv(yearNum);
      filename = `presences-${yearNum ?? "tout"}-${date}.csv`;
      break;
    case "capa":
      csv = await exportCapaCsv(yearNum);
      filename = `capa-${yearNum ?? new Date().getFullYear()}-${date}.csv`;
      break;
    case "personnel":
    default:
      csv = await exportPersonnelCsv();
      filename = `personnel-${date}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
