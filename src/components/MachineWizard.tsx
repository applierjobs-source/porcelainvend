"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMachine } from "@/app/actions/machines";
import QRCode from "qrcode";
import { SwitchBotDeviceLookup } from "@/components/SwitchBotDeviceLookup";

const STEPS = 5;

type WizardValues = {
  machineName: string;
  machineSlug: string;
  themeColor: string;
  squarespaceStoreUrl: string;
  squarespaceSelectionPageUrl: string;
  squarespaceCommerceApiKey: string;
  squarespaceWebhookSecret: string;
  switchbotToken: string;
  switchbotSecret: string;
  switchbotDeviceId: string;
  switchbotCommand: string;
};

const empty: WizardValues = {
  machineName: "",
  machineSlug: "",
  themeColor: "",
  squarespaceStoreUrl: "",
  squarespaceSelectionPageUrl: "",
  squarespaceCommerceApiKey: "",
  squarespaceWebhookSecret: "",
  switchbotToken: "",
  switchbotSecret: "",
  switchbotDeviceId: "",
  switchbotCommand: "",
};

export function MachineWizard({ baseUrl }: { baseUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<WizardValues>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [webhookSecretSkipped, setWebhookSecretSkipped] = useState(false);

  async function finish(next: Partial<WizardValues>) {
    const merged = { ...values, ...next };
    setValues(merged);
    setPending(true);
    setError(null);
    const r = await createMachine({
      machineName: merged.machineName,
      machineSlug: merged.machineSlug,
      squarespaceStoreUrl: merged.squarespaceStoreUrl,
      squarespaceSelectionPageUrl: merged.squarespaceSelectionPageUrl,
      squarespaceWebhookSecret: merged.squarespaceWebhookSecret,
      squarespaceCommerceApiKey: merged.squarespaceCommerceApiKey,
      switchbotToken: merged.switchbotToken,
      switchbotSecret: merged.switchbotSecret,
      switchbotDeviceId: merged.switchbotDeviceId,
      switchbotCommand: merged.switchbotCommand || "press",
      themeColor: merged.themeColor || undefined,
    });
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setWebhookSecretSkipped(!merged.squarespaceWebhookSecret.trim());
    setCreatedId(r.machineId);
    const url = await QRCode.toDataURL(merged.squarespaceSelectionPageUrl, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    setQrDataUrl(url);
    setStep(5);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex gap-2 text-sm text-zinc-500">
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={
              i + 1 === step
                ? "font-semibold text-teal-800"
                : i + 1 < step
                  ? "text-zinc-800"
                  : ""
            }
          >
            {i + 1}
          </span>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <Step1
          values={values}
          onNext={(v) => {
            setValues((prev) => ({ ...prev, ...v }));
            setStep(2);
          }}
        />
      ) : null}
      {step === 2 ? (
        <Step2
          values={values}
          onBack={() => setStep(1)}
          onNext={(v) => {
            setValues((prev) => ({ ...prev, ...v }));
            setStep(3);
          }}
        />
      ) : null}
      {step === 3 ? (
        <Step3
          values={values}
          onBack={() => setStep(2)}
          onNext={(v) => {
            setValues((prev) => ({ ...prev, ...v }));
            setStep(4);
          }}
        />
      ) : null}
      {step === 4 ? (
        <Step4
          values={values}
          onBack={() => setStep(3)}
          onNext={(v) => void finish(v)}
          pending={pending}
        />
      ) : null}
      {step === 5 && createdId ? (
        <Step5
          baseUrl={baseUrl}
          machineId={createdId}
          qrDataUrl={qrDataUrl}
          webhookSecretSkipped={webhookSecretSkipped}
          onDone={() => router.push(`/dashboard/machines/${createdId}`)}
        />
      ) : null}
    </div>
  );
}

function Step1({
  values,
  onNext,
}: {
  values: WizardValues;
  onNext: (v: Partial<WizardValues>) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onNext({
          machineName: String(fd.get("machineName") ?? ""),
          machineSlug: String(fd.get("machineSlug") ?? "").toLowerCase(),
          themeColor: String(fd.get("themeColor") ?? "").trim(),
        });
      }}
    >
      <h2 className="text-lg font-semibold text-zinc-900">Machine identity</h2>
      <label className="block text-sm font-medium text-zinc-700">
        Machine name
        <input
          name="machineName"
          required
          defaultValue={values.machineName}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="Lobby snack robot"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Machine slug (URL-safe)
        <input
          name="machineSlug"
          required
          defaultValue={values.machineSlug}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="lobby-east"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Theme accent (optional, hex)
        <input
          name="themeColor"
          defaultValue={values.themeColor}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="#0f766e"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800"
      >
        Continue
      </button>
    </form>
  );
}

