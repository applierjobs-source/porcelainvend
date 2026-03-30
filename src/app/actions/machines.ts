"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import {
  assertSelectionOnStore,
  httpsUrl,
  slugSchema,
} from "@/lib/url-rules";
import { logAudit } from "@/lib/audit";
import { getPublicBaseUrl } from "@/lib/public-url";
import { createSquarespaceWebhookSubscription } from "@/lib/squarespace-webhook-subscription";
import {
  fetchSwitchBotDevices,
  type SwitchBotDeviceRow,
} from "@/lib/switchbot";
import { resolveSquarespaceWebhookBearerToken } from "@/lib/squarespace-oauth-machine";

const machineBase = z.object({
  machineName: z.string().min(1).max(120),
  machineSlug: slugSchema,
  squarespaceStoreUrl: httpsUrl,
  squarespaceSelectionPageUrl: httpsUrl,
  squarespaceWebhookSecret: z.string().optional(),
  squarespaceCommerceApiKey: z.string().min(10),
  switchbotToken: z.string().min(4),
  switchbotSecret: z.string().min(4),
  switchbotDeviceId: z.string().min(4),
  switchbotCommand: z.string().optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
});

export type CreateMachineInput = z.infer<typeof machineBase>;

export async function createMachine(
  input: CreateMachineInput
): Promise<{ ok: true; machineId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const parsed = machineBase.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const data = parsed.data;
  const secretRaw = (data.squarespaceWebhookSecret ?? "").trim();
  let squarespaceWebhookSecret: string | null = null;
  if (secretRaw) {
    if (secretRaw.length < 16 || !/^[0-9a-fA-F]+$/.test(secretRaw)) {
      return {
        ok: false,
        error:
          "Webhook secret must be at least 16 hexadecimal characters, or leave it blank and create the webhook from the machine page after saving.",
      };
    }
    squarespaceWebhookSecret = secretRaw;
  }

  try {
    assertSelectionOnStore(
      data.squarespaceStoreUrl,
      data.squarespaceSelectionPageUrl
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "URL validation failed",
    };
  }

  try {
    const m = await prisma.machine.create({
      data: {
        userId: session.user.id,
        machineName: data.machineName,
        machineSlug: data.machineSlug,
        squarespaceStoreUrl: data.squarespaceStoreUrl,
        squarespaceSelectionPageUrl: data.squarespaceSelectionPageUrl,
        squarespaceWebhookSecret,
        squarespaceCommerceApiKeyEnc: encryptSecret(
          data.squarespaceCommerceApiKey.trim()
        ),
        switchbotTokenEnc: encryptSecret(data.switchbotToken.trim()),
        switchbotSecretEnc: encryptSecret(data.switchbotSecret.trim()),
        switchbotDeviceId: data.switchbotDeviceId.trim(),
        switchbotCommand: data.switchbotCommand?.trim() || "press",
      },
    });

    await prisma.kioskState.create({
      data: { machineId: m.id, state: "IDLE", message: "" },
    });

    if (data.themeColor) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { themeColor: data.themeColor },
      });
    }

    logAudit(m.id, "machine_created", { slug: m.machineSlug });
    revalidatePath("/dashboard/machines");
    return { ok: true, machineId: m.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "You already have a machine with this slug" };
    }
    return { ok: false, error: msg };
  }
}

export async function updateMachine(
  machineId: string,
  patch: Partial<
    Pick<
      CreateMachineInput,
      | "machineName"
      | "squarespaceStoreUrl"
      | "squarespaceSelectionPageUrl"
      | "squarespaceCommerceApiKey"
      | "switchbotToken"
      | "switchbotSecret"
      | "switchbotDeviceId"
      | "switchbotCommand"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const existing = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Not found" };

  try {
    const nextStore = patch.squarespaceStoreUrl ?? existing.squarespaceStoreUrl;
    const nextSel =
      patch.squarespaceSelectionPageUrl ??
      existing.squarespaceSelectionPageUrl;
    assertSelectionOnStore(nextStore, nextSel);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "URL validation failed",
    };
  }

  const data: Prisma.MachineUpdateInput = {};
  if (patch.machineName) data.machineName = patch.machineName;
  if (patch.squarespaceStoreUrl)
    data.squarespaceStoreUrl = patch.squarespaceStoreUrl;
  if (patch.squarespaceSelectionPageUrl)
    data.squarespaceSelectionPageUrl = patch.squarespaceSelectionPageUrl;
  if (patch.squarespaceCommerceApiKey)
    data.squarespaceCommerceApiKeyEnc = encryptSecret(
      patch.squarespaceCommerceApiKey.trim()
    );
  if (patch.switchbotToken)
    data.switchbotTokenEnc = encryptSecret(patch.switchbotToken.trim());
  if (patch.switchbotSecret)
    data.switchbotSecretEnc = encryptSecret(patch.switchbotSecret.trim());
  if (patch.switchbotDeviceId)
    data.switchbotDeviceId = patch.switchbotDeviceId.trim();
  if (patch.switchbotCommand !== undefined)
    data.switchbotCommand = patch.switchbotCommand.trim() || "press";

  await prisma.machine.update({
    where: { id: machineId },
    data,
  });
  logAudit(machineId, "machine_updated", { fields: Object.keys(patch) });
  revalidatePath("/dashboard/machines");
  revalidatePath(`/dashboard/machines/${machineId}`);
  return { ok: true };
}

function squarespaceApiErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  if (body && typeof body === "object" && "errors" in body) {
    const e = (body as { errors?: unknown }).errors;
    if (Array.isArray(e) && e.length) return JSON.stringify(e);
  }
  try {
    return JSON.stringify(body);
  } catch {
    return `HTTP ${status}`;
  }
}

