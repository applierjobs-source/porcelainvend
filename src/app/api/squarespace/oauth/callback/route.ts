import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/encryption";
import {
  exchangeSquarespaceAuthorizationCode,
  getSquarespaceOAuthRedirectUri,
} from "@/lib/squarespace-oauth";
import { getPublicBaseUrl } from "@/lib/public-url";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const COOKIE = "pv_sq_oauth";

export async function GET(req: Request) {
  const session = await auth();
  const baseUrl = await getPublicBaseUrl();

  const redirectWith = (path: string, query?: Record<string, string>) => {
    const u = new URL(path, baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        u.searchParams.set(k, v);
      }
    }
    const res = NextResponse.redirect(u);
    res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  };

  if (!session?.user?.id) {
    return redirectWith("/login");
  }

  const url = new URL(req.url);
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");
  if (err) {
    return redirectWith("/dashboard/machines", {
      squarespace_oauth: "denied",
      detail: errDesc ?? err,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = cookies();
  const rawCookie = jar.get(COOKIE)?.value ?? null;

  if (!code || !state || !rawCookie) {
    return redirectWith("/dashboard/machines", {
      squarespace_oauth: "invalid",
    });
  }

  const colon = rawCookie.indexOf(":");
  if (colon < 1) {
    return redirectWith("/dashboard/machines", {
      squarespace_oauth: "invalid",
    });
  }
  const machineId = rawCookie.slice(0, colon);
  const expectedState = rawCookie.slice(colon + 1);
  if (state !== expectedState) {
    return redirectWith("/dashboard/machines", {
      squarespace_oauth: "state",
    });
  }

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
    select: { id: true },
  });
  if (!machine) {
    const res = NextResponse.redirect(new URL("/dashboard/machines", baseUrl));
    res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  const clientId = process.env.SQUARESPACE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.SQUARESPACE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return redirectWith(`/dashboard/machines/${machineId}`, {
      squarespace_oauth: "config",
    });
  }

  const redirectUri = getSquarespaceOAuthRedirectUri(baseUrl);

  try {
    const tokens = await exchangeSquarespaceAuthorizationCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });

    await prisma.machine.update({
      where: { id: machineId },
      data: {
        squarespaceOAuthRefreshTokenEnc: encryptSecret(tokens.refreshToken),
        squarespaceOAuthAccessTokenEnc: encryptSecret(tokens.accessToken),
        squarespaceOAuthAccessExpiresAt: tokens.accessExpiresAt,
      },
    });

    logAudit(machineId, "squarespace_oauth_connected", {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const u = new URL(`/dashboard/machines/${machineId}`, baseUrl);
    u.searchParams.set("squarespace_oauth", "token");
    u.searchParams.set("detail", msg.slice(0, 200));
    const res = NextResponse.redirect(u);
    res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  const u = new URL(`/dashboard/machines/${machineId}`, baseUrl);
  u.searchParams.set("squarespace_oauth", "connected");
  const res = NextResponse.redirect(u);
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
