import { headers } from "next/headers";
import { normalizeSiteBaseUrl } from "@/lib/normalize-site-url";

/** Resolve the public site URL for webhooks and kiosk links. */
export async function getPublicBaseUrl(): Promise<string> {
  const fromEnv =
    normalizeSiteBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeSiteBaseUrl(process.env.AUTH_URL);
  if (fromEnv) return fromEnv;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