/** Calls Squarespace Commerce API to register this machine’s webhook URL and saves the returned secret. */
export async function provisionSquarespaceWebhook(
  machineId: string
): Promise<
  | {
      ok: true;
      subscriptionId: string;
      endpointUrl: string;
      topics: string[];
    }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!machine) return { ok: false, error: "Not found" };

  let bearerToken: string;
  try {
    bearerToken = await resolveSquarespaceWebhookBearerToken(machine);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error:
        msg.includes("OAuth is not configured") || msg.includes("not connected")
          ? `${msg} Connect Squarespace on this machine’s page (or set SQUARESPACE_WEBHOOK_ACCESS_TOKEN), then try again.`
          : msg.includes("ENCRYPTION_KEY") || msg.includes("invalid ciphertext")
            ? "Could not read stored Squarespace credentials. Re-save your Commerce API key under Edit settings, or reconnect Squarespace OAuth."
            : msg,
    };
  }

  const baseUrl = await getPublicBaseUrl();
  const endpointUrl = `${baseUrl}/api/webhooks/squarespace?machineId=${machine.id}`;

  if (!/^https:\/\//i.test(endpointUrl)) {
    return {
      ok: false,
      error:
        "Webhook URL must use HTTPS. Set NEXT_PUBLIC_APP_URL (or AUTH_URL) to your public https:// site URL on Railway.",
    };
  }

  const result = await createSquarespaceWebhookSubscription(
    bearerToken,
    endpointUrl
  );

  if (!result.ok) {
    const apiMsg = squarespaceApiErrorMessage(result.status, result.body);
    let suffix = "";
    if (result.status === 401) {
      const combined = `${apiMsg} ${JSON.stringify(result.body)}`.toLowerCase();
      if (combined.includes("oauth")) {
        suffix =
          " Use “Connect Squarespace” on this page first (OAuth), or set SQUARESPACE_WEBHOOK_ACCESS_TOKEN. The site Developer API key alone cannot register webhooks. https://developers.squarespace.com/commerce-apis/webhook-subscriptions-overview";
      }
    }
    return {
      ok: false,
      error: `Squarespace API (${result.status}): ${apiMsg}${suffix}`,
    };
  }

  await prisma.machine.update({
    where: { id: machineId },
    data: { squarespaceWebhookSecret: result.secret },
  });

  logAudit(machineId, "squarespace_webhook_provisioned", {
    subscriptionId: result.id,
  });
  revalidatePath(`/dashboard/machines/${machineId}`);
  return {
    ok: true,
    subscriptionId: result.id,
    endpointUrl: result.endpointUrl,
    topics: result.topics,
  };
}

export async function rotateWebhookSecret(
  machineId: string,
  newSecret: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const hex = z
    .string()
    .min(16)
    .regex(/^[0-9a-fA-F]+$/);

  const p = hex.safeParse(newSecret.trim());
  if (!p.success) return { ok: false, error: "Secret must be hexadecimal" };

  const existing = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Not found" };

  await prisma.machine.update({
    where: { id: machineId },
    data: { squarespaceWebhookSecret: p.data },
  });
  logAudit(machineId, "webhook_secret_rotated", {});
  revalidatePath(`/dashboard/machines/${machineId}`);
  return { ok: true };
}

export async function disconnectSquarespaceOAuth(
  machineId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const existing = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Not found" };

  await prisma.machine.update({
    where: { id: machineId },
    data: {
      squarespaceOAuthRefreshTokenEnc: null,
      squarespaceOAuthAccessTokenEnc: null,
      squarespaceOAuthAccessExpiresAt: null,
    },
  });
  logAudit(machineId, "squarespace_oauth_disconnected", {});
  revalidatePath(`/dashboard/machines/${machineId}`);
  return { ok: true };
}

export async function setMachineActive(
  machineId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const existing = await prisma.machine.findFirst({
    where: { id: machineId, userId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Not found" };

  await prisma.machine.update({
    where: { id: machineId },
    data: { isActive },
  });
  logAudit(machineId, isActive ? "machine_enabled" : "machine_disabled", {});
  revalidatePath("/dashboard/machines");
  revalidatePath(`/dashboard/machines/${machineId}`);
  return { ok: true };
}

/** Resolve token/secret from overrides or saved machine; call SwitchBot device list. */
export async function listSwitchBotDevicesAction(
  machineId: string | null,
  tokenOverride: string,
  secretOverride: string
): Promise<
  | { ok: true; devices: SwitchBotDeviceRow[] }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const to = tokenOverride.trim();
  const so = secretOverride.trim();

  let token: string;
  let secret: string;

  if (to && so) {
    token = to;
    secret = so;
  } else if (machineId) {
    const machine = await prisma.machine.findFirst({
      where: { id: machineId, userId: session.user.id },
    });
    if (!machine) return { ok: false, error: "Machine not found" };
    try {
      token = decryptSecret(machine.switchbotTokenEnc);
      secret = decryptSecret(machine.switchbotSecretEnc);
    } catch {
      return {
        ok: false,
        error:
          "Enter SwitchBot token and secret in the form, then try again (or save them first).",
      };
    }
  } else {
    return {
      ok: false,
      error: "Enter your SwitchBot token and secret above, then click look up again.",
    };
  }

  const r = await fetchSwitchBotDevices(token, secret);
  if (!r.ok) {
    return { ok: false, error: r.error };
  }
  return { ok: true, devices: r.devices };
}
