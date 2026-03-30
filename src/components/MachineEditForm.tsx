"use client";

import type { Machine } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateMachine } from "@/app/actions/machines";
import { SwitchBotDeviceLookup } from "@/components/SwitchBotDeviceLookup";

export function MachineEditForm({ machine }: { machine: Machine }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const apiKey = String(fd.get("squarespaceCommerceApiKey") ?? "").trim();
        const sbTok = String(fd.get("switchbotToken") ?? "").trim();
        const sbSec = String(fd.get("switchbotSecret") ?? "").trim();

        const patch: Parameters<typeof updateMachine>[1] = {
          machineName: String(fd.get("machineName") ?? "").trim(),
          squarespaceStoreUrl: String(fd.get("squarespaceStoreUrl") ?? "").trim(),
          squarespaceSelectionPageUrl: String(
            fd.get("squarespaceSelectionPageUrl") ?? ""
          ).trim(),
          switchbotDeviceId: String(fd.get("switchbotDeviceId") ?? "").trim(),
          switchbotCommand: String(fd.get("switchbotCommand") ?? "").trim(),
        };
        if (apiKey) patch.squarespaceCommerceApiKey = apiKey;
        if (sbTok) patch.switchbotToken = sbTok;
        if (sbSec) patch.switchbotSecret = sbSec;

        const r = await updateMachine(machine.id, patch);
        setPending(false);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        router.push(`/dashboard/machines/${machine.id}`);
        router.refresh();
      }}
    >
      <label className="block text-sm font-medium text-zinc-700">
        Machine name
        <input
          name="machineName"
          required
          defaultValue={machine.machineName}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Store URL
        <input
          name="squarespaceStoreUrl"
          type="url"
          required
          defaultValue={machine.squarespaceStoreUrl}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Selection page URL
        <input
          name="squarespaceSelectionPageUrl"
          type="url"
          required
          defaultValue={machine.squarespaceSelectionPageUrl}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        New Commerce API key (leave blank to keep)
        <input
          name="squarespaceCommerceApiKey"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        New SwitchBot token (leave blank to keep)
        <input
          name="switchbotToken"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        New SwitchBot secret (leave blank to keep)
        <input
          name="switchbotSecret"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <SwitchBotDeviceLookup machineId={machine.id} />
      <label className="block text-sm font-medium text-zinc-700">
        SwitchBot device ID
        <input
          name="switchbotDeviceId"
          required
          defaultValue={machine.switchbotDeviceId}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        SwitchBot command
        <input
          name="switchbotCommand"
          defaultValue={machine.switchbotCommand}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
