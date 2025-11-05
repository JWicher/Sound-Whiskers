### Payments (Stripe) — Backend Implementation Plan

Scope: Implement subscription billing for the Pro plan using Stripe Checkout and Billing Portal with payment methods restricted to CARD and BLIK. Wire up webhooks to keep `profiles.plan` and `profiles.stripe_customer_id` in sync. Align with PRD and API contract.

Runtime: Next.js App Router (Node.js runtime) with Supabase server client.

---

1) Prerequisites
- Stripe account with:
  - Product: "Pro Subscription"
  - Recurring Prices: monthly
    - CARD price (e.g., USD $10/month) → `STRIPE_PRICE_PRO_CARD`
    - BLIK price (PLN monthly equivalent) → `STRIPE_PRICE_PRO_BLIK`
  - Optional: automatic tax enabled at account level; prices set with tax-inclusive behavior per locale.
- Environment variables in `.env.local`:
  - `STRIPE_SECRET_KEY` (exists)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (exists)
  - `STRIPE_PRICE_PRO_CARD` (price_... for card, currency typically USD)
  - `STRIPE_PRICE_PRO_BLIK` (price_... for BLIK, currency PLN)
  - `STRIPE_WEBHOOK_SECRET` (from Stripe CLI/dashboard endpoint configuration)
  - `NEXT_PUBLIC_APP_URL` (e.g., https://localhost:3000 or prod domain) used for URL sanitization fallback

Notes:
- BLIK requires PLN currency. Keep separate Prices for CARD (USD) and BLIK (PLN). This avoids Checkout errors and keeps currency rules correct.
- We will restrict accepted payment method types to only `card` or `blik` per session.

---

2) Database
- Table `profiles` already includes: `plan plan_type` (free/pro) and `stripe_customer_id text`.
- Add table for webhook idempotency:
  - `stripe_events`:
    - `id text primary key` (Stripe event id)
    - `created_at timestamptz not null default now()`
- Index (optional): `create index on profiles (stripe_customer_id)` to speed up lookups.

RLS: Keep default RLS on `profiles`. `stripe_events` can remain with RLS disabled or service-role only; it’s server-only usage via webhooks.

---

3) API Endpoints

3.1) POST /api/billing/checkout
- Auth required. Node.js runtime.
- Request: `{ successUrl: string, cancelUrl: string, paymentMethod?: 'card' | 'blik' }`
  - `paymentMethod` optional; default to `'card'` for global compatibility.
- Behavior:
  1. Get authenticated user via Supabase server client (`/src/lib/supabase/server.ts`). If no user → 401.
  2. Load user profile; read `stripe_customer_id`.
     - If missing, create Stripe Customer with `email`, `metadata: { user_id }` and persist `stripe_customer_id` in DB.
  3. Determine target price id:
     - if `paymentMethod === 'blik'` → `STRIPE_PRICE_PRO_BLIK`
     - else → `STRIPE_PRICE_PRO_CARD`
  4. Build Stripe Checkout Session with:
     - `mode: 'subscription'`
     - `customer: <profiles.stripe_customer_id>`
     - `line_items: [{ price: <chosen price id>, quantity: 1 }]`
     - `payment_method_types: ['blik']` when blik selected; otherwise `['card']`
     - `allow_promotion_codes: false` (MVP)
     - `automatic_tax: { enabled: true }` (if account configured)
     - `locale: 'pl'` when blik, otherwise `'auto'`
     - `success_url` and `cancel_url`: sanitize against `NEXT_PUBLIC_APP_URL` origin; fall back to `${NEXT_PUBLIC_APP_URL}/profile` if invalid/missing
     - `metadata: { user_id }`
  5. Return `{ url: session.url }` on 200.

Errors:
- 401 when unauthenticated.
- 502 when Stripe error creating Session.

