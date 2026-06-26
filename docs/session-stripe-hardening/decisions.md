# Decision memos — Stripe hardening

## D1. Terminal state is sticky (the out-of-order guard)

**Decision.** Once a subscription row is `lapsed` or `cancelled`, a
`customer.subscription.created`/`updated` event for the **same** Stripe
subscription id is ignored.

**Why it's correct, not just convenient.** `customer.subscription.deleted` is
the terminal authority for a subscription id. Stripe never reactivates a deleted
subscription — a returning user gets a brand-new subscription id (a fresh
checkout). So any non-delete event that arrives *after* the delete, for the same
id, is necessarily stale (out-of-order delivery, or a Stripe-side replay).
Applying it would resurrect a dead subscription and wrongly restore access.

**What it does NOT block.** The `cancel_at_period_end` flow stays on `active`
(not terminal) until the period actually ends and the delete fires — so
"un-cancel before period end" still works. And a real restore creates a new id,
which inserts cleanly and wins on `getSubscriptionStatus`'s newest-row ordering.

**Failure mode chosen: fail-open on the pre-read.** If the existing-status read
itself errors, we log and proceed to the upsert rather than skip. Dropping a
legitimate state write (and stranding a paying user) is worse than the
already-guarded-against resurrection risk; the upsert is idempotent regardless.

## D2. No `stripe_webhook_events` ledger (yet)

**Decision.** Duplicate-delivery safety is achieved by idempotent writes, not by
a persisted event-id ledger.

**Why.** Every handler's write is idempotent: `upsertSubscription` upserts on
`stripe_subscription_id`; `handleSubscriptionDeleted` / `handlePaymentFailed`
re-write the same status. Re-delivering an event reproduces the same row — Stripe
assumes at-least-once delivery and that's exactly what idempotent writes are for.

A ledger earns its place only when a handler gains a **non-idempotent** side
effect (a confirmation email, a one-shot analytics event, a credit grant). At
that point: add a `stripe_webhook_events (event_id PK, type, created_at)` table,
claim the event id at the top of the webhook POST with `ON CONFLICT DO NOTHING`,
and skip dispatch on a duplicate. Until then it's a migration (Agent 3's lane)
and a table earning nothing. Tracked as a note here, with a passing test that
pins the current idempotency so a future non-idempotent change trips a red test.

## D3. Counter reset on recovery, preserved on failure

**Decision.** `last_failed_attempt_count` is set to 0 in the upsert only when the
derived status is `active` or `trial`; for every other status the field is
omitted from the payload (so the upsert leaves the stored value intact).

**Why the omit, not an explicit write.** Supabase upsert only SETs the columns
present in the payload. Omitting `last_failed_attempt_count` on a `past_due`
upsert means the count written by `handlePaymentFailed` survives a concurrent /
subsequent `customer.subscription.updated(past_due)` — so the `/app/record`
banner keeps showing the right variant. Writing 0 there would erase the count
and reset the banner to variant 1 mid-dunning.

## D4. Reused error code on the #44 fix

The new write-back guard throws `code: 'profile_lookup_failed'` rather than a new
code. The checkout route already maps that code to a 500 "Account setup
incomplete. Please contact support." — the right user-facing outcome for "we
couldn't persist your Stripe customer." Adding a new code would mean touching the
route's error switch for no behavioral gain.
