"use client";

import { useState } from "react";
import { rotateWebhookSecret } from "@/app/actions/machines";
import { useRouter } from "next/navigation";

export function SecretRotateForm({ machineId }: { machineId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const secret = String(fd.get("secret") ?? "");
        const r = await rotateWebhookSecret(machineId, secret);
        setPending(false);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        e.currentTarget.reset();
        router.refresh();
      }}
    >
      <input
        name="secret"
        required
        placeholder="New hex secret"
        className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-800 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new secret"}
      </button>
    </form>
  );
}
