# PorcelainVend

Multi-tenant **web-only** smart vending kiosk: owners configure a Squarespace checkout page and SwitchBot unlock; tablets run **full-screen in the browser** (Android kiosk / lock task mode is configured on the device, not in this repo).

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind
- PostgreSQL + Prisma 5
- Auth.js (NextAuth v5) credentials sign-in
- SSE for kiosk live state
- Squarespace webhooks (HMAC-SHA256 on **raw body**) + Orders API
- SwitchBot Open API v1.1 (signed requests)

## Owner flow

1. **Sign up** at `/signup` (business name + email + password).
2. **Add a machine** at `/dashboard/machines/new` (5-step wizard):
   - **Step 1:** Machine name, URL slug, optional theme hex.
   - **Step 2:** Squarespace **HTTPS** store URL, **machine-specific** layout page URL (same domain), and **Commerce API key** (needed to fetch orders after webhooks). Keys are **encrypted at rest**; they are never sent to the browser after save.
   - **Step 3:** Webhook **secret** (hex from Squarespace when you create/rotate the subscription).
   - **Step 4:** SwitchBot token, secret, device ID, optional command (default `press`).
   - **Step 5:** **Kiosk URL**, **webhook URL** (includes `machineId`), on-screen QR, downloadable PNG.
3. In Squarespace, create a **webhook subscription** whose URL is exactly:

   `https://YOUR_DOMAIN/api/webhooks/squarespace?machineId=YOUR_MACHINE_ID`

   Subscribe to **order** events as needed (`order.create` / `order.update`). Each delivery includes `Squarespace-Signature`; this app verifies it with your stored secret and is **idempotent** per notification id.

4. Open the **kiosk URL** on the tablet’s browser in full-screen. Customers scan the large QR (encoding your **stable selection page URL** — we generate the QR ourselves; it does not depend on Squarespace’s layout QR feature).

### QR / URL warning

If you **change the Squarespace page slug** after printing QR codes, old codes still encode the **old** URL and will **404 or go to the wrong page**. Pick a durable slug and treat QR assets as tied to that URL.

## Kiosk URL & tablet

- Kiosk route: `/kiosk/[machineId]` (the `machineId` is the internal id shown in the dashboard after setup).
- **Find it:** machine detail page lists “Kiosk URL”, or Step 5 of the wizard.
- On the Android tablet, open Chrome (or your locked browser), navigate to that URL, and use **full screen** + your MDM / **lock task** / **kiosk** policy so guests cannot leave the page. Android **dedicated device** docs allow pinning a browser or allowlisted apps — configure that outside this app.

## Webhook & payment flow

1. Customer pays on Squarespace (on their phone).
2. Squarespace POSTs JSON to `/api/webhooks/squarespace?machineId=…` with `Squarespace-Signature`.
3. The app verifies HMAC-SHA256 over the **raw body** with the machine’s hex secret, dedupes by notification id, fetches the order via **Orders API**, checks it is payable, calls **SwitchBot** to unlock, writes `OrderEvent` + `AuditLog`, sets `KioskState` to `PAID`, **SSE** updates the tablet, then returns to **`IDLE` after 15s** (best effort on the Node process; for **serverless** you should move the delay to a queue/worker).

## Local development

Prerequisites: Node 20+, PostgreSQL.

```bash
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY (see .env.example)

npm install
npx prisma migrate deploy   # or: npx prisma db push
npm run dev
```

Visit http://localhost:3000 — sign up, create a machine, copy the webhook URL into Squarespace developer settings.

### Generate secrets

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY
```

## Production deployment

- Run **Node** (Docker, Fly, Railway, EC2, etc.) or a platform that supports **long-lived** connections if you rely on in-memory SSE (single-instance) or use a **pub/sub** for multi-instance.
- Set `NEXT_PUBLIC_APP_URL` and `AUTH_URL` to your **public HTTPS** origin so dashboard links and webhook URLs are correct.
- Add PostgreSQL and run `npx prisma migrate deploy` in the release phase.
- Terminate TLS at your reverse proxy; forward `X-Forwarded-Proto` / `X-Forwarded-Host` if you use `getPublicBaseUrl()` fallback from headers.

## Security notes

- SwitchBot credentials and Squarespace API keys are **encrypted** (AES-256-GCM) using `ENCRYPTION_KEY`.
- Webhook verification uses the **raw** request body, not re-stringified JSON.
- **Rate limits** (in-memory): webhook, SSE, heartbeat, kiosk intent endpoints.
- **Unlock test** API requires an authenticated owner session and same-origin `Origin`/`Referer` host match.
- Dashboard routes: **no Edge middleware** (bcrypt is Node-only); protection is via `auth()` in `app/dashboard/layout.tsx`.

## Routes

| Route | Purpose |
|-------|---------|
| `/login`, `/signup` | Owner auth |
| `/dashboard`, `/dashboard/machines`, `/dashboard/machines/new`, `/dashboard/machines/[id]`, `/edit`, `/dashboard/events` | Owner UI |
| `/kiosk/[machineId]` | Full-screen tablet UI |
| `/kiosk/[machineId]/poster` | Printable poster |
| `POST /api/webhooks/squarespace?machineId=` | Squarespace webhook |
| `GET /api/machines/[machineId]/events/stream` | Kiosk SSE |
| `POST /api/machines/[machineId]/unlock-test` | Owner unlock test |
| `POST /api/machines/[machineId]/heartbeat` | Kiosk liveness (health) |
| `GET /api/machines/[machineId]/health` | JSON health |
| `GET /api/machines/[machineId]/qr.png` | QR PNG |

## SwitchBot auth header

Cloud SwitchBot accounts differ: some require `Authorization: <token>` and others `Bearer <token>`. This project sends the **raw token** from the app. If commands fail with `401`, try prepending `Bearer ` in `src/lib/switchbot.ts` to match your account.

## Nice-to-haves (partially included)

- **Poster:** `/kiosk/[machineId]/poster`
- **Theme:** optional hex in wizard → stored on `User.themeColor` (dashboard styling can be extended to use it).
- **PIN settings on kiosk:** schema field `kioskPinHash` reserved; UI not wired in v1.

## License

Private / your deployment — adjust as needed.
