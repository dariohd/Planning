import { describe, expect, it } from "vitest";
import { DATA_SNAPSHOT_VERSION, parseSnapshotJson } from "./data-snapshot";

describe("data-snapshot", () => {
  it("parseSnapshotJson valide la version", () => {
    const raw = JSON.stringify({
      version: DATA_SNAPSHOT_VERSION,
      exportedAt: "2026-01-01",
      personnel: [],
      presences: [],
      users: [],
      capaReel: [],
      appMeta: [],
      config: {},
    });
    const snap = parseSnapshotJson(raw);
    expect(snap.version).toBe(1);
    expect(snap.personnel).toEqual([]);
  });

  it("parseSnapshotJson rejette sans version", () => {
    expect(() => parseSnapshotJson("{}")).toThrow();
  });
});
