import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySquarespaceSignature } from "@/lib/squarespace-verify";
import { SquarespaceClient } from "@/lib/squarespace-client";
import { decryptSecret } from "@/lib/encryption";
import { setKioskState, scheduleKioskIdle } from "@/lib/kiosk-state";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { fulfillOrderFromSquarespaceForMachine } from "@/lib/fulfill-squarespace-order";

export const runtime = "nodejs";

const USER_AGENT = "PorcelainVend/1.0 (Squarespace webhook)";

/** Browsers send GET; Squarespace sends POST. This confirms the URL and machine exist. */
export async function GET(req: NextRequest) {
  const machineId = req.nextUrl.searchParams.get("machineId");
  if (!machineId) {
    return NextResponse.json({ error: "missing machineId" }, { status: 400 });
  }

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
    select: { id: true },
  });
  if (!machine) {
    return NextResponse.json({ error: "machine_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "PorcelainVend Squarespace webhook. Squarespace must POST JSON here with Squarespace-Signature.",
    machineId: machine.id,
  });
}

type WebhookBody = {
  id?: string;
  topic?: string;
  data?: { orderId?: string };
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`wh:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const machineId = req.nextUrl.searchParams.get("machineId");
  if (!machineId) {
    return NextResponse.json({ error: "missing machineId" }, { status: 400 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("squarespace-signature");

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!machine) {
    return NextResponse.json({ error: "machine_not_found" }, { status: 404 });
  }

  const webhookSecret = machine.squarespaceWebhookSecret?.trim() ?? "";
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "webhook_secret_not_configured" },
      { status: 503 }
    );
  }

  if (!verifySquarespaceSignature(rawBody, webhookSecret, sig)) {
    logAudit(machine.id, "webhook_signature_failed", {});
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: WebhookBody;
  try {
    payload = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const notifyId =
    payload.id ??
    crypto.createHash("sha256").update(rawBody).digest("hex");
  const eventHash = `${machine.id}:${notifyId}`;
  const existing = await prisma.orderEvent.findUnique({
    where: { eventHash },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const topic = payload.topic ?? "";
  const orderId = payload.data?.orderId;

  const payTopics = topic === "order.create" || topic === "order.update";
  if (!orderId || !payTopics) {
    await prisma.orderEvent
      .create({
        data: {
          machineId: machine.id,
          externalOrderId: orderId ?? "unknown",
          webhookEventType: topic || "unknown",
          webhookSignature: sig ?? "",
          eventHash,
          paymentStatus: "skipped",
          rawPayload: payload as object,
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, ignored: true });
  }

  const priorUnlock = await prisma.orderEvent.findFirst({
    where: {
      machineId: machine.id,
      externalOrderId: orderId,
      unlockTriggered: true,
    },
  });
  if (priorUnlock) {
    await prisma.orderEvent
      .create({
        data: {
          machineId: machine.id,
          externalOrderId: orderId,
          webhookEventType: topic,
          webhookSignature: sig ?? "",
          eventHash,
          paymentStatus: "duplicate_order",
          rawPayload: payload as object,
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, already_unlocked: true });
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(machine.squarespaceCommerceApiKeyEnc);
  } catch {
    logAudit(machine.id, "webhook_decrypt_api_key_failed", {});
    await setKioskState(machine.id, "ERROR", "Configuration error");
    scheduleKioskIdle(machine.id, 15_000);
    return NextResponse.json({ ok: true, error: "decrypt" });
  }

  const client = new SquarespaceClient(apiKey, USER_AGENT);
  await fulfillOrderFromSquarespaceForMachine({
    machine,
    client,
    orderId,
    eventHash,
    webhookEventType: topic,
    webhookSignature: sig ?? "",
    rawPayload: payload as object,
  });

  return NextResponse.json({ ok: true });
}
