import { timingSafeEqual } from "crypto";

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isDemoLoginConfigured(): boolean {
  return Boolean(process.env.DEMO_USERNAME && process.env.DEMO_PASSWORD);
}
