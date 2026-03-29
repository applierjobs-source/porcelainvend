"use client";

import { useState } from "react";
import { setMachineActive } from "@/app/actions/machines";
import { useRouter } from "next/navigation";

export function MachineDisableForm({
  machineId,
  isActive,
}: {
  machineId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await setMachineActive(machineId, !isActive);
        setPending(false);
        router.refresh();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
      >
        {pending ? "Updating…" : isActive ? "Disable machine" : "Enable machine"}
      </button>
    </form>
  );
}
