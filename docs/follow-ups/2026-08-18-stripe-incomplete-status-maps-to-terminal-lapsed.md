---
id: 2026-08-18-stripe-incomplete-status-maps-to-terminal-lapsed
priority: P2
status: open
opened: 2026-08-18
owner_paired: true
resolved:
summary: A transient Stripe `incomplete` status is mapped to the *terminal* `lapsed`, which the terminal guard then freezes — a customer whose first charge later succeeds is permanently stuck `lapsed` *(triage 2026-08-18)*
---

# Transient Stripe `incomplete` is written as terminal `lapsed` → paying customer frozen out

> **Owner-paired.** This lives in Stripe webhook logic (`supabase`/billing never-touch
> surface). Flagged for an owner conversation, not an autonomous agent fix.

**What:** `deriveStatus` in `src/app/api/stripe/webhook/handlers.ts:177-179` maps both
`incomplete` **and** `incomplete_expired` to `lapsed`, and `lapsed` is in
`TERMINAL_STATUSES` (`:164`). The out-of-order guard in `upsertSubscription` (`:205-209`)
then treats any row already at a terminal status as frozen: every later
`customer.subscription.updated` event for that same subscription id is ignored. The code
comment at `:160-163` even asserts `lapsed`/`cancelled` are "written only by
handleSubscriptionDeleted" — but `deriveStatus` violates that invariant by emitting
`lapsed` for a live-but-`incomplete` subscription.

**Why it matters:** `incomplete` is **not** terminal — it's the state a non-trial
subscription sits in while its first charge awaits SCA/3DS confirmation or a soft retry,
before flipping to `active`. If a webhook writes the row while it's `incomplete`, the row
becomes terminal `lapsed`; when the charge then succeeds and Stripe sends `active`, the
guard drops it as a no-op. The customer **is** being billed but is permanently frozen as
`lapsed` — locked out of the vault they're paying for, dead-ended to
`/app/vault/restore`, and the checkout-landing reconcile can't rescue them (its upsert hits
the same terminal guard). This bites the restore→restart path hardest (returning
subscriber, immediate non-trial charge = the case most likely to transit `incomplete`).
Only `incomplete_expired` (the initial payment never succeeded and Stripe gave up) is
genuinely terminal.

**Fix shape:** in `deriveStatus`, split plain `incomplete` from `incomplete_expired` —
map `incomplete` to a **non-terminal** holding status (e.g. `past_due`) so a later
`active` can still land, and keep only `incomplete_expired` (and `canceled`) terminal.
Owner should confirm the desired holding status and the restore-path UX before this ships.

**Pick up when:** before launch if any real (non-trial) restore/restart flows are exercised
— this is a live-money, live-access landmine on returning subscribers. Needs an owner
sign-off because it's webhook/billing logic.
