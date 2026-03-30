"use client";

import { useState } from "react";
import { listSwitchBotDevicesAction } from "@/app/actions/machines";
import type { SwitchBotDeviceRow } from "@/lib/switchbot";

export function SwitchBotDeviceLookup({
  machineId,
  deviceInputName = "switchbotDeviceId",
}: {
  /** `null` during new-machine wizard (token/secret must be in the same form). */
  machineId: string | null;
  deviceInputName?: string;
}) {
  const [devices, setDevices] = useState<SwitchBotDeviceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm">
      <p className="text-zinc-600">
        The SwitchBot app often does not show the API device id. This asks
        SwitchBot&apos;s cloud for your account&apos;s devices using the token
        and secret in this form (or your saved credentials on edit).
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={async (e) => {
          const form = (e.currentTarget as HTMLButtonElement).closest("form");
          const tok =
            form?.querySelector<HTMLInputElement>('[name="switchbotToken"]')
              ?.value ?? "";
          const sec =
            form?.querySelector<HTMLInputElement>('[name="switchbotSecret"]')
              ?.value ?? "";
          setLoading(true);
          setError(null);
          setDevices(null);
          const r = await listSwitchBotDevicesAction(machineId, tok, sec);
          setLoading(false);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setDevices(r.devices);
        }}
        className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        {loading ? "Loading…" : "Look up device IDs"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {devices && devices.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600">
          No devices returned. Confirm cloud is enabled for your hub/devices in
          the SwitchBot app.
        </p>
      ) : null}
      {devices && devices.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
          {devices.map((d) => (
            <li
              key={d.deviceId}
              className="flex flex-col gap-1 rounded-md border border-zinc-100 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-zinc-900">{d.deviceName}</div>
                <div className="font-mono text-xs text-zinc-600">
                  {d.deviceType} · {d.deviceId}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  const form = (
                    e.currentTarget as HTMLButtonElement
                  ).closest("form");
                  const input = form?.querySelector<HTMLInputElement>(
                    `[name="${deviceInputName}"]`
                  );
                  if (input) {
                    input.value = d.deviceId;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }}
                className="shrink-0 rounded border border-teal-600 px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
              >
                Use this ID
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
