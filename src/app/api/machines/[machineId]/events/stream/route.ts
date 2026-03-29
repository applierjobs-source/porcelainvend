import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseSubscribe } from "@/lib/sse-registry";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await ctx.params;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`sse:${machineId}:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const m = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!m) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => {
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          /* stream closed */
        }
      };

      unsubscribe = sseSubscribe(machineId, send);

      const state = await prisma.kioskState.findUnique({
        where: { machineId },
      });
      send(
        `data: ${JSON.stringify({
          state: state?.state ?? "IDLE",
          message: state?.message ?? "",
          lastOrderId: state?.lastOrderId ?? null,
          at: new Date().toISOString(),
        })}\n\n`
      );

      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepAlive) clearInterval(keepAlive);
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe();
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
