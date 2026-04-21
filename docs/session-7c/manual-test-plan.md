# Session 7c — Manual Test Plan

**Companion to the automated suite at `tests/e2e/vault-lapse.spec.ts`.**

The automated suite covers 15 scenarios — guard matrix, banner variants, restore screen copy, voluntary cancellation routing — by seeding `subscriptions` rows directly in Supabase and asserting redirect/render behavior against a dev server on port 3100.

These manual scenarios cover what Playwright can't automate reliably:
- Real Stripe Checkout UI (external domain, form fields in iframes, captcha risk)
- Customer Portal UI (external domain)
- Stripe-side event orchestration

Run this checklist **after** the automated suite passes and before flipping `VAULT_STRIPE_ENABLED=true` in production.

---

## Setup

1. `.env.local`:
   - `VAULT_STRIPE_ENABLED=true`
   - `STRIPE_WEBHOOK_SECRET` = whatever the currently-running `stripe listen` is printing
   - Restart dev server after any env change
2. `stripe listen --forward-to localhost:3100/api/stripe/webhook` running in a dedicated terminal
3. Stripe Dashboard open in test mode, in another tab
4. Supabase Studio open, focused on the `subscriptions` and `profiles` tables
5. Two browser windows: one logged in as your test account, one for the Stripe Dashboard
6. The Playwright test account (`playwright@essence-test.local`) should work; it has a profile row and can sign in via `/dev/test-auth` if needed, though manual testing through the magic-link flow is fine too

## Test cards (Stripe official)

| Card | Behavior |
|---|---|
| `4242 4242 4242 4242` | Happy path, succeeds always |
| `4000 0000 0000 0002` | Generic decline at checkout |
| `4000 0000 0000 9995` | Insufficient funds (decline at checkout) |
| `4000 0000 0000 0341` | Succeeds at checkout; declines on first renewal |
| `4000 0000 0000 3220` | 3D Secure required |

Any future expiry, any 3-digit CVC, any 5-digit zip.

---

## Happy path scenarios (1–2)

### Scenario 1 — fresh monthly trial
- **Setup:** user with `status='none'` or no subscription row
- **Action:** `/app/vault/reveal` → protect → pick monthly → Checkout → `4242` card → submit
- **Verify:**
  - Stripe Dashboard: Customer created, Subscription `trialing`, trial ends ~7d out
  - Supabase `subscriptions`: row with `status='trial'`, `billing_period='monthly'`, `last_failed_attempt_count=0`, correct `price_amount_cents`
  - App: lands on `/app/vault/sealed?session_id=cs_test_...`, seal animation plays

### Scenario 2 — fresh annual trial
- **Setup:** clean test user
- **Action:** same as Scenario 1 but pick annual
- **Verify:** Supabase row has `billing_period='annual'`, `price_amount_cents` matches annual price

---

## Decline scenarios (3–5)

### Scenario 3 — generic decline
- **Action:** checkout with `4000 0000 0000 0002`
- **Verify:**
  - Stripe shows decline error inline on the hosted page
  - No webhook fires (Stripe never created a subscription)
  - No `subscriptions` row inserted
  - User remains on `checkout.stripe.com`

### Scenario 4 — insufficient funds
- Same as Scenario 3 but use `4000 0000 0000 9995`

### Scenario 5 — 3D Secure challenge
- **Action:** checkout with `4000 0000 0000 3220`
- **Verify:** Stripe presents 3DS challenge modal. Click "Complete authentication." Flow completes. Subscription row created with `status='trial'`.

---

## Trial → active transition (6)

### Scenario 6 — trial ends, renewal succeeds
- **Setup:** subscription currently in `status='trial'`
- **Action:** Stripe Dashboard → Subscriptions → find sub → Actions → "End trial"
- **Verify:**
  - Webhook fires `customer.subscription.updated`
  - Supabase row updates to `status='active'`
  - App: `/app/vault/reveal` redirects to `/app/record` (automated suite already covers this; verify once end-to-end with real data)
  - No banner on `/app/record`

---

## Banner + renewal failure progression (7–10)

Running these live (vs. relying on the automated DB-seeded versions) verifies that `stripe trigger` + our webhook chain updates `last_failed_attempt_count` correctly.

### Scenario 7 — first failed retry → Banner Variant 1
- **Setup:** subscription with `status='active'`, attached payment method `4000 0000 0000 0341`
- **Action:** Stripe CLI: `stripe trigger invoice.payment_failed`
- **Verify:**
  - Supabase: `status='past_due'`, `last_failed_attempt_count=1`
  - `/app/record`: Banner Variant 1 ("Your card didn't go through this time.")

