import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KioskClient } from "@/components/KioskClient";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
  });
  if (!machine) notFound();

  return (
    <KioskClient
      machineId={machine.id}
      headingIdle={`Grab a Drink or Snack`}
    />
  );
}
