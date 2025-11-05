### Payments (Stripe) — Frontend Implementation Plan

Goal: Enable users to purchase and manage the Pro subscription using Stripe Checkout and Billing Portal, with payment methods restricted to CARD and BLIK. Keep UI consistent with shadcn/ui and existing `PlanBillingCard`.

---

1) UX/Flows
- Profile → Plan & Billing card:
  - If plan = free → show "Upgrade to Pro" CTA.
  - If plan = pro → show "Manage Billing" CTA (Stripe Billing Portal).
- Checkout:
  - Restrict to CARD or BLIK only.
  - Optionally let user pick preferred method before redirect (defaults to CARD).
- Post-checkout:
  - Redirect back to `/profile?success=true` on success; Toast confirms upgrade.
  - On cancel, return to `/profile` silently.

---

2) Components & Changes
- Reuse `src/components/profile/PlanBillingCard.tsx`:
  - Add a payment method selector (shadcn/ui) shown when plan = free:
    - Radio Group with two options: Card, BLIK.
    - Default selection: Card.
  - When invoking `/api/billing/checkout`, include `{ paymentMethod: 'card' | 'blik' }` in the body.
  - Disable button while loading; preserve existing toasts.
- Manage Billing remains unchanged, calls `/api/billing/portal`.

shadcn/ui suggestions:
- Use `RadioGroup`, `RadioGroupItem`, `Label` under the Upgrade card section.
- Keep layout responsive and accessible.

---

3) API Contracts (Frontend Expectations)
- POST `/api/billing/checkout`
  - Body: `{ successUrl: string, cancelUrl: string, paymentMethod?: 'card' | 'blik' }`
  - Response 200: `{ url: string }`
  - Errors: 401 (not logged in), 502 (Stripe failures)

- POST `/api/billing/portal`
  - Body: `{ returnUrl: string }`
  - Response 200: `{ url: string }`
  - Errors: 401 (not logged in), 400 (no Stripe customer), 502

---

4) State & Data
- `useProfile()` already provides `profile.plan` and `stripe_customer_id` (if exposed via profile service). No additional state management required.
- Show payment method selector only when `profile.plan !== 'pro'`.

---

5) Visual & Copy
- Indicate supported methods: "Supported payment methods: Card and BLIK".
- If BLIK is selected, add a small note: "Checkout will open in Polish (PLN)." (non-blocking hint)
- Keep button labels:
  - Upgrade CTA: "Upgrade to Pro"
  - Manage CTA: "Manage Billing"

---

6) Error Handling
- Reuse existing `sonner` toasts:
  - Upgrade errors: "Failed to start checkout"
  - Portal errors: "Failed to open billing portal"
- Handle `!res.ok` by showing server-provided message when available.

---

7) Analytics/Telemetry (Optional, MVP can skip)
- Track click events for Upgrade and Manage Billing.
- Track successful redirect `?success=true` to confirm conversion.

---

8) Testing Plan
- Unit/component:
  - `PlanBillingCard` renders correct CTAs based on plan.
  - Payment method selector toggles value and passes `paymentMethod` in request body.
  - Loading states and toasts appear as expected.
- E2E (Playwright):
  - Free user → Upgrade opens Checkout URL (mocked) and navigates.
  - Pro user → Manage Billing opens Portal URL (mocked).
  - Ensure selector choice changes endpoint payload.

---

9) Rollout
1. Merge backend changes for `/api/billing/checkout` to accept `paymentMethod` and enforce `card` vs `blik`.
2. Update `PlanBillingCard` to include selector and pass `paymentMethod`.
3. QA against Stripe test mode:
   - Card test numbers.
   - BLIK test flow.
4. Ship to production; verify real Checkout rendering of only the chosen method.


