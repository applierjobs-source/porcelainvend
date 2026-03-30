import type { Machine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import {
  refreshSquarespaceAccessToken,
  isSquarespaceOAuthConfigured,
} from "@/lib/squarespace-oauth";

const SKEW_MS = 90_000;

function getOAuthClientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SQUARESPACE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.SQUARESPACE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Squarespace OAuth is not configured on this server");
  }
  return { clientId, clientSecret };
}

/**
 * Returns a valid Squarespace OAuth access token for the machine, refreshing
 * and persisting tokens when needed.
 */
export async function getValidSquarespaceOAuthAccessToken(
  machineId: string
): Promise<string> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: {
      squarespaceOAuthRefreshTokenEnc: true,
      squarespaceOAuthAccessTokenEnc: true,
      squarespaceOAuthAccessExpiresAt: true,
    },
  });

  if (!machine?.squarespaceOAuthRefreshTokenEnc) {
    throw new Error("This machine is not connected to Squarespace OAuth");
  }

  const now = Date.now();
  const expiresAt = machine.squarespaceOAuthAccessExpiresAt?.getTime();
  if (
    machine.squarespaceOAuthAccessTokenEnc &&
    expiresAt != null &&
    expiresAt > now + SKEW_MS
  ) {
    return decryptSecret(machine.squarespaceOAuthAccessTokenEnc);
  }

  const refreshPlain = decryptSecret(machine.squarespaceOAuthRefreshTokenEnc);
  const { clientId, clientSecret } = getOAuthClientCreds();
  const next = await refreshSquarespaceAccessToken({
    clientId,
    clientSecret,
    refreshToken: refreshPlain,
  });

  await prisma.machine.update({
    where: { id: machineId },
    data: {
      squarespaceOAuthRefreshTokenEnc: encryptSecret(next.refreshToken),
      squarespaceOAuthAccessTokenEnc: encryptSecret(next.accessToken),
      squarespaceOAuthAccessExpiresAt: next.accessExpiresAt,
    },
  });

  return next.accessToken;
}

/**
 * Bearer token for POST /webhook_subscriptions only. Squarespace rejects site
 * Developer API keys here — do not fall back to squarespaceCommerceApiKeyEnc.
 */
export async function resolveSquarespaceWebhookBearerToken(
  machine: Machine
): Promise<string> {
  const envTok = process.env.SQUARESPACE_WEBHOOK_ACCESS_TOKEN?.trim();
  if (envTok) return envTok;

  if (
    isSquarespaceOAuthConfigured() &&
    machine.squarespaceOAuthRefreshTokenEnc
  ) {
    return getValidSquarespaceOAuthAccessToken(machine.id);
  }

  throw new Error(
    "Webhook registration needs an OAuth access token (Connect Squarespace or set SQUARESPACE_WEBHOOK_ACCESS_TOKEN). Your Commerce Developer API key cannot call the webhook API."
  );
}

/** True if this server can call Squarespace to create a webhook for this machine. */
export function canProvisionSquarespaceWebhookViaApi(
  machine: Pick<Machine, "squarespaceOAuthRefreshTokenEnc">
): boolean {
  if (process.env.SQUARESPACE_WEBHOOK_ACCESS_TOKEN?.trim()) return true;
  return Boolean(machine.squarespaceOAuthRefreshTokenEnc);
}
