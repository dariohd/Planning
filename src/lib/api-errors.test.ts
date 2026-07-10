import { describe, expect, it } from "vitest";
import { assertDateRange } from "./api-errors";

describe("assertDateRange", () => {
  it("accepts valid range", () => {
    expect(() => assertDateRange("2026-01-01", "2026-01-07")).not.toThrow();
  });

  it("rejects inverted range", () => {
    expect(() => assertDateRange("2026-02-01", "2026-01-01")).toThrow(/fin/);
  });

  it("rejects too long range", () => {
    expect(() => assertDateRange("2026-01-01", "2027-06-01")).toThrow(/longue/);
  });
});