function Step2({
  values,
  onBack,
  onNext,
}: {
  values: WizardValues;
  onBack: () => void;
  onNext: (v: Partial<WizardValues>) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onNext({
          squarespaceStoreUrl: String(fd.get("squarespaceStoreUrl") ?? "").trim(),
          squarespaceSelectionPageUrl: String(
            fd.get("squarespaceSelectionPageUrl") ?? ""
          ).trim(),
          squarespaceCommerceApiKey: String(
            fd.get("squarespaceCommerceApiKey") ?? ""
          ).trim(),
        });
      }}
    >
      <h2 className="text-lg font-semibold text-zinc-900">Squarespace</h2>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Use a stable layout-page URL for this machine. If you change the page
        slug later, existing printed QR codes will still point at the old URL
        and will break.
      </p>
      <label className="block text-sm font-medium text-zinc-700">
        Store URL (HTTPS)
        <input
          name="squarespaceStoreUrl"
          type="url"
          required
          defaultValue={values.squarespaceStoreUrl}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="https://yourbrand.com"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Machine selection page URL (HTTPS, same domain)
        <input
          name="squarespaceSelectionPageUrl"
          type="url"
          required
          defaultValue={values.squarespaceSelectionPageUrl}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="https://yourbrand.com/vend-lobby"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Commerce API key (Orders API)
        <input
          name="squarespaceCommerceApiKey"
          required
          autoComplete="off"
          defaultValue={values.squarespaceCommerceApiKey}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="Bearer token from Squarespace developer settings"
        />
      </label>
      <p className="text-xs text-zinc-500">
        Needed to load the order after each webhook. Stored encrypted; never shown
        again in plain text.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-zinc-300 py-3 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800"
        >
          Continue
        </button>
      </div>
    </form>
  );
}

function Step3({
  values,
  onBack,
  onNext,
}: {
  values: WizardValues;
  onBack: () => void;
  onNext: (v: Partial<WizardValues>) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onNext({
          squarespaceWebhookSecret: String(
            fd.get("squarespaceWebhookSecret") ?? ""
          ).trim(),
        });
      }}
    >
      <h2 className="text-lg font-semibold text-zinc-900">Webhook secret</h2>
      <p className="rounded-lg border border-teal-100 bg-teal-50/80 p-3 text-sm text-teal-950">
        Optional: you can leave this blank, finish setup, then open this
        machine in the dashboard and use{" "}
        <strong>Create webhook in Squarespace</strong> — you need the final
        webhook URL, which includes your new machine id.
      </p>
      <p className="text-sm text-zinc-600">
        If you already have a hex secret from Squarespace, paste it here.
        Otherwise skip the field and set up the webhook after the machine is
        created.
      </p>
      <label className="block text-sm font-medium text-zinc-700">
        Webhook secret (hex), optional
        <input
          name="squarespaceWebhookSecret"
          autoComplete="off"
          defaultValue={values.squarespaceWebhookSecret}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="Leave blank to configure later"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-zinc-300 py-3 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800"
        >
          Continue
        </button>
      </div>
    </form>
  );
}

function Step4({
  values,
  onBack,
  onNext,
  pending,
}: {
  values: WizardValues;
  onBack: () => void;
  onNext: (v: Partial<WizardValues>) => void;
  pending: boolean;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onNext({
          switchbotToken: String(fd.get("switchbotToken") ?? "").trim(),
          switchbotSecret: String(fd.get("switchbotSecret") ?? "").trim(),
          switchbotDeviceId: String(fd.get("switchbotDeviceId") ?? "").trim(),
          switchbotCommand: String(fd.get("switchbotCommand") ?? "").trim(),
        });
      }}
    >
      <h2 className="text-lg font-semibold text-zinc-900">SwitchBot</h2>
      <p className="text-sm text-zinc-600">
        Token and secret come from the SwitchBot app (Profile → Developer
        options). The device ID is often hidden in the app — use look up below
        after entering token and secret. Credentials are encrypted at rest.
      </p>
      <label className="block text-sm font-medium text-zinc-700">
        Token
        <input
          name="switchbotToken"
          required
          autoComplete="off"
          defaultValue={values.switchbotToken}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Secret
        <input
          name="switchbotSecret"
          required
          autoComplete="off"
          defaultValue={values.switchbotSecret}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <SwitchBotDeviceLookup machineId={null} />
      <label className="block text-sm font-medium text-zinc-700">
        Device ID
        <input
          name="switchbotDeviceId"
          required
          autoComplete="off"
          defaultValue={values.switchbotDeviceId}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Command (default press)
        <input
          name="switchbotCommand"
          defaultValue={values.switchbotCommand || "press"}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="press"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-zinc-300 py-3 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Finish setup"}
        </button>
      </div>
    </form>
  );
}

function Step5({
  baseUrl,
  machineId,
  qrDataUrl,
  webhookSecretSkipped,
  onDone,
}: {
  baseUrl: string;
  machineId: string;
  qrDataUrl: string | null;
  webhookSecretSkipped: boolean;
  onDone: () => void;
}) {
  const kioskUrl = `${baseUrl}/kiosk/${machineId}`;
  const webhookUrl = `${baseUrl}/api/webhooks/squarespace?machineId=${machineId}`;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900">Kiosk assets</h2>
      {webhookSecretSkipped ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Next: open the machine dashboard and click{" "}
          <strong>Create webhook in Squarespace</strong> under Kiosk &amp;
          webhook so order notifications are verified and processed.
        </p>
      ) : null}
      <div>
        <div className="text-sm font-medium text-zinc-700">Kiosk URL (tablet)</div>
        <code className="mt-1 block break-all rounded-lg bg-zinc-100 px-3 py-2 text-sm">
          {kioskUrl}
        </code>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-700">
          Squarespace webhook URL (paste in subscription)
        </div>
        <code className="mt-1 block break-all rounded-lg bg-zinc-100 px-3 py-2 text-sm">
          {webhookUrl}
        </code>
      </div>
      {qrDataUrl ? (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR for customer checkout"
            className="mx-auto max-w-xs border border-zinc-200"
          />
          <a
            className="mt-3 inline-block text-sm text-teal-700 underline"
            href={`${baseUrl}/api/machines/${machineId}/qr.png`}
            download
          >
            Download QR PNG
          </a>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800"
      >
        Open machine dashboard
      </button>
    </div>
  );
}
