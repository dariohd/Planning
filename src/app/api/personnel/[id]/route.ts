import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ensureModificationAllowed, touchLastModified } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const { id } = await params;
  const body = await req.json();

  if (body.action === "archive") {
    if (authResult.session!.user!.role !== "Administrateur") {
      return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
    }
    await prisma.personnel.update({ where: { id }, data: { statut: "Archivé" } });
    await touchLastModified();
    return NextResponse.json({ success: true });
  }

  if (body.action === "reactivate") {
    if (authResult.session!.user!.role !== "Administrateur") {
      return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
    }
    await prisma.personnel.update({ where: { id }, data: { statut: "Actif" } });
    await touchLastModified();
    return NextResponse.json({ success: true });
  }

  if (body.action) {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  await ensureModificationAllowed(authResult.session!.user!.email!, id);
  const updated = await prisma.personnel.update({
    where: { id },
    data: body,
  });
  await touchLastModified();
  return NextResponse.json(updated);
}
