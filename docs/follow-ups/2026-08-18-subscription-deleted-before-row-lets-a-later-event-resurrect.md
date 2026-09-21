---
id: 2026-08-18-subscription-deleted-before-row-lets-a-later-event-resurrect
priority: P3
status: open
opened: 2026-08-18
owner_paired: true
resolved:
summary: If `customer.subscription.deleted` arrives before the row exists, the death is only logged (not recorded), so a later out-of-order create/update inserts a *live* row for a subscription Stripe has already deleted *(triage 2026-08-18)*
---

# A `subscription.deleted` that matches no row lets a later event resurrect a dead subscription

> **Owner-paired.** Stripe webhook logic (billing never-touch surface). Flagged for an
> owner conversation, not an autonomous agent fix.

**What:** `handleSubscriptionDeleted` in
`src/app/api/stripe/webhook/handlers.ts:94-103` updates the matching row to a terminal
status, but when the update matches **no** row it only logs a warning and returns — it
records nothing. The in-code comment explains why it can't synthesize the row (the
`subscriptions` table has NOT NULL price columns a delete event doesn't carry). The
terminal-status model that protects live rows from resurrection therefore has nothing to
protect: `upsertSubscription`'s guard (`:205`) only skips a write if it finds an *existing
terminal row*.

**Why it matters:** Stripe does not guarantee event ordering. If the `deleted` event lands
before the `created`/`updated` that would have inserted the row (or for an id that was
never recorded), the deletion leaves no trace — and a later out-of-order
`created`/`updated` for that same id then inserts a fresh `active`/`trial` row, because the
guard finds no terminal row to block on. The result is an active-looking subscription for
one Stripe has already killed: free vault access / billing-state desync that is
unrecoverable once it happens. Lower probability than a same-session race, but it's silent
when it does occur.

**Fix shape (owner to weigh):** record the terminal outcome even when no row matches —
e.g. insert a minimal tombstone row keyed on `stripe_subscription_id` (nullable price
columns, or a sentinel), or maintain a small processed-deleted-ids set the upsert consults
— so a later create/update for that id can't resurrect it. This touches the migrations /
table shape, so it needs an owner decision, not a code-only patch.

**Pick up when:** whenever the subscriptions schema or webhook handlers are next revisited
with the owner. Not urgent (needs a specific out-of-order delivery to trigger) but it's a
genuine state-desync landmine.
