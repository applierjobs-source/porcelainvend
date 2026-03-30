"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { provisionSquarespaceWebhook } from "@/app/actions/machines";

export function SquarespaceWebhookProvisionForm({
  machineId,
  webhookUrl,
  autoProvisionAvailable,
}: {
  machineId: string;
  webhookUrl: string;
  /** OAuth connected or SQUARESPACE_WEBHOOK_ACCESS_TOKEN on server */
  autoProvisionAvailable: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    subscriptionId: string;
    topics: string[];
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-xs text-zinc-600">
        {autoProvisionAvailable ? (
          <p>
            Registers the webhook with Squarespace using an OAuth access token
            (from <strong>Connect Squarespace</strong> above, or{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">
              SQUARESPACE_WEBHOOK_ACCESS_TOKEN
            </code>{" "}
            on the server). Your Commerce Developer API key is only for{" "}
            <em>loading orders</em> after a notification (
            <a
              href="https://developers.squarespace.com/commerce-apis/webhook-subscriptions-overview"
              className="text-teal-700 underline"
              target="_blank"
              rel="noreferrer"
            >
              docs
            </a>
            ).
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
            <p className="font-medium text-zinc-900">Manual webhook setup</p>
            <p className="mt-2">
              Squarespace only accepts an <strong>OAuth</strong> bearer token to
              create subscriptions — not your site Developer API key. Since
              OAuth isn’t connected here, use <strong>Copy URL</strong>, create
              the subscription with Squarespace’s API (or any tool that can send{" "}
              <code className="font-mono text-[11px]">POST /webhook_subscriptions</code>{" "}
              with a valid token), subscribe to{" "}
              <code className="font-mono text-[11px]">order.create</code> and{" "}
              <code className="font-mono text-[11px]">order.update</code>, then
              paste the returned <strong>hex secret</strong> under{" "}
              <strong>Rotate webhook secret</strong> on this page.
            </p>
          </div>
        )}
        <p className="text-zinc-500">
          If a subscription already exists for this URL, remove it in Squarespace
          first to avoid duplicate deliveries.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <p className="min-w-0 flex-1 break-all font-mono text-xs text-zinc-900">
          {webhookUrl}
        </p>
        <button
          type="button"
          onClick={copyUrl}
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>
      {autoProvisionAvailable ? (
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setError(null);
            setSuccess(null);
            setPending(true);
            const r = await provisionSquarespaceWebhook(machineId);
            setPending(false);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setSuccess({
              subscriptionId: r.subscriptionId,
              topics: r.topics,
            });
            router.refresh();
          }}
          className="rounded-lg bg-teal-700 py-2 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Contacting Squarespace…" : "Create webhook in Squarespace"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-4 text-sm text-teal-950">
          <p className="font-medium">Webhook created and secret saved</p>
          <p className="mt-2 font-mono text-xs">
            Subscription id: {success.subscriptionId}
          </p>
          <p className="mt-1 text-xs text-teal-800">
            Topics: {success.topics.join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
