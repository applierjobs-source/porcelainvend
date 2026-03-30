import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSquarespaceAuthorizeUrl,
  getSquarespaceOAuthRedirectUri,
  isSquarespaceOAuthConfigured,
} from "@/lib/squarespace-oauth";
import { getPublicBaseUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

const COOKIE = "pv_sq_oauth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const loginBase = await getPublicBaseUrl();
    return NextResponse.redirect(`${loginBase}/login`);
  }

  if (!isSquarespaceOAuthConfigured()) {
    return NextResponse.json(
      { error: "Squarespace OAuth is not configured on this server" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const machineId = url.searchParams.get("machineId")?.trim();
  if (!machineId) {
    return NextResponse.json({ error: "missing machineId" }, { status: 400 });
  }

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
    select: { id: true },
  });
  if (!machine) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const clientId = process.env.SQUARESPACE_OAUTH_CLIENT_ID!.trim();
  const baseUrl = await getPublicBaseUrl();
  const redirectUri = getSquarespaceOAuthRedirectUri(baseUrl);
  const state = randomBytes(24).toString("hex");
  const cookieVal = `${machineId}:${state}`;

  const authorizeUrl = buildSquarespaceAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(COOKIE, cookieVal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
