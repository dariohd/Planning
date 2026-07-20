/**
 * Prevent open redirects after login: only same-origin relative paths are allowed.
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/desktop"): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value) return fallback;

  // Absolute URLs and protocol-relative URLs are rejected.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith("//")) {
    return fallback;
  }

  // Must be an in-app path.
  if (!value.startsWith("/")) return fallback;

  // Block backslash tricks and encoded separators that can escape the origin.
  if (value.includes("\\") || value.includes("%5c") || value.includes("%5C")) {
    return fallback;
  }

  // Disallow nested auth loops.
  if (value.startsWith("/login") || value.startsWith("/api/auth")) {
    return fallback;
  }

  return value;
}
