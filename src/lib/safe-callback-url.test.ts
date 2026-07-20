import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./safe-callback-url";

describe("safeCallbackUrl", () => {
  it("keeps relative in-app paths", () => {
    expect(safeCallbackUrl("/desktop")).toBe("/desktop");
    expect(safeCallbackUrl("/mobile?tab=equipe")).toBe("/mobile?tab=equipe");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeCallbackUrl("https://evil.example/phish")).toBe("/desktop");
    expect(safeCallbackUrl("//evil.example")).toBe("/desktop");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/desktop");
  });

  it("rejects login/auth loops and empty values", () => {
    expect(safeCallbackUrl("/login")).toBe("/desktop");
    expect(safeCallbackUrl("/api/auth/signin")).toBe("/desktop");
    expect(safeCallbackUrl("")).toBe("/desktop");
    expect(safeCallbackUrl(null)).toBe("/desktop");
  });

  it("rejects backslash escape attempts", () => {
    expect(safeCallbackUrl("/\\evil.example")).toBe("/desktop");
    expect(safeCallbackUrl("/%5cevil.example")).toBe("/desktop");
  });
});
