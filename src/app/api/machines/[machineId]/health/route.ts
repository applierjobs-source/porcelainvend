import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await ctx.params;
  const m = await prisma.machine.findFirst({
    where: { id: machineId },
    include: { kioskState: true },
  });
  if (!m) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const last = m.kioskState?.lastSeenAt;
  const staleMs = 120_000;
  const online =
    !!last && Date.now() - new Date(last).getTime() < staleMs;

  return NextResponse.json({
    ok: true,
    machineId,
    isActive: m.isActive,
    online,
    lastSeenAt: last?.toISOString() ?? null,
    kioskState: m.kioskState?.state ?? null,
  });
}
