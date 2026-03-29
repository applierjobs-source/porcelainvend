import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [count, user] = await Promise.all([
    prisma.machine.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        {user?.businessName ?? "Dashboard"}
      </h1>
      <p className="mt-2 text-zinc-600">
        You have {count} machine{count === 1 ? "" : "s"} configured.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/dashboard/machines/new"
          className="rounded-lg bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800"
        >
          Add a machine
        </Link>
        <Link
          href="/dashboard/machines"
          className="rounded-lg border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          View machines
        </Link>
      </div>
    </div>
  );
}
