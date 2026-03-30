const SQUARESPACE_WEBHOOKS_URL =
  "https://api.squarespace.com/1.0/webhook_subscriptions";

export type CreateSquarespaceWebhookOk = {
  ok: true;
  id: string;
  secret: string;
  endpointUrl: string;
  topics: string[];
};

export type CreateSquarespaceWebhookErr = {
  ok: false;
  status: number;
  body: unknown;
};

export type CreateSquarespaceWebhookResult =
  | CreateSquarespaceWebhookOk
  | CreateSquarespaceWebhookErr;

export async function createSquarespaceWebhookSubscription(
  apiKey: string,
  endpointUrl: string,
  topics: string[] = ["order.create", "order.update"]
): Promise<CreateSquarespaceWebhookResult> {
  const res = await fetch(SQUARESPACE_WEBHOOKS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "PorcelainVend/1.0 (dashboard webhook)",
    },
    body: JSON.stringify({ endpointUrl, topics }),
  });

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, status: res.status, body: { raw: text } };
  }

  if (!res.ok) return { ok: false, status: res.status, body };

  const secret = typeof body.secret === "string" ? body.secret : "";
  const id = typeof body.id === "string" ? body.id : "";
  if (!secret || !id) {
    return { ok: false, status: res.status, body };
  }

  const endpointOut =
    typeof body.endpointUrl === "string" ? body.endpointUrl : endpointUrl;
  const topicsOut = Array.isArray(body.topics)
    ? body.topics.map(String)
    : topics;

  return {
    ok: true,
    id,
    secret,
    endpointUrl: endpointOut,
    topics: topicsOut,
  };
}
