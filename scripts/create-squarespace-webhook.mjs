#!/usr/bin/env node
/**
 * Create a Squarespace webhook subscription and print the secret (show-once).
 *
 * Prerequisites:
 *   - OAuth access token (Bearer) for Webhook Subscriptions — site Developer API keys
 *     are rejected for POST /webhook_subscriptions (401). See:
 *     https://developers.squarespace.com/commerce-apis/webhook-subscriptions-overview
 *     Obtain a token via https://developers.squarespace.com/oauth or set Railway env
 *     SQUARESPACE_WEBHOOK_ACCESS_TOKEN and use the dashboard button instead of this script.
 *   - Your PorcelainVend webhook URL including ?machineId=...
 *
 * Usage:
 *   export SQUARESPACE_API_KEY="your_oauth_access_token_here"
 *   export WEBHOOK_URL="https://your-app.up.railway.app/api/webhooks/squarespace?machineId=clxxx..."
 *   node scripts/create-squarespace-webhook.mjs
 *
 * Optional:
 *   WEBHOOK_TOPICS="order.create,order.update"   (default)
 *
 * Docs: https://developers.squarespace.com/commerce-apis/create-webhook-subscription
 */

const apiKey = process.env.SQUARESPACE_API_KEY?.trim();
const endpointUrl = process.env.WEBHOOK_URL?.trim();
const topicsRaw = process.env.WEBHOOK_TOPICS?.trim();
const topics = topicsRaw
  ? topicsRaw.split(",").map((t) => t.trim()).filter(Boolean)
  : ["order.create", "order.update"];

if (!apiKey || !endpointUrl) {
  console.error(`
Usage:
  SQUARESPACE_API_KEY=... WEBHOOK_URL="https://.../api/webhooks/squarespace?machineId=..." \\
    node scripts/create-squarespace-webhook.mjs

WEBHOOK_URL must be HTTPS and match the URL you will use in production.
`);
  process.exit(1);
}

if (!/^https:\/\//i.test(endpointUrl)) {
  console.error("WEBHOOK_URL must start with https://");
  process.exit(1);
}

const url = "https://api.squarespace.com/1.0/webhook_subscriptions";

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "PorcelainVend/1.0 (create-squarespace-webhook script)",
  },
  body: JSON.stringify({ endpointUrl, topics }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}

if (!res.ok) {
  console.error("Squarespace API error", res.status);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

if (!body.secret) {
  console.error("Unexpected response (no secret field):", JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`
Success. Copy these into PorcelainVend (secret is shown only once by Squarespace):

  Subscription id: ${body.id}
  Webhook secret (hex): ${body.secret}

  Endpoint: ${body.endpointUrl}
  Topics:   ${(body.topics || topics).join(", ")}

Paste the secret into wizard step 3 — Webhook secret (hex).
`);
