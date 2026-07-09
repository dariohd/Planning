import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { filterPersonnelByMode, toPersonnelRecord } from "@/lib/personnel";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";
import { populateInitialScheduleForPerson } from "@/lib/schedule-generator";
import type { AppMode } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const personnelSchema = z.object({
  id: z.string().optional(),
  matricule: z.string().optional().nullable(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  role: z.string().min(1),
  chefEquipeAssocie: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  typeQuart: z.string().optional().nullable(),
  quartDefaut: z.string().optional().nullable(),
  posteDeTravail: z.string().optional().nullable(),
  mftAssocie: z.string().optional().nullable(),
  responsableHierarchique: z.string().optional().nullable(),
  tauxEfficacite: z.number().optional(),
  startDate: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const includeArchived = req.nextUrl.searchParams.get("archived") === "true";
  const mode = (req.nextUrl.searchParams.get("mode") ?? "production") as AppMode;

  const rows = await prisma.personnel.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  let personnel = rows.map(toPersonnelRecord);
  if (!includeArchived) personnel = personnel.filter((p) => p.statut !== "Archivé");
  personnel = filterPersonnelByMode(personnel, mode);

  return NextResponse.json(personnel);
}

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = personnelSchema.parse(await req.json());
  const email = authResult.session!.user!.email!;

  if (body.id) {
    await ensureModificationAllowed(email, body.id);
    const updated = await prisma.personnel.update({
      where: { id: body.id },
      data: {
        matricule: body.matricule ?? null,
        nom: body.nom,
        prenom: body.prenom,
        role: body.role,
        chefEquipeAssocie: body.chefEquipeAssocie ?? null,
        section: body.section ?? null,
        typeQuart: body.typeQuart ?? null,
        quartDefaut: body.quartDefaut ?? null,
        posteDeTravail: body.posteDeTravail ?? null,
        mftAssocie: body.mftAssocie ?? null,
        responsableHierarchique: body.responsableHierarchique ?? null,
        tauxEfficacite: body.tauxEfficacite ?? 100,
      },
    });
    await touchLastModified();
    return NextResponse.json(toPersonnelRecord(updated));
  }

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Seul un administrateur peut créer du personnel." }, { status: 403 });
  }

  const id = uuidv4();
  const created = await prisma.personnel.create({
    data: {
      id,
      matricule: body.matricule ?? null,
      nom: body.nom,
      prenom: body.prenom,
      role: body.role,
      chefEquipeAssocie: body.chefEquipeAssocie ?? null,
      section: body.section ?? null,
      typeQuart: body.typeQuart ?? null,
      quartDefaut: body.quartDefaut ?? null,
      posteDeTravail: body.posteDeTravail ?? null,
      mftAssocie: body.mftAssocie ?? null,
      responsableHierarchique: body.responsableHierarchique ?? null,
      tauxEfficacite: body.tauxEfficacite ?? 100,
    },
  });

  if (body.typeQuart && body.quartDefaut) {
    await populateInitialScheduleForPerson(created, body.startDate ?? undefined);
  }

  await touchLastModified();
  return NextResponse.json(toPersonnelRecord(created), { status: 201 });
}
