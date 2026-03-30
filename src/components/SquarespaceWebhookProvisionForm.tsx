"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { provisionSquarespaceWebhook } from "@/app/actions/machines";

export function SquarespaceWebhookProvisionForm({
  machineId,
  webhookUrl,
}: {
  machineId: string;
  webhookUrl: string;
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
        <p>
          Uses an <strong>OAuth access token</strong> after you{" "}
          <strong>Connect Squarespace</strong> above (or{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">
            SQUARESPACE_WEBHOOK_ACCESS_TOKEN
          </code>{" "}
          on the server). Your site Developer API key is still used to{" "}
          <em>load orders</em> after Squarespace notifies this app ; it cannot{" "}
          register webhooks by itself (
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
