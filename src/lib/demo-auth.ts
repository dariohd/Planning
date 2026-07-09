import { timingSafeEqual } from "crypto";

/** Strip BOM / whitespace from env values (Vercel CLI can inject a UTF-8 BOM). */
export function envValue(key: string): string | undefined {
  const raw = process.env[key];
  if (!raw) return undefined;
  return raw.replace(/^\uFEFF/, "").trim();
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isDemoLoginConfigured(): boolean {
  return Boolean(envValue("DEMO_USERNAME") && envValue("DEMO_PASSWORD"));
}
