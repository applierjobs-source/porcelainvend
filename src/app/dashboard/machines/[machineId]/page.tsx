import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/public-url";
import { UnlockTestButton } from "@/components/UnlockTestButton";
import { MachineDisableForm } from "@/components/MachineDisableForm";
import { SecretRotateForm } from "@/components/SecretRotateForm";
import { SquarespaceWebhookProvisionForm } from "@/components/SquarespaceWebhookProvisionForm";
import { SquarespaceOAuthPanel } from "@/components/SquarespaceOAuthPanel";
import { isSquarespaceOAuthConfigured } from "@/lib/squarespace-oauth";
import { canProvisionSquarespaceWebhookViaApi } from "@/lib/squarespace-oauth-machine";

export default async function MachineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ machineId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { machineId } = await params;
  const sp = (await searchParams) ?? {};
  const oauthFlash =
    typeof sp.squarespace_oauth === "string" ? sp.squarespace_oauth : undefined;
  const detailRaw = sp.detail;
  const oauthDetail = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
    include: {
      kioskState: true,
      orderEvents: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!machine) notFound();

  const baseUrl = await getPublicBaseUrl();
  const kioskUrl = `${baseUrl}/kiosk/${machine.id}`;
  const webhookUrl = `${baseUrl}/api/webhooks/squarespace?machineId=${machine.id}`;
  const healthUrl = `${baseUrl}/api/machines/${machine.id}/health`;
  const posterUrl = `${baseUrl}/kiosk/${machine.id}/poster`;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {machine.machineName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Slug <span className="font-mono">{machine.machineSlug}</span>
            {!machine.isActive ? (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                disabled
              </span>
            ) : null}
          </p>
        </div>
        <Link
          href={`/dashboard/machines/${machine.id}/edit`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Edit settings
        </Link>
      </div>

      {!machine.squarespaceWebhookSecret ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Webhook signing secret not set.</strong> Squarespace
          deliveries will be rejected until you use{" "}
          <strong>Create webhook in Squarespace</strong> below (or paste a
          secret under Rotate webhook secret).
        </div>
      ) : null}

      {oauthFlash === "connected" ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <strong>Squarespace connected.</strong> Use{" "}
          <strong>Create webhook in Squarespace</strong> below to register your
          endpoint and save the signing secret.
        </div>
      ) : null}
      {oauthFlash === "denied" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Squarespace authorization was cancelled or denied
          {typeof oauthDetail === "string" && oauthDetail
            ? `: ${oauthDetail}`
            : "."}
        </div>
      ) : null}
      {oauthFlash === "token" && typeof oauthDetail === "string" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <strong>Could not complete Squarespace connection.</strong>{" "}
          {oauthDetail}
        </div>
      ) : null}
      {oauthFlash === "invalid" || oauthFlash === "state" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          OAuth session expired or was invalid. Try connecting again.
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Kiosk &amp; webhook
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-zinc-700">Kiosk URL</dt>
            <dd className="mt-1 break-all font-mono text-xs text-zinc-900">
              {kioskUrl}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Webhook URL</dt>
            <dd className="mt-1 break-all font-mono text-xs text-zinc-900">
              {webhookUrl}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Selection page (QR target)</dt>
            <dd className="mt-1 break-all text-xs text-zinc-900">
              {machine.squarespaceSelectionPageUrl}
            </dd>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="text-teal-700 underline"
              href={`${baseUrl}/api/machines/${machine.id}/qr.png`}
              download
            >
              Download QR PNG
            </a>
            <Link className="text-teal-700 underline" href={posterUrl}>
              Printable poster
            </Link>
            <a className="text-teal-700 underline" href={healthUrl} target="_blank" rel="noreferrer">
              Health JSON
            </a>
          </div>
        </dl>
        <div className="mt-8 border-t border-zinc-100 pt-8 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-800">
              Squarespace account (OAuth)
            </h3>
            <div className="mt-3">
              <SquarespaceOAuthPanel
                machineId={machine.id}
                oauthConfigured={isSquarespaceOAuthConfigured()}
                oauthConnected={Boolean(machine.squarespaceOAuthRefreshTokenEnc)}
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-800">
              Create webhook (browser)
            </h3>
            <div className="mt-3">
              <SquarespaceWebhookProvisionForm
                machineId={machine.id}
                webhookUrl={webhookUrl}
                autoProvisionAvailable={canProvisionSquarespaceWebhookViaApi(
                  machine
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Operations
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <UnlockTestButton machineId={machine.id} />
          <MachineDisableForm
            machineId={machine.id}
            isActive={machine.isActive}
          />
        </div>
        <div className="mt-6 border-t border-zinc-100 pt-6">
          <h3 className="text-sm font-medium text-zinc-800">Rotate webhook secret</h3>
          <p className="mt-1 text-xs text-zinc-500">
            After rotating in Squarespace, paste the new hex secret here.
          </p>
          <div className="mt-3 max-w-md">
            <SecretRotateForm machineId={machine.id} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Last kiosk state
        </h2>
        <p className="mt-2 font-mono text-sm text-zinc-900">
          {machine.kioskState?.state ?? "IDLE"}{" "}
          {machine.kioskState?.message
            ? `— ${machine.kioskState.message}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Last seen:{" "}
          {machine.kioskState?.lastSeenAt?.toISOString() ?? "never"}
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recent order events
        </h2>
        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {machine.orderEvents.length === 0 ? (
            <li className="py-3 text-zinc-500">No events yet.</li>
          ) : (
            machine.orderEvents.map((ev) => (
              <li key={ev.id} className="py-3">
                <div className="font-mono text-xs text-zinc-800">
                  {ev.externalOrderId} · {ev.webhookEventType}
                </div>
                <div className="text-xs text-zinc-500">
                  {ev.paymentStatus} · unlock:{" "}
                  {ev.unlockTriggered ? "yes" : "no"} ·{" "}
                  {ev.createdAt.toISOString()}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
