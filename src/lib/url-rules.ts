import { z } from "zod";

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "Must use HTTPS");

function normalizeHost(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

export function assertSelectionOnStore(
  storeUrlRaw: string,
  selectionUrlRaw: string
): void {
  const storeUrl = httpsUrl.parse(storeUrlRaw);
  const selectionUrl = httpsUrl.parse(selectionUrlRaw);
  const a = new URL(storeUrl);
  const b = new URL(selectionUrl);
  if (normalizeHost(a.hostname) !== normalizeHost(b.hostname)) {
    throw new Error(
      "Selection page must be on the same domain as the store URL"
    );
  }
}

export { httpsUrl };

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, hyphens");
