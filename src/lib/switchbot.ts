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

    return { ok: true, statusCode: res.status, body: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
