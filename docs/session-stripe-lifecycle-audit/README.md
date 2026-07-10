# Session — Stripe subscription-lifecycle audit + trial-abuse guard

**Date:** 2026-07-08
**Roadmap:** bucket #5 — harden the Stripe subscription lifecycle E2E (trial → active → lapse → restore)
**Branch:** `feat/stripe-trial-abuse-guard` (off `main`)
**Scope guard:** backend / webhook / entitlement only. Did **not** touch
`src/lib/stripe/useCheckout.ts`'s offline-gating surface (owned by an active
S10-B session).

## TL;DR

The lifecycle hardening described in bucket #5 (webhook terminal-state
stickiness, checkout customer-id write-back, the restore CTA branch) was
**already shipped in `main`** via PR #61 — FOLLOW_UPS #23 and #44 are marked
resolved. The `feat/stripe-hardening` branch was a stale (43-behind) copy whose
one commit's core files are byte-identical to `main`.

Rather than re-land shipped work, this session ran a **broader edge-case audit**
of the full state machine and fixed the one genuine, HIGH-severity, money-path
hole it found. Three lower findings were logged to FOLLOW_UPS instead of built.

## What shipped here

**Fix (F1) — trial is now a one-time, first-subscription benefit.**
`create-checkout-session.ts` set `trial_period_days: 7` on *every* checkout. The
restore flow re-enters that same checkout to restart lapsed/cancelled users, so
a cancel-before-convert loop granted a fresh 7-day trial on every restart =
perpetual free access. The fix looks up whether the user has any prior
subscription row (keyed on stable `user_id`, RLS-safe) and grants the trial only
to true first-timers; returning subscribers are charged immediately.

- `src/lib/stripe/create-checkout-session.ts` — prior-subscription lookup +
  conditional `trial_period_days`. Lookup error aborts checkout (matches the
  file's existing fail-loud profile-lookup pattern — never guess trial state).
- `tests/unit/create-checkout-session.test.ts` — +3 cases (returning subscriber
  gets no trial; first-timer gets the trial; lookup error aborts before Stripe).

**Fix (F2) — checkout rejects a duplicate subscription** (commit `3824407`).
`createCheckoutSession` never checked for an existing subscription; a direct
POST by a trial/active/past_due user would mint a second Stripe subscription
(double billing). Now it looks up any live subscription for the user and throws
`already_subscribed` (→ 409 in the route) before touching Stripe. Terminal
statuses fall through — that IS the restore→restart path.

- `src/lib/stripe/create-checkout-session.ts` — live-subscription guard +
  `already_subscribed` error code.
- `src/app/api/stripe/create-checkout-session/route.ts` — maps it to 409.
- `tests/unit/create-checkout-session.test.ts` — +3 cases (live sub → reject;
  terminal returner → restart allowed, no trial; lookup error → abort).

**Fix (F3) — lapse-vs-cancel label no longer depends solely on Stripe's reason.**
`handleSubscriptionDeleted` labelled `lapsed` only when
`cancellation_details.reason === 'payment_failed'`, else `cancelled`. Stripe
docs confirm it stamps `payment_failed` reliably on dunning-exhaustion — but the
field can be null or another value (`payment_disputed`,
`canceled_by_retention_policy`, legacy events). The handler now keeps the two
explicit reasons as fast paths and, for an ambiguous reason, falls back to OUR
own state: a delete out of `past_due` (only ever set from
`invoice.payment_failed`) is a lapse, not a voluntary cancel. Read failure →
conservative `cancelled`, never blocks the delete.

- `src/app/api/stripe/webhook/handlers.ts` — reason fast-paths + past_due
  fallback.
- `tests/unit/stripe-webhook-handlers.test.ts` — +3 (reason-missing×past_due →
  lapse; payment_disputed×past_due → lapse; read-error → cancelled, no throw).

Combined: full Stripe suite 66 → 75 green. No new migration, no schema change,
no telemetry event added/removed.

## Audit findings (full)

| ID | Severity | Finding | Disposition |
|----|----------|---------|-------------|
| F1 | HIGH | Unlimited free trials via lapse→restart loop | **Fixed** (commit 0682fb9) |
| F2 | MEDIUM | No already-subscribed guard on checkout → double billing on direct call | **Fixed** (commit 3824407; FOLLOW_UPS #77 now resolved) |
| F3 | LOW-MED | Lapse-vs-cancel label depends on `cancellation_details.reason` | **Fixed** (commit pending; FOLLOW_UPS #78 now resolved) |
| F4 | LOW | No webhook event-ID idempotency ledger (handlers idempotent by construction) | Logged → FOLLOW_UPS #79 |

Lower notes (not bugs, captured for context): `unpaid`→`past_due` mapping offers
Portal card-update but Stripe won't auto-retry an unpaid sub (user pays the open
invoice via Portal — works); `past_due` users are blocked from
`/api/messages/save` while `/record` still renders a dunning banner (defensible
nudge); no in-app "resume" for a `cancel_at_period_end` sub before period end
(Portal only).

## Verification status

- typecheck ✅ · lint ✅ · unit 75/75 ✅ (Stripe suite).
- **Not** yet verified live: the true E2E (real Stripe test-mode lapse→restart
  asserting the new subscription carries no trial) needs the Stripe test harness
  + a returning-subscriber state, which isn't reproducible in this environment.
  Steps are in `manual-test-plan.md`. Unit tests cover the branch logic.
