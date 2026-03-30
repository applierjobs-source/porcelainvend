import type { Machine } from "@prisma/client";
import { SquarespaceClient, type SquarespaceOrder } from "@/lib/squarespace-client";
import { decryptSecret } from "@/lib/encryption";
import { unlockDevice } from "@/lib/switchbot";
import { setKioskState, scheduleKioskIdle } from "@/lib/kiosk-state";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export function isPayableOrder(order: {
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

/**
 * Fetch order (unless caller passes a fresh snapshot), unlock if payable, record OrderEvent.
 */
export async function fulfillOrderFromSquarespaceForMachine(params: {
  machine: Machine;
  client: SquarespaceClient;
  orderId: string;
  eventHash: string;
  webhookEventType: string;
  webhookSignature: string;
  rawPayload: object;
}): Promise<void> {
  const { machine, client, orderId, eventHash, webhookEventType, webhookSignature, rawPayload } =
    params;

  let order: SquarespaceOrder | null;
  try {
    order = await client.getOrder(orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logAudit(machine.id, "squarespace_order_fetch_failed", { message: msg });
    await prisma.orderEvent.create({
      data: {
        machineId: machine.id,
        externalOrderId: orderId,
        webhookEventType,
        webhookSignature,
        eventHash,
        paymentStatus: "fetch_error",
        rawPayload,
      },
    });
    await setKioskState(machine.id, "ERROR", "Order lookup failed");
    scheduleKioskIdle(machine.id, 15_000);
    return;
  }

  if (!order || !isPayableOrder(order)) {
    await prisma.orderEvent.create({
      data: {
        machineId: machine.id,
        externalOrderId: orderId,
        webhookEventType,
        webhookSignature,
        eventHash,
        paymentStatus: "not_payable",
        rawPayload,
      },
    });
    return;
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
    return;
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
      webhookEventType,
      webhookSignature,
      eventHash,
      paymentStatus: "paid",
      unlockTriggered,
      unlockTriggeredAt,
      rawPayload,
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
}
