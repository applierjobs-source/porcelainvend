import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySquarespaceSignature } from "@/lib/squarespace-verify";
import { SquarespaceClient } from "@/lib/squarespace-client";
import { decryptSecret } from "@/lib/encryption";
import { unlockDevice } from "@/lib/switchbot";
import { setKioskState, scheduleKioskIdle } from "@/lib/kiosk-state";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const USER_AGENT = "PorcelainVend/1.0 (Squarespace webhook)";

type WebhookBody = {
  id?: string;
  topic?: string;
  data?: { orderId?: string };
};

function isPayableOrder(order: {
  fulfillmentStatus: string;
  grandTotal?: { value: string };
  refundedTotal?: { value: string };
}): boolean {
  if (order.fulfillmentStatus === "CANCELED") return false;
  const gt = parseFloat(order.grandTotal?.value ?? "0");
  const ref = parseFloat(order.refundedTotal?.value ?? "0");
  if (!(gt > 0)) return false;
  if (ref >= gt) return false;
  return true;
}

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

  if (
    !verifySquarespaceSignature(rawBody, machine.squarespaceWebhookSecret, sig)
  ) {
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
  let order;
  try {
    order = await client.getOrder(orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logAudit(machine.id, "squarespace_order_fetch_failed", { message: msg });
    await prisma.orderEvent.create({
      data: {
        machineId: machine.id,
        externalOrderId: orderId,
        webhookEventType: topic,
        webhookSignature: sig ?? "",
        eventHash,
        paymentStatus: "fetch_error",
        rawPayload: payload as object,
      },
    });
    await setKioskState(machine.id, "ERROR", "Order lookup failed");
    scheduleKioskIdle(machine.id, 15_000);
    return NextResponse.json({ ok: true });
  }

  if (!order || !isPayableOrder(order)) {
    await prisma.orderEvent.create({
      data: {
        machineId: machine.id,
        externalOrderId: orderId,
        webhookEventType: topic,
        webhookSignature: sig ?? "",
        eventHash,
        paymentStatus: "not_payable",
        rawPayload: payload as object,
      },
    });
    return NextResponse.json({ ok: true, not_payable: true });
  }

  let token: string;
  let secret: string;
  try {
    token = decryptSecret(machine.switchbotTokenEnc);
    secret = decryptSecret(machine.switchbotSecretEnc);
  } catch {
    logAudit(machine.id, "webhook_decrypt_switchbot_failed", {});
    await setKioskState(machine.id, "ERROR", "Configuration error");
    scheduleKioskIdle(machine.id, 15_000);
    return NextResponse.json({ ok: true });
  }

  const unlock = await unlockDevice(
    machine.switchbotDeviceId,
    token,
    secret,
    machine.switchbotCommand
  );

  const unlockTriggered = unlock.ok;
  const unlockTriggeredAt = unlockTriggered ? new Date() : null;

  await prisma.orderEvent.create({
    data: {
      machineId: machine.id,
      externalOrderId: orderId,
      webhookEventType: topic,
      webhookSignature: sig ?? "",
      eventHash,
      paymentStatus: "paid",
      unlockTriggered,
      unlockTriggeredAt,
      rawPayload: payload as object,
    },
  });

  logAudit(machine.id, "order_unlock", {
    orderId,
    unlockOk: unlock.ok,
    switchbot: unlock.ok ? unlock.body : unlock.error,
  });

  if (unlockTriggered) {
    await setKioskState(
      machine.id,
      "PAID",
      "Payment received. Door unlocked. Please grab your items.",
      orderId
    );
  } else {
    await setKioskState(
      machine.id,
      "ERROR",
      "Payment received but unlock failed. Contact support.",
      orderId
    );
  }
  scheduleKioskIdle(machine.id, 15_000);

  return NextResponse.json({ ok: true });
}
