import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

/** Printable “Scan to Pay” poster for counter display. */
export default async function KioskPosterPage({
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
    <div className="min-h-[100dvh] bg-white text-black print:p-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-10 print:py-4">
        <p className="text-center text-sm text-zinc-500 print:hidden">
          <Link href={`/kiosk/${machine.id}`} className="underline">
            Back to kiosk
          </Link>{" "}
          · Use print dialog for PDF / paper
        </p>
        <h1 className="mt-8 text-center text-3xl font-bold tracking-tight">
          {machine.machineName}
        </h1>
        <p className="mt-4 text-center text-xl font-semibold">
          Scan to pay with Apple Pay / Google Pay
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/machines/${machine.id}/qr.png`}
          alt="QR code"
          className="mt-10 w-[min(80vw,14in)] max-w-2xl bg-white p-4"
        />
        <p className="mt-8 text-center text-lg text-zinc-700">
          Complete checkout on your phone — then take your items from the
          machine.
        </p>
      </div>
    </div>
  );
}