Security/Validation:
- Sanitize/validate `successUrl` and `cancelUrl` origins to prevent open redirects.
- Only allow `card`/`blik` for `payment_method_types`.

3.2) POST /api/billing/portal
- Auth required. Node.js runtime.
- Request: `{ returnUrl: string }`
- Behavior:
  1. Get authenticated user.
  2. Require `profiles.stripe_customer_id`. If missing → 400 with actionable message (user must complete checkout first).
  3. Create Billing Portal session via `stripe.billingPortal.sessions.create({ customer, return_url })` with sanitized `returnUrl`.
  4. Return `{ url }`.

Errors:
- 401 unauthenticated.
- 400 when no `stripe_customer_id` is found.
- 502 Stripe errors.

3.3) POST /api/webhooks/stripe
- No auth. Node.js runtime; raw body handling required.
- Behavior:
  1. Read raw body `await request.text()`; get signature from `headers.get('stripe-signature')`.
  2. Verify event with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.
  3. Idempotency: upsert event id into `stripe_events`. If exists → respond 200 immediately (already processed).
  4. Handle events:
     - `checkout.session.completed`: set `profiles.stripe_customer_id` (if not already), and set `plan = 'pro'` for the session's customer.
     - `customer.subscription.updated`:
       - If `status` in ['active'] → `plan = 'pro'`.
       - If `status` in ['canceled', 'incomplete_expired'] → `plan = 'free'`.
       - For `past_due` or `unpaid`: keep `pro` until Stripe cancels at period end (per PRD: downgrade at renewal if unpaid).
     - `customer.subscription.deleted`: set `plan = 'free'`.
     - `invoice.payment_failed`: no immediate change; optionally log for support.
  5. Always return 200 quickly after DB updates.

Errors:
- 400 INVALID_SIGNATURE when signature verification fails.
- 409 IDEMPOTENCY_CONFLICT when we detect duplicated processing (if using a unique constraint, just return 200 early).

Implementation Notes:
- Export `export const runtime = 'nodejs'` in all three routes.
- Use the Supabase server client from `/src/lib/supabase/server.ts`.
- Avoid logging PII. Log only event ids and subscription/customer ids.

---

4) Configuration & Secrets
- Set `.env.local`:
  - `STRIPE_SECRET_KEY=sk_live_or_test_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...`
  - `STRIPE_PRICE_PRO_CARD=price_...` (USD monthly)
  - `STRIPE_PRICE_PRO_BLIK=price_...` (PLN monthly)
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000` (or production URL)

---

5) Testing Plan
- Unit tests (Vitest):
  - `checkout` happy path and failures (401, 502). Verify correct `payment_method_types` and chosen price mapping.
  - `portal` happy path and failures (401, 400, 502).
  - Helper utilities for URL origin validation.
- Webhook integration tests:
  - Use Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) in dev.
  - Simulate events: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`.
  - Verify DB updates to `profiles` and event idempotency.
- E2E smoke (Playwright):
  - Clicking Upgrade opens Stripe Checkout URL.
  - Manage Billing opens Portal URL (for users with `stripe_customer_id`).

---

6) Rate Limiting & Timeouts
- Apply simple per-user rate limiting on `checkout`/`portal` endpoints.
- Timeouts: 25s for these API calls (external dependency).

---

7) Rollout Steps
1. Create Product and two Prices (USD card, PLN blik). Ensure prices are tax-inclusive or enable automatic tax.
2. Add secrets to environment in all environments.
3. Implement endpoints and webhook, create `stripe_events` table migration.
4. Test locally with Stripe test keys and CLI; validate both payment methods; check webhook-driven plan changes.
5. Deploy to staging; repeat tests with staging webhook secret.
6. Update production webhook endpoint + secret; promote.

---

8) Operational Notes
- Default new users to `free` (already in schema).
- Downgrade happens when Stripe cancels a subscription (no proration, per PRD).
- If `portal` called without a customer, guide user to start checkout first.


