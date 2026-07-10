import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function assertDateRange(startDate: string, endDate: string, maxDays = 366): void {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Dates invalides.");
  }
  if (end < start) {
    throw new Error("La date de fin doit être après la date de début.");
  }
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > maxDays) {
    throw new Error(`Plage trop longue (maximum ${maxDays} jours).`);
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  if (error instanceof Error) {
    if (error.message.startsWith("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message.includes("introuvable")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error.message.startsWith("Dates invalides") ||
      error.message.startsWith("La date de fin") ||
      error.message.startsWith("Plage trop longue")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
