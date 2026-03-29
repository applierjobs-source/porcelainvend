"use client";

import { useState } from "react";

export function UnlockTestButton({ machineId }: { machineId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setMsg(null);
          setPending(true);
          const res = await fetch(`/api/machines/${machineId}/unlock-test`, {
            method: "POST",
            credentials: "include",
          });
          setPending(false);
          const j = await res.json().catch(() => ({}));
          if (!res.ok) {
            setMsg(j.error || `Failed (${res.status})`);
            return;
          }
          setMsg("Unlock command sent successfully.");
        }}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? "Testing…" : "Test unlock"}
      </button>
      {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
    </div>
  );
}
