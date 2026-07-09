import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { touchLastModified } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true, name: true },
  });

  return NextResponse.json(users);
}

const patchSchema = z.object({
  email: z.string().email(),
  role: z.string(),
});

const postSchema = z.object({
  email: z.string().email(),
  role: z.string().default("Lecteur"),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = postSchema.parse(await req.json());
  const email = body.email.toLowerCase();
  const created = await prisma.user.upsert({
    where: { email },
    create: { email, role: body.role, name: body.name ?? email.split("@")[0] },
    update: { role: body.role, ...(body.name ? { name: body.name } : {}) },
  });
  await touchLastModified();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  if (authResult.session!.user!.role !== "Administrateur") {
    return NextResponse.json({ error: "Administrateur requis." }, { status: 403 });
  }

  const body = patchSchema.parse(await req.json());
  const updated = await prisma.user.update({
    where: { email: body.email.toLowerCase() },
    data: { role: body.role },
  });

  await touchLastModified();
  return NextResponse.json(updated);
}
