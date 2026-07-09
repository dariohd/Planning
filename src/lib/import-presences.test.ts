import { describe, expect, it } from "vitest";
import { expandGasRow, parseGasDay, resolvePersonnelIdFromRow } from "./import-presences";

describe("import-presences", () => {
  it("parseGasDay accepte string et objet", () => {
    expect(parseGasDay("M")).toEqual({ status: "M" });
    expect(parseGasDay({ s: "CP", c: "note", hs: "2", loc: "DRA" })).toEqual({
      status: "CP",
      comment: "note",
      hs: "2",
      location: "DRA",
    });
  });

  it("expandGasRow depuis months compact", () => {
    const rows = expandGasRow({
      personnelId: "p1",
      year: 2026,
      months: { "1": { "6": "M", "7": { s: "CP", c: "test" } } },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: "2026-01-06", status: "M" });
    expect(rows[1]).toMatchObject({ date: "2026-01-07", status: "CP", comment: "test" });
  });

  it("expandGasRow depuis presences par date", () => {
    const rows = expandGasRow({
      matricule: "Z1",
      year: 2026,
      presences: { "2026-03-15": { s: "A" } },
    });
    expect(rows[0]).toMatchObject({ personnelKey: "Z1", date: "2026-03-15", status: "A" });
  });

  it("resolvePersonnelIdFromRow par matricule", () => {
    const byId = new Map([["id1", "id1"]]);
    const byMatricule = new Map([["Z1", "id1"]]);
    const byName = new Map<string, string>();
    const id = resolvePersonnelIdFromRow(
      "Z1",
      { year: 2026, matricule: "Z1" },
      byId,
      byMatricule,
      byName
    );
    expect(id).toBe("id1");
  });
});