### Scenario 8 — second failed retry → Banner Variant 2
- **Action:** `stripe trigger invoice.payment_failed` again
- **Verify:** `last_failed_attempt_count=2`; Banner Variant 2 renders

### Scenario 9 — third failed retry → Banner Variant 3
- **Action:** `stripe trigger invoice.payment_failed` one more time
- **Verify:** `last_failed_attempt_count=3`; Banner Variant 3 ("One more attempt before your vault pauses.")

### Scenario 10 — fourth attempt → subscription deleted → restore screen
- **Action:** Either wait for Smart Retries to fire the 4th attempt, OR in Stripe Dashboard cancel the subscription with reason "payment failure", OR `stripe trigger customer.subscription.deleted` with `cancellation_details.reason='payment_failed'`
- **Verify:**
  - Supabase: `status='lapsed'` (NOT `cancelled`), `cancelled_at` populated
  - `/app/record`: banner gone (no longer `past_due`)
  - `/app/vault/reveal`: redirects to `/app/vault/restore`
  - `/app/vault/restore`: renders with correct body copy based on whether the user has any `training_clips`

---

## Customer Portal scenarios (11–13)

### Scenario 11 — Portal features match our config
- **Setup:** any user with a `stripe_customer_id` (i.e., completed checkout at least once)
- **Action:** tap any banner CTA or the restore CTA → new tab opens at `billing.stripe.com`
- **Verify:**
  - "Payment methods" section is visible
  - "Cancel subscription" button is NOT visible
  - Return URL (when you click "Return to ESSENCE") points back to `/app/vault/restore`

### Scenario 12 — update card from banner (past_due → active)
- **Setup:** user in `status='past_due'`, banner showing
- **Action:** click banner CTA → Portal → replace card with `4242` → click "Return to ESSENCE"
- **Known behavior:**
  - New payment method attached, marked default
  - Stripe does NOT auto-retry the failed invoice — either wait for next scheduled retry or manually trigger from Dashboard
  - Once next retry succeeds, webhook fires, `subscriptions.status` flips back to `active`
  - Banner persists in the meantime (acceptable — cadence is a few days in test mode)

### Scenario 13 — update card from restore (lapsed) — KNOWN LIMITATION
- **Setup:** user in `status='lapsed'`, on `/app/vault/restore`
- **Action:** "Bring my vault back" → Portal → update card → Return
- **Known limitation:** updating the card does NOT auto-resurrect a deleted subscription. Stripe doesn't re-create deleted subs. Lands back on `/app/vault/restore` with status still `lapsed`.
- **Follow-up:** the restore screen needs a "start a new subscription" CTA for lapsed users. Currently the Portal handoff only fully resolves `past_due`, not `lapsed`. See open questions in the 7c spec.

---

## Idempotency + out-of-order (14–15)

### Scenario 14 — duplicate event delivery
- **Action:** in the `stripe listen` terminal, find a recent `checkout.session.completed` event ID. Run `stripe events resend <id>`.
- **Verify:**
  - Webhook processes successfully (200 response)
  - No duplicate `subscriptions` row (upsert hits `onConflict: stripe_subscription_id`)
  - No change in existing row data

### Scenario 15 — out-of-order delivery
- **Action:** `stripe trigger customer.subscription.updated` THEN `stripe trigger checkout.session.completed` (these are separate mock events but exercise the handler flow)
- **Verify:**
  - Both return 200
  - No FK violations (7b.1's defensive profile upsert handles this)
  - No duplicate rows

---

## Things the automated suite already verifies (don't re-test manually)

- Guard matrix across all 6 subscription statuses
- Banner variant selection by `last_failed_attempt_count`
- Restore screen copy branching (has/no recordings)
- `/app/vault/restore` redirects for `trial`, `active`, `none` statuses
- Voluntary cancellation routing to `/restore`

---

## Sign-off checklist

Before flipping `VAULT_STRIPE_ENABLED=true` in production:

- [ ] Automated suite passes on `main` (`PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test vault-lapse`)
- [ ] All 15 manual scenarios above execute as described
- [ ] Stripe Dashboard → Customer Portal configured with payment update ON, cancel OFF
- [ ] Stripe Dashboard → Smart Retries set to 4 attempts
- [ ] Production webhook URL registered (separate 7d pre-flight session)
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel to the **production** webhook's signing secret (not the local `whsec_` from `stripe listen`)
- [ ] Production price IDs verified live in Vercel env
- [ ] Support email placeholder resolved (if restore screen support line is enabled)

Ship only after the above is green.
