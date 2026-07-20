import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toPersonnelRecord } from "@/lib/personnel";

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult && authResult.error) return authResult.error;

  const rolesParam = req.nextUrl.searchParams.get("roles");
  const roles = rolesParam ? rolesParam.split(",").map((r) => r.trim()).filter(Boolean) : null;

  const rows = await prisma.personnel.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  let personnel = rows.map(toPersonnelRecord);
  if (roles?.length) personnel = personnel.filter((p) => roles.includes(p.role));

  const headers = [
    "id", "nom", "prenom", "matricule", "role", "section", "typeQuart", "quartDefaut",
    "posteDeTravail", "chefEquipeAssocie", "mftAssocie", "responsableHierarchique", "tauxEfficacite", "statut",
  ];
  const lines = [headers.join(";")];
  for (const p of personnel) {
    lines.push(
      [
        p.id, p.nom, p.prenom, p.matricule ?? "", p.role, p.section ?? "", p.typeQuart ?? "",
        p.quartDefaut ?? "", p.posteDeTravail ?? "", p.chefEquipeAssocie ?? "", p.mftAssocie ?? "",
        p.responsableHierarchique ?? "", p.tauxEfficacite, p.statut,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")
    );
  }

  const csv = "\uFEFF" + lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="personnel-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
