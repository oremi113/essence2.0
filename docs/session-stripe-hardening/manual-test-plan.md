# Manual test plan — Stripe lifecycle (test mode)

Owner-run. Requires `stripe listen --forward-to localhost:3100/api/stripe/webhook`
and `VAULT_STRIPE_ENABLED=true` in `.env.local`. Smart Retries set to 4 attempts
(per Session 7c Prereq A). After each step, inspect the `subscriptions` row in
Supabase Studio.

The automated suite (`tests/unit/stripe-webhook-handlers.test.ts`) already pins
the handler logic; this plan confirms the real Stripe → webhook → DB round-trip.

| # | Action | Expected `subscriptions` state |
|---|--------|--------------------------------|
| 1 | Complete checkout with test card `4242 4242 4242 4242` | one row, `status=trial`, `trial_ends_at` set, `last_failed_attempt_count=0` |
| 2 | In Stripe Dashboard, end the trial now (or `stripe trigger` the period advance) so the first charge succeeds | `status=active`, counter still `0` |
| 3 | Swap the card to the always-fail test card `4000 0000 0000 0341`, then force the renewal invoice to fail | `status=past_due`, `last_failed_attempt_count=1` |
| 4 | Let Smart Retries fire attempt 2 (or replay `invoice.payment_failed` with `attempt_count=2`) | `status=past_due`, `last_failed_attempt_count=2` |
| 5 | Update the card to `4242…` via the Customer Portal so the next retry succeeds | `status=active`, `last_failed_attempt_count` reset to `0` |
| 6 | Let retries exhaust instead (keep the failing card) until Stripe deletes the subscription | `status=lapsed`, `cancelled_at` set |
| 7 | Voluntarily cancel a *different* active subscription from the Dashboard | that row `status=cancelled` (not lapsed), `cancelled_at` set |

## Out-of-order / idempotency spot checks (`stripe events resend`)

| # | Action | Expected |
|---|--------|----------|
| 8 | After step 6 (row is `lapsed`), resend an earlier `customer.subscription.updated` event for that id | row stays `lapsed`; webhook log: `ignoring … already-terminal subscription` |
| 9 | After step 6, resend the matching `invoice.payment_failed` | row stays `lapsed`; log: `matched no recoverable row … already terminal` |
| 10 | Resend any already-processed `customer.subscription.updated` twice | row unchanged (idempotent upsert); no duplicate row |
| 11 | Resend `customer.subscription.deleted` for an id that has no row | no row created; log: `matched no row … out-of-order delete or unknown id` |

## Duplicate-customer guard (FOLLOW_UPS #44)

| # | Action | Expected |
|---|--------|----------|
| 12 | Run checkout twice for a profile whose `stripe_customer_id` starts null | exactly **one** Stripe customer for that user; `profiles.stripe_customer_id` populated after the first |
| 13 | (Fault-injection, optional) Temporarily force the `profiles` update to fail, then run checkout | checkout returns 500 "Account setup incomplete"; **no** orphaned/duplicate Stripe customer left billable |

## Read-path sanity

| # | Action | Expected |
|---|--------|----------|
| 14 | As a `lapsed` user, hit `/app/vault/restore` | renders the restore screen (does not redirect onward) |
| 15 | After a fresh re-checkout (new subscription id) for that user | `getSubscriptionStatus` returns the **new** active row (newest by `created_at`); `/app/vault/restore` redirects to `/app/record` |
