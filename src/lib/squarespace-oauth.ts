/** Squarespace OAuth 2.0 (Commerce + webhooks). Docs: https://developers.squarespace.com/oauth */

const AUTHORIZE_URL =
  "https://login.squarespace.com/api/1/login/oauth/provider/authorize";
const TOKEN_URL =
  "https://login.squarespace.com/api/1/login/oauth/provider/tokens";

export const SQUARESPACE_OAUTH_SCOPES =
  "website.orders.read,website.orders";

export type SquarespaceTokenResponse = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date | null;
};

function parseTokenPayload(data: Record<string, unknown>): SquarespaceTokenResponse {
  const accessToken = String(
    data.access_token ?? data.token ?? ""
  ).trim();
  const refreshToken = String(data.refresh_token ?? "").trim();
  if (!accessToken || !refreshToken) {
    throw new Error("Squarespace token response missing access or refresh token");
  }

  let accessExpiresAt: Date | null = null;
  const rawExp = data.access_token_expires_at;
  if (typeof rawExp === "string" || typeof rawExp === "number") {
    const sec = typeof rawExp === "string" ? parseFloat(rawExp) : rawExp;
    if (!Number.isNaN(sec)) {
      const ms = sec > 1e12 ? sec : sec * 1000;
      accessExpiresAt = new Date(ms);
    }
  }

  return { accessToken, refreshToken, accessExpiresAt };
}

export function buildSquarespaceAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set(
    "scope",
    params.scope ?? SQUARESPACE_OAUTH_SCOPES
  );
  u.searchParams.set("state", params.state);
  u.searchParams.set("access_type", "offline");
  return u.toString();
}

export async function exchangeSquarespaceAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<SquarespaceTokenResponse> {
  const basic = Buffer.from(
    `${params.clientId}:${params.clientSecret}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      "User-Agent": "PorcelainVend/1.0 (squarespace-oauth)",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Squarespace token response not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Squarespace token exchange ${res.status}: ${text.slice(0, 400)}`
    );
  }
  return parseTokenPayload(data);
}

export async function refreshSquarespaceAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<SquarespaceTokenResponse> {
  const basic = Buffer.from(
    `${params.clientId}:${params.clientSecret}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      "User-Agent": "PorcelainVend/1.0 (squarespace-oauth)",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
    }),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Squarespace refresh response not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Squarespace token refresh ${res.status}: ${text.slice(0, 400)}`
    );
  }
  return parseTokenPayload(data);
}

export function getSquarespaceOAuthRedirectUri(publicBaseUrl: string): string {
  const fromEnv = process.env.SQUARESPACE_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `${publicBaseUrl.replace(/\/$/, "")}/api/squarespace/oauth/callback`;
}

export function isSquarespaceOAuthConfigured(): boolean {
  return Boolean(
    process.env.SQUARESPACE_OAUTH_CLIENT_ID?.trim() &&
      process.env.SQUARESPACE_OAUTH_CLIENT_SECRET?.trim()
  );
}
