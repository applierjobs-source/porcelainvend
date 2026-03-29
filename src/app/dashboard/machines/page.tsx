import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function MachinesListPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const machines = await prisma.machine.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { kioskState: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Machines</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Each machine has a kiosk URL and Squarespace webhook endpoint.
          </p>
        </div>
        <Link
          href="/dashboard/machines/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          New machine
        </Link>
      </div>

      <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {machines.length === 0 ? (
          <li className="px-4 py-8 text-center text-zinc-500">
            No machines yet.{" "}
            <Link href="/dashboard/machines/new" className="text-teal-700 underline">
              Create one
            </Link>
            .
          </li>
        ) : (
          machines.map((m) => (
            <li key={m.id}>
              <Link
                href={`/dashboard/machines/${m.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-zinc-900">{m.machineName}</div>
                  <div className="text-sm text-zinc-500">
                    Slug{" "}
                    <span className="font-mono text-zinc-700">{m.machineSlug}</span>
                    {!m.isActive ? (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                        disabled
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-sm text-zinc-600">
                  Kiosk:{" "}
                  <span className="font-mono text-xs text-zinc-800">
                    {m.kioskState?.state ?? "IDLE"}
                  </span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
