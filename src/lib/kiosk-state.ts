import type { KioskStateKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sseBroadcast } from "@/lib/sse-registry";

export async function setKioskState(
  machineId: string,
  state: KioskStateKind,
  message: string,
  lastOrderId?: string | null
): Promise<void> {
  await prisma.kioskState.upsert({
    where: { machineId },
    create: { machineId, state, message, lastOrderId: lastOrderId ?? null },
    update: { state, message, lastOrderId: lastOrderId ?? null },
  });
  sseBroadcast(machineId, {
    state,
    message,
    lastOrderId: lastOrderId ?? null,
    at: new Date().toISOString(),
  });
}

const g = globalThis as typeof globalThis & {
  __kioskIdleTimers?: Map<string, ReturnType<typeof setTimeout>>;
};

export function scheduleKioskIdle(machineId: string, delayMs = 15_000): void {
  if (!g.__kioskIdleTimers) g.__kioskIdleTimers = new Map();
  const prev = g.__kioskIdleTimers.get(machineId);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    void (async () => {
      try {
        await setKioskState(machineId, "IDLE", "");
      } finally {
        g.__kioskIdleTimers?.delete(machineId);
      }
    })();
  }, delayMs);
  g.__kioskIdleTimers.set(machineId, t);
}
