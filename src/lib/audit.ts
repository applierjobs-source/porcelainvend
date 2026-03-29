import { prisma } from "@/lib/prisma";

export function logAudit(
  machineId: string | null,
  action: string,
  details: Record<string, unknown>
): void {
  void prisma.auditLog
    .create({
      data: {
        machineId,
        action,
        details: details as object,
      },
    })
    .catch(() => {});
}
