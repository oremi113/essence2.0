---
id: 2026-07-14-billing-period-desyncs-after-a-customer-portal-plan-switch
priority: P3
status: open
opened: 2026-07-14
resolved:
owner_paired: true
summary: `billing_period` is taken from checkout-time Stripe metadata that Stripe never rewrites on a Customer-Portal plan switch, so after a monthly↔annual change the stored cadence goes stale — and the restore flow can put the user back on the wrong plan *(triage 2026-07-14)*
---

# Stored `billing_period` desyncs from the real price after a Customer-Portal plan switch

*(triage 2026-07-14)*
The subscription's `billing_period` is always sourced from `sub.metadata.billing_period`
(`src/app/api/stripe/webhook/handlers.ts:34-35, 42`), which is stamped once at checkout
(`src/lib/stripe/create-checkout-session.ts:194-200`). Stripe does **not** rewrite subscription metadata
when a customer changes plan in the Customer Portal (`src/app/api/stripe/portal-session/route.ts` opens
that portal). On a monthly→annual (or reverse) switch, `customer.subscription.updated` fires and
`upsertSubscription` refreshes `stripe_price_id` and `price_amount_cents` to the new plan — but leaves
`billing_period` at the stale checkout-time value.

**Why it matters:** the stored cadence no longer matches what the customer actually pays. `resolveRestorePlan`
(`src/lib/subscription/restore-mode.ts:39`) uses this field to choose which plan to re-checkout a
returning lapsed user on, so a restart after a plan switch can silently put them back on the **wrong
cadence** (e.g. an annual subscriber restored onto monthly), and any UI/analytics reading `billing_period`
is wrong. Whether this can fire today depends on whether the Stripe Portal configuration actually exposes
plan switching — if it doesn't yet, this is a latent landmine that arms the moment it's enabled.

**Fix shape:** derive `billing_period` from the actual price on the subscription item (map the price
ID / recurring interval to monthly vs annual) instead of trusting checkout-time metadata — or keep the
subscription metadata in sync on plan-change events. **Owner-paired:** the fix lives inside Stripe webhook
handler logic (a never-touch area for the agent); flagging only, for an owner-led change. First step for
the owner: confirm whether the live Customer Portal config permits plan switching.

**Pick up when:** before enabling plan switching in the Portal, or the next Stripe lifecycle pass.
Owner-paired (webhook logic).
