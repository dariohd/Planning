import { describe, expect, it } from "vitest";
import { mapTeamSelectionForApi, parseSectorsConfigText } from "./sectors";

describe("parseSectorsConfigText", () => {
  it("parses line format", () => {
    const sectors = parseSectorsConfigText("Atelier : reap-a, reap-b\nBureau : reap-c");
    expect(sectors).toHaveLength(2);
    expect(sectors[0]).toEqual({ id: "sector-1", label: "Atelier", reapIds: ["reap-a", "reap-b"] });
  });

  it("parses JSON array", () => {
    const sectors = parseSectorsConfigText('[{"id":"s1","label":"S1","reapIds":["x"]}]');
    expect(sectors[0]?.reapIds).toEqual(["x"]);
  });
});

describe("mapTeamSelectionForApi", () => {
  it("maps sector label to API token", () => {
    const sectors = [{ id: "atelier", label: "Atelier", reapIds: ["r1", "r2"] }];
    expect(mapTeamSelectionForApi("Secteur — Atelier", sectors)).toBe("__SECTOR__:atelier");
    expect(mapTeamSelectionForApi("all", sectors)).toBe("all");
  });
});
