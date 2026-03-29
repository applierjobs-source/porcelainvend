/**
 * NextAuth and `new URL()` require an absolute URL with a scheme.
 * Deploy configs often set only the hostname (e.g. app.up.railway.app).
 */
export function normalizeSiteBaseUrl(
  raw: string | undefined | null
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

/** Mutates process.env so NextAuth and server code see valid URLs. */
export function applySiteUrlEnvDefaults(): void {
  for (const key of ["AUTH_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    const v = process.env[key];
    const n = normalizeSiteBaseUrl(v);
    if (n) process.env[key] = n;
  }
}
