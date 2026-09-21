---
id: 2026-08-07-webhook-derivestatus-emits-terminal-lapsed-from-created-updated
priority: P2
status: open
opened: 2026-08-07
resolved:
owner_paired: true
summary: Stripe webhook `deriveStatus` maps `incomplete`/unknown → terminal `lapsed` from the created/updated path; the terminal-guard then permanently strands a paying win-back subscriber *(triage 2026-08-07)*
---

# Stripe webhook writes a terminal `lapsed` from a transient status, then can never correct it → a paying win-back subscriber is stranded

*(triage 2026-08-07)*
`src/app/api/stripe/webhook/handlers.ts:166-183` (`deriveStatus`) + `:164` (`TERMINAL_STATUSES`) + `:205-210` (the skip-guard in `upsertSubscription`).

`deriveStatus` maps Stripe status `incomplete`, `incomplete_expired`, and the `default` case (e.g. `paused`, any future/unknown status) all to `'lapsed'` — a **terminal** status. But `upsertSubscription` treats `lapsed`/`cancelled` as terminal: on the next event for the same subscription id it reads the existing row and, if terminal, **returns without writing** (`:205-210`). This directly contradicts the code's own stated invariant at `:160-163` ("`'lapsed'` and `'cancelled'` are written only by `handleSubscriptionDeleted`").

The concrete reachable harm is the win-back path. `createCheckoutSession` sets `grantTrial = !priorSub` (`src/lib/stripe/create-checkout-session.ts:137`), so a returning `lapsed`/`cancelled` user restarting their vault gets **no trial** → an immediate-charge subscription. Stripe commonly emits `customer.subscription.created` with status `incomplete` first (payment not yet confirmed), which the webhook routes to `handleSubscriptionChange` → `upsertSubscription` → writes `status='lapsed'` (terminal). Payment then confirms and `customer.subscription.updated` arrives with status `active` — but the terminal-guard skips it. The row stays `lapsed` forever.

**Why it matters:** the user has paid and is `active` in Stripe, but our DB says `lapsed` → they're vault-locked and bounced to the restart screen. Worse, the `already_subscribed` duplicate-checkout guard only blocks statuses `['trial','active','past_due']` (`create-checkout-session.ts:152`), so a `lapsed` row does **not** stop them starting *another* checkout → duplicate subscription / double billing. A money-path lockout of a live, paying subscriber. (A secondary instance of the same root cause: a `canceled`-status `customer.subscription.updated` writes terminal `cancelled` via `baseRow`, which has no `cancelled_at` and skips the `payment_failed`-vs-`cancellation_requested` disambiguation — corrupting restore analytics with a null `cancelled_at`.)

**Fix shape:** `deriveStatus` must never emit a terminal status from the created/updated path — make `handleSubscriptionDeleted` the sole terminal writer, as the invariant claims. Map `incomplete`/`paused`/unknown to a non-terminal holding status (`past_due` or a new `incomplete`), and keep `incomplete_expired` as the only genuinely-dead one (Stripe follows it with a `deleted` anyway). **Owner-paired: Stripe webhook logic is on the never-touch list — flag only, owner conversation before any change.**

**Pick up when:** before S5 (turning Stripe/monetization on) — the first real win-back subscriber trips this. Pairs with the duplicate-checkout guard (FU-77/81) since a stranded `lapsed` row defeats it.
