import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/encryption";
import { unlockDevice } from "@/lib/switchbot";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ machineId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { machineId } = await ctx.params;
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!machine) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const host = req.headers.get("host") ?? "";
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const same = (url: string) => {
    try {
      return new URL(url).host === host;
    } catch {
      return false;
    }
  };
  if ((origin && !same(origin)) || (referer && !same(referer))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let t: string;
  let s: string;
  try {
    t = decryptSecret(machine.switchbotTokenEnc);
    s = decryptSecret(machine.switchbotSecretEnc);
  } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  const result = await unlockDevice(
    machine.switchbotDeviceId,
    t,
    s,
    machine.switchbotCommand
  );
  logAudit(machine.id, "unlock_test", {
    ok: result.ok,
    detail: result.ok ? result.body : result.error,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, body: result.body });
}
