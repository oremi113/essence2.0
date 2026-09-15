---
id: 2026-09-15-stripe-incomplete-status-mapped-to-terminal-lapsed
priority: P2
status: open
opened: 2026-09-15
resolved:
owner_paired: true
summary: Stripe `incomplete` subscription status is mapped to the TERMINAL `lapsed`, and the terminal guard then makes it permanent → a paying user is locked out of the vault forever *(triage 2026-09-15)*
---

# Stripe `incomplete` status is treated as terminal → a paid subscriber is permanently denied access

*(triage 2026-09-15 — Stripe webhook lifecycle review)*

`src/app/api/stripe/webhook/handlers.ts:177-179` maps the Stripe subscription
statuses `incomplete` **and** `incomplete_expired` (and the `default` case,
:180-181) to our `'lapsed'` status. `'lapsed'` is in `TERMINAL_STATUSES`
(`handlers.ts:164`), and `upsertSubscription`'s out-of-order guard refuses any
further write once the stored status is terminal (`handlers.ts:205-210`). But
`incomplete` is **not** terminal on Stripe's side — it is the transient state a
brand-new subscription sits in while its first charge is confirmed (card needs
SCA/3-D Secure, or the first payment is still settling). Stripe emits
`customer.subscription.created` with `status: incomplete`, then
`customer.subscription.updated` with `status: active` once the charge clears.
Both events are dispatched into this path (`webhook/route.ts:25-27`), as is the
FU-84 landing-page reconcile (`src/lib/stripe/reconcile-checkout-session.ts:63`
→ `handleCheckoutCompleted` → same `upsertSubscription`).

**Why it matters:** a customer who pays and clears 3-D Secure ends up with a
subscription that is **active on Stripe (charging their card) but stored as
`lapsed` in our database, permanently.** The first `created`/`incomplete` event
writes `lapsed`; every later `active` event is then silently dropped by the
terminal guard, and Stripe never re-sends `created`, so nothing can ever repair
the row. `getSubscriptionStatus` reads that newest row
(`src/lib/subscription/get-status.ts`) and reports `lapsed`, so the paying user
is bounced to the restore/lapsed screens and cannot reach their vault — the exact
"paid but denied service" failure that produces refunds and chargebacks. Only
manual database surgery recovers each affected account. It is invisible in the
beta because the 100%-off comp coupon settles checkout immediately as `active`
(no `incomplete` step); it goes live the day real cards are charged, and hits the
**restore → restart** path hardest (returning subscribers have `grantTrial=false`
in `create-checkout-session.ts` and are charged immediately, so they are the most
likely to pass through `incomplete`). A trial signup is safe (it opens as
`trialing`, not `incomplete`).

**Fix shape:** keep terminal statuses (`lapsed`/`cancelled`) out of the
create/update upsert path entirely — they are meant to be written only by
`handleSubscriptionDeleted` (the invariant the `handlers.ts:160-163` comment
already asserts, which `deriveStatus` violates). Map `incomplete` to a
non-terminal holding state (or don't persist the `incomplete` event at all and
let the following `active`/`trialing` event write the row); reserve `lapsed` for
`incomplete_expired` + the delete path. Verify with a Stripe test-clock
subscription that requires SCA. Owner-paired: touches Stripe webhook logic
(never-touch list) — pair with an owner before changing lifecycle mapping.

**Pick up when:** **before launch / before the beta comp coupon is removed** —
this is a launch blocker for real-card billing. Batch with the Stripe lifecycle
items FU-78 / FU-79 / FU-81.
