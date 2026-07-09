import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const nom = req.nextUrl.searchParams.get("nom")?.trim();
  const prenom = req.nextUrl.searchParams.get("prenom")?.trim();
  const matricule = req.nextUrl.searchParams.get("matricule")?.trim();
  const excludeId = req.nextUrl.searchParams.get("excludeId");

  if (!nom && !prenom && !matricule) {
    return NextResponse.json({ duplicates: [] });
  }

  const or: { nom?: { equals: string; mode: "insensitive" }; prenom?: { equals: string; mode: "insensitive" }; matricule?: string }[] = [];
  if (nom && prenom) {
    or.push({ nom: { equals: nom, mode: "insensitive" }, prenom: { equals: prenom, mode: "insensitive" } });
  }
  if (matricule) or.push({ matricule });

  const matches = await prisma.personnel.findMany({
    where: {
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: or.length ? or : undefined,
    },
    take: 5,
  });

  return NextResponse.json({
    duplicates: matches.map((m) => ({ id: m.id, nom: m.nom, prenom: m.prenom, matricule: m.matricule, role: m.role })),
  });
}
