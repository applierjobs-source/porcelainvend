import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await ctx.params;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`hb:${machineId}:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const m = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!m) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  await prisma.kioskState.upsert({
    where: { machineId },
    create: {
      machineId,
      state: "IDLE",
      message: "",
      lastSeenAt: now,
    },
    update: { lastSeenAt: now },
  });

  return NextResponse.json({ ok: true, at: now.toISOString() });
}
