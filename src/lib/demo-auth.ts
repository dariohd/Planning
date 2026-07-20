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

/** Format: user:pass:Role|user2:pass2:Role (roles may contain spaces). */
export type DemoExtraAccount = { username: string; password: string; role: string };

export function parseDemoExtraAccounts(raw = envValue("DEMO_EXTRA_ACCOUNTS")): DemoExtraAccount[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const first = part.indexOf(":");
      const second = part.indexOf(":", first + 1);
      if (first < 0 || second < 0) return null;
      const username = part.slice(0, first).trim();
      const password = part.slice(first + 1, second);
      const role = part.slice(second + 1).trim();
      if (!username || !password || !role) return null;
      return { username, password, role };
    })
    .filter((a): a is DemoExtraAccount => Boolean(a));
}
