import crypto from "crypto";

const BASE = "https://api.switch-bot.com/v1.1";

function switchbotSign(token: string, secret: string): {
  t: string;
  nonce: string;
  signature: string;
} {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const data = token + t + nonce;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(data, "utf8"))
    .digest("base64");
  return { t, nonce, signature };
}

export type SwitchBotResult =
  | { ok: true; statusCode: number; body: unknown }
  | { ok: false; error: string; statusCode?: number };

export type SwitchBotDeviceRow = {
  deviceId: string;
  deviceName: string;
  deviceType: string;
};

/**
 * Lists cloud-visible devices (deviceId is what you paste into PorcelainVend).
 */
export async function fetchSwitchBotDevices(
  token: string,
  secret: string
): Promise<
  | { ok: true; devices: SwitchBotDeviceRow[] }
  | { ok: false; error: string; statusCode?: number }
> {
  const { t, nonce, signature } = switchbotSign(token, secret);
  try {
    const res = await fetch(`${BASE}/devices`, {
      method: "GET",
      headers: {
        Authorization: token,
        t,
        nonce,
        sign: signature,
      },
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    const envelope = parsed as {
      statusCode?: number;
      message?: string;
      body?: { deviceList?: unknown[] };
    };

    if (!res.ok) {
      return {
        ok: false,
        statusCode: res.status,
        error: `SwitchBot HTTP ${res.status}: ${String(text).slice(0, 200)}`,
      };
    }

    if (envelope.statusCode !== 100) {
      const msg = envelope.message ?? `statusCode ${envelope.statusCode ?? "?"}`;
      return { ok: false, error: `SwitchBot: ${msg}` };
    }

    const rawList = envelope.body?.deviceList ?? [];
    const devices: SwitchBotDeviceRow[] = [];
    for (const row of rawList) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const deviceId = typeof r.deviceId === "string" ? r.deviceId : "";
      if (!deviceId) continue;
      devices.push({
        deviceId,
        deviceName: typeof r.deviceName === "string" ? r.deviceName : "(unnamed)",
        deviceType: typeof r.deviceType === "string" ? r.deviceType : "Unknown",
      });
    }

    return { ok: true, devices };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Sends a command to a SwitchBot device (default `press` for Bot / relay-style unlock).
 */
export async function unlockDevice(
  deviceId: string,
  token: string,
  secret: string,
  command: string = "press"
): Promise<SwitchBotResult> {
  const { t, nonce, signature } = switchbotSign(token, secret);
  const url = `${BASE}/devices/${encodeURIComponent(deviceId)}/commands`;
  const body = JSON.stringify({
    command,
    parameter: "default",
    commandType: "command",
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        // SwitchBot samples vary; app-generated tokens work as raw Bearer secrets.
        Authorization: token,
        "Content-Type": "application/json; charset=utf8",
        t,
        nonce,
        sign: signature,
      },
      body,
    });

    let parsed: unknown = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      return {
        ok: false,
        statusCode: res.status,
        error: `SwitchBot HTTP ${res.status}: ${String(text).slice(0, 200)}`,
      };
    }

    const envelope = parsed as {
      statusCode?: number;
      message?: string;
    };
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      typeof envelope.statusCode !== "number"
    ) {
      return {
        ok: false,
        error: `SwitchBot: unexpected response: ${String(text).slice(0, 200)}`,
      };
    }

    if (envelope.statusCode !== 100) {
      const msg = envelope.message ?? `statusCode ${envelope.statusCode}`;
      return {
        ok: false,
        statusCode: envelope.statusCode,
        error: `SwitchBot: ${msg}`,
      };
    }

    // statusCode 100 means the cloud accepted the command; device execution can still fail
    // (range, hub offline, wrong command for device type). Check hardware if issues persist.
    return { ok: true, statusCode: envelope.statusCode, body: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
