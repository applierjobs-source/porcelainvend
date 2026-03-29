import type { KioskStateKind } from "@prisma/client";

export type KioskSsePayload = {
  state: KioskStateKind;
  message?: string;
  lastOrderId?: string | null;
  at: string;
};

type Sink = (line: string) => void;

const channels = new Map<string, Set<Sink>>();

export function sseSubscribe(machineId: string, sink: Sink): () => void {
  let set = channels.get(machineId);
  if (!set) {
    set = new Set();
    channels.set(machineId, set);
  }
  set.add(sink);
  return () => {
    set?.delete(sink);
    if (set && set.size === 0) channels.delete(machineId);
  };
}

export function sseBroadcast(machineId: string, payload: KioskSsePayload): void {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  const set = channels.get(machineId);
  if (!set) return;
  set.forEach((sink) => {
    try {
      sink(line);
    } catch {
      /* ignore broken stream */
    }
  });
}
