import crypto from "crypto";

/**
 * Squarespace: Expected signature = HMAC-SHA256(hexToBytes(secret), raw body UTF-8).
 * Compare timing-safe to Squarespace-Signature header (hex).
 */
export function verifySquarespaceSignature(
  rawBody: string,
  secretHex: string,
  headerSignature: string | null
): boolean {
  if (!headerSignature) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secretHex.trim(), "hex");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(rawBody, "utf8")
    .digest("hex");

  const hdr = headerSignature.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(hdr) || hdr.length !== expected.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hdr, "hex"));
  } catch {
    return false;
  }
}
