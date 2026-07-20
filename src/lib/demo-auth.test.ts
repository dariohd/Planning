import { describe, expect, it } from "vitest";
import { parseDemoExtraAccounts } from "./demo-auth";

describe("parseDemoExtraAccounts", () => {
  it("parses username:password:role entries", () => {
    expect(parseDemoExtraAccounts("lecteur:secret:Lecteur|denied:x:Non Autorisé")).toEqual([
      { username: "lecteur", password: "secret", role: "Lecteur" },
      { username: "denied", password: "x", role: "Non Autorisé" },
    ]);
  });

  it("ignores malformed entries", () => {
    expect(parseDemoExtraAccounts("bad|ok:pass:Lecteur")).toEqual([
      { username: "ok", password: "pass", role: "Lecteur" },
    ]);
  });

  it("returns empty for blank input", () => {
    expect(parseDemoExtraAccounts(undefined)).toEqual([]);
    expect(parseDemoExtraAccounts("")).toEqual([]);
  });
});
