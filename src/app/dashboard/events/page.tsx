import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const machineIds = (
    await prisma.machine.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    })
  ).map((m) => m.id);

  const [audits, orders] = await Promise.all([
    prisma.auditLog.findMany({
      where: { machineId: { in: machineIds } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { machine: { select: { machineName: true } } },
    }),
    prisma.orderEvent.findMany({
      where: { machineId: { in: machineIds } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { machine: { select: { machineName: true } } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Event log</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Audit trail and Squarespace order webhooks across your machines.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Audit
        </h2>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white text-sm">
          {audits.length === 0 ? (
            <li className="px-4 py-6 text-zinc-500">No audit entries.</li>
          ) : (
            audits.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="font-medium text-zinc-900">{a.action}</div>
                <div className="text-xs text-zinc-500">
                  {a.machine?.machineName ?? "—"} ·{" "}
                  {a.createdAt.toISOString()}
                </div>
                <pre className="mt-1 max-h-24 overflow-auto text-xs text-zinc-700">
                  {JSON.stringify(a.details, null, 2)}
                </pre>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Order events
        </h2>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white text-sm">
          {orders.length === 0 ? (
            <li className="px-4 py-6 text-zinc-500">No order events.</li>
          ) : (
            orders.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="font-mono text-xs text-zinc-800">
                  {o.externalOrderId} · {o.webhookEventType}
                </div>
                <div className="text-xs text-zinc-500">
                  {o.machine.machineName} · {o.paymentStatus} · unlock{" "}
                  {o.unlockTriggered ? "yes" : "no"} ·{" "}
                  {o.createdAt.toISOString()}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
