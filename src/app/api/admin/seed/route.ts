import { NextRequest, NextResponse } from "next/server";
import { checkAdminRateLimit } from "@/lib/admin-rate-limit";
import { runSeed } from "@/lib/seed";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = checkAdminRateLimit(req, "admin-seed", 10);
  if (limited) return limited;

  const secret = req.headers.get("x-seed-secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { personnelCount } = await runSeed();
    return NextResponse.json({
      success: true,
      message: `${personnelCount} collaborateurs importés.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur seed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
