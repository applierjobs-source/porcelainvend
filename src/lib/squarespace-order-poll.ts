import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/encryption";
import { SquarespaceClient } from "@/lib/squarespace-client";
import { isPayableOrder, fulfillOrderFromSquarespaceForMachine } from "@/lib/fulfill-squarespace-order";
import { logAudit } from "@/lib/audit";

const USER_AGENT = "PorcelainVend/1.0 (order-poll)";
const POLL_DEBOUNCE_MS = 5_000;
const LOOKBACK_FIRST_MS = 10 * 60 * 1000;

const lastPollWallClock = new Map<string, number>();

/**
 * While the tablet is on the kiosk page we get heartbeats ~5s apart. If the
 * machine has no webhook signing secret yet, poll Squarespace Orders API
 * (Developer API key works) for recently modified orders and run the same
 * unlock path as webhooks. Stops polling once a webhook secret is configured.
 */
export async function maybePollSquarespaceOrdersFromKiosk(
  machineId: string
): Promise<void> {
  const nowMs = Date.now();
  const prev = lastPollWallClock.get(machineId) ?? 0;
  if (nowMs - prev < POLL_DEBOUNCE_MS) return;
  lastPollWallClock.set(machineId, nowMs);

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!machine) return;

  if (machine.squarespaceWebhookSecret?.trim()) {
    return;
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(machine.squarespaceCommerceApiKeyEnc);
  } catch {
    return;
  }

  const modifiedBefore = new Date();
  const modifiedAfter =
    machine.lastSquarespaceOrderPollAt ??
    new Date(nowMs - LOOKBACK_FIRST_MS);

  if (modifiedAfter >= modifiedBefore) {
    return;
  }

  const client = new SquarespaceClient(apiKey, USER_AGENT);
  let result: { result: { id: string }[] };
  try {
    result = await client.listOrders({
      modifiedAfter: modifiedAfter.toISOString(),
      modifiedBefore: modifiedBefore.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logAudit(machineId, "squarespace_order_poll_list_failed", {
      message: msg.slice(0, 300),
    });
    return;
  }

  await prisma.machine.update({
    where: { id: machineId },
    data: { lastSquarespaceOrderPollAt: modifiedBefore },
  });

  const orders = result.result ?? [];
  for (const row of orders) {
    const orderId = row.id;
    if (!orderId) continue;

    const priorUnlock = await prisma.orderEvent.findFirst({
      where: {
        machineId: machine.id,
        externalOrderId: orderId,
        unlockTriggered: true,
      },
    });
    if (priorUnlock) continue;

    const eventHash = crypto
      .createHash("sha256")
      .update(`poll:${machine.id}:${orderId}`)
      .digest("hex");

    const already = await prisma.orderEvent.findUnique({
      where: { eventHash },
    });
    if (already) continue;

    const listShape = row as {
      id: string;
      fulfillmentStatus?: string;
      grandTotal?: { value: string };
      refundedTotal?: { value: string };
    };
    if (
      !isPayableOrder({
        fulfillmentStatus: listShape.fulfillmentStatus ?? "",
        grandTotal: listShape.grandTotal,
        refundedTotal: listShape.refundedTotal,
      })
    ) {
      continue;
    }

    const rawPayload = {
      source: "squarespace_order_poll",
      orderId,
      modifiedAfter: modifiedAfter.toISOString(),
      modifiedBefore: modifiedBefore.toISOString(),
    };

    await fulfillOrderFromSquarespaceForMachine({
      machine,
      client,
      orderId,
      eventHash,
      webhookEventType: "order.poll",
      webhookSignature: "",
      rawPayload,
    });
  }
}
