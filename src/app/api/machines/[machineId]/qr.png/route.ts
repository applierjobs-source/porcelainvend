import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await ctx.params;
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!machine) {
    return new Response("Not found", { status: 404 });
  }

  const target = machine.squarespaceSelectionPageUrl;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="kiosk-${machine.machineSlug}-qr.png"`,
    },
  });
}
