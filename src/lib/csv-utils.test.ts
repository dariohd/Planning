import { describe, expect, it } from "vitest";
import { escapeCsvCell, parseCsv, parseCsvLine, toCsv } from "./csv-utils";

describe("csv-utils", () => {
  it("parseCsvLine gère les guillemets", () => {
    expect(parseCsvLine('"Dupont";"Jean, Paul"')).toEqual(["Dupont", "Jean, Paul"]);
  });

  it("toCsv et parseCsv sont réversibles", () => {
    const csv = toCsv(["a", "b"], [["1", "2"], ["3", "4"]]);
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("escapeCsvCell échappe le séparateur", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
  });
});
