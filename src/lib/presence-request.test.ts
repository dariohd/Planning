import { describe, expect, it } from "vitest";
import { z } from "zod";

const presenceDetailsSchema = z.object({
  personnelId: z.string(),
  date: z.string(),
  status: z.string(),
  location: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  hs: z.string().optional().nullable(),
});

const personnelCreateSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  role: z.string(),
  matricule: z.string().optional(),
});

describe("presenceDetailsSchema", () => {
  it("accepte une saisie valide", () => {
    const body = presenceDetailsSchema.parse({
      personnelId: "abc-123",
      date: "2026-07-10",
      status: "CP",
    });
    expect(body.status).toBe("CP");
  });

  it("rejette sans personnelId", () => {
    expect(() =>
      presenceDetailsSchema.parse({ date: "2026-07-10", status: "M" })
    ).toThrow();
  });

  it("accepte commentaire et HS optionnels", () => {
    const body = presenceDetailsSchema.parse({
      personnelId: "x",
      date: "2026-01-15",
      status: "Mi",
      comment: "Mission client",
      hs: "2h",
      location: "Site A",
    });
    expect(body.comment).toBe("Mission client");
  });
});

describe("personnelCreateSchema", () => {
  it("exige nom et prénom", () => {
    expect(() => personnelCreateSchema.parse({ role: "REAP" })).toThrow();
    const ok = personnelCreateSchema.parse({ nom: "Dupont", prenom: "Jean", role: "REAP" });
    expect(ok.role).toBe("REAP");
  });
});
