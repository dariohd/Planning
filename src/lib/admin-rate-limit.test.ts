import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAdminRateLimit, resetAdminRateLimitsForTests } from "./admin-rate-limit";

function fakeRequest(ip = "203.0.113.1") {
  return new NextRequest("http://localhost/api/admin/seed", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkAdminRateLimit", () => {
  beforeEach(() => resetAdminRateLimitsForTests());

  it("autorise les requêtes sous le seuil", () => {
    const req = fakeRequest();
    expect(checkAdminRateLimit(req, "test", 3)).toBeNull();
    expect(checkAdminRateLimit(req, "test", 3)).toBeNull();
    expect(checkAdminRateLimit(req, "test", 3)).toBeNull();
  });

  it("bloque au-delà du seuil", () => {
    const req = fakeRequest();
    for (let i = 0; i < 3; i++) expect(checkAdminRateLimit(req, "test", 3)).toBeNull();
    const blocked = checkAdminRateLimit(req, "test", 3);
    expect(blocked?.status).toBe(429);
  });

  it("isole par adresse IP", () => {
    const a = fakeRequest("1.1.1.1");
    const b = fakeRequest("2.2.2.2");
    for (let i = 0; i < 3; i++) expect(checkAdminRateLimit(a, "test", 3)).toBeNull();
    expect(checkAdminRateLimit(b, "test", 3)).toBeNull();
  });
});
