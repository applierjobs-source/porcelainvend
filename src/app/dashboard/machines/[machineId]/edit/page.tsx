import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MachineEditForm } from "@/components/MachineEditForm";

export default async function EditMachinePage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!machine) notFound();

  return (
    <div>
      <Link
        href={`/dashboard/machines/${machine.id}`}
        className="text-sm text-teal-700 underline"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">
        Edit {machine.machineName}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Slug <span className="font-mono">{machine.machineSlug}</span> cannot be
        changed here. Encrypted fields are only updated when you type new
        values.
      </p>
      <div className="mt-8 max-w-xl">
        <MachineEditForm machine={machine} />
      </div>
    </div>
  );
}
