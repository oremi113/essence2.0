# Session — Stripe subscription hardening

**Branch:** `feat/stripe-hardening` · **Date:** 2026-06-16
**Agent:** parallel Agent 2 (alongside M1 Memory Shelf). Scope per
`docs/Parallel_Work_Plan_M1.md`.

## Mission

Make the revenue path bulletproof before launch: verify + harden the full
subscription lifecycle (trial → active → past_due/lapse → restore → cancel),
make webhook handling idempotent and out-of-order safe, and cover it with tests.

## File scope (owned, disjoint from the other parallel agents)

- `src/app/api/stripe/*` — webhook route + handlers, checkout, portal
- `src/lib/stripe/*` — checkout-session builder (the Stripe surface behind the route)
- `src/lib/subscription/*` — `getSubscriptionStatus` read abstraction
- `src/app/app/vault/restore*` — restore screen
- `tests/unit/stripe-*` — subscription tests
- own entries in `docs/FOLLOW_UPS.md` only (#23, #44)

**No schema migrations** were created — all hardening is application-layer, so
this stream does not touch the `supabase/migrations/` lane (Agent 3's territory)
and needs no production `db push`.

## What shipped

1. **Out-of-order / duplicate-delivery safety** (`webhook/handlers.ts`)
   - `upsertSubscription` reads the existing row first; if it's already
     `lapsed`/`cancelled` (terminal — written only by the delete handler, the
     authority for a subscription id), a stale or replayed `created`/`updated`
     event is **skipped**, so a dead subscription can't be resurrected.
   - `handleSubscriptionDeleted` and `handlePaymentFailed` now check the
     update's row count. A zero-row update (out-of-order delete, or an id that
     was never recorded) **warns loudly** instead of silently succeeding.
   - `handlePaymentFailed` is **terminal-safe**: its update is filtered to
     `status IN (trial, active, past_due)`, so a late `payment_failed` can't
     drag a lapsed/cancelled subscription back to `past_due`.

2. **Dunning-counter correctness** — `last_failed_attempt_count` is reset to 0
   when a subscription resolves to `active`/`trial` (recovery or fresh trial),
   and left untouched on `past_due` upserts so the failure count keeps driving
   the `/app/record` banner variant.

3. **Duplicate-customer leak fixed** (FOLLOW_UPS #44) — the `stripe_customer_id`
   write-back in `create-checkout-session.ts` now checks `{ error }` and throws,
   so a failed persist aborts checkout instead of spawning a second Stripe
   customer on the next attempt.

4. **Handler test harness** — `tests/unit/stripe-webhook-handlers.test.ts`
   (30 tests) mocks the service-role Supabase client + Stripe SDK and covers the
   full status map, counter reset/preservation, the terminal/out-of-order guard,
   duplicate-delivery idempotency, lapsed-vs-cancelled distinction, zero-row
   warnings, and checkout-completed happy/early-return paths.

## Why duplicate delivery needed no events ledger

The state-writing handlers are idempotent by construction: `upsertSubscription`
upserts on `stripe_subscription_id`, and the two UPDATE handlers re-write the
same status. Re-delivering an event reproduces the same row. A dedicated
`stripe_webhook_events` ledger would only earn its keep once a **non-idempotent**
side effect (email, one-shot analytics, credit grant) is added to a handler — at
which point it becomes worth a migration. Documented rather than built, to keep
this stream schema-free and off Agent 3's migration lane. See `decisions.md`.

5. **Restore-screen CTA branch (FOLLOW_UPS #23)** — after the owner answered the
   3 product confirmations, the lapse dead-end is fixed. `resolveRestorePlan()`
   (`src/lib/subscription/restore-mode.ts`, unit-tested) maps status → action:
   `past_due` updates the card via Portal; `lapsed`/`cancelled` restart on a NEW
   subscription, **preserving the prior `billing_period`** (annual stays annual,
   monthly fallback only when unknown) and carrying the standard fresh 7-day
   trial. `VaultRestoreScreen` takes a `mode` prop so the CTA + action line adapt
   ("Update my card" vs "Restart my vault" — clear, not clever). Wiring lives in
   `restore/page.tsx` → `restore/actions.tsx`; dev sandbox `/dev/lapse` covers all
   four mode×recordings variants.

## Out of scope (deferred, with reasons)

- Nothing outstanding in this stream. The earlier deferral (restore CTA branch)
  is now built — see item 5 above.

## Test coverage (added this session)

The whole revenue surface — previously only one event-routing test — now has
**66 unit tests across 5 files**:

- `stripe-webhook-handlers.test.ts` (33) — status map, counter reset/preserve,
  terminal/out-of-order guard, duplicate-delivery idempotency, lapsed-vs-
  cancelled, zero-row warnings, checkout happy/early-return, and sparse-object
  serialization (object-form customer, empty items, trial_end mapping).
- `stripe-webhook-route.test.ts` (7) — the signature boundary: missing secret →
  500, missing/forged signature → 400, verifies against the raw body, valid →
  200, unhandled type → 200, handler throw → 500 (so Stripe retries).
- `create-checkout-session.test.ts` (12) — auth/profile gates, customer
  reconciliation (reuse / deleted / resource_missing / unexpected error), the
  **#44 persist guard** (failed write aborts BEFORE creating the session),
  pricing + session metadata, missing price id, no-url.
- `stripe-portal-session.test.ts` (6) — flag off → 503, unauth → 401, lookup
  error → 500, no customer → 404, success, Stripe throw → 500.
- `restore-mode.test.ts` (8) — status → mode/plan, prior-plan preservation,
  monthly fallback, the no-silent-downgrade guard, conservative default.

To unit-test the server-only checkout lib directly, `vitest.config.ts` aliases
the Next marker packages (`server-only`/`client-only`) to `tests/stubs/empty-
module.ts` — additive infra, no behavior change to existing tests.

## Verification

- `npx tsc --noEmit` — clean
- `npx eslint` on changed files — clean
- `npx vitest run` — full suite green (263 total at last run; the global count
  drifts because the working tree is shared with the other parallel agents)
- Restore-screen copy/CTAs confirmed rendered server-side via `/dev/lapse`
  (interactive Playwright was held by another agent's session).
- Stripe test-mode lifecycle walk — see `manual-test-plan.md` (requires
  `stripe listen`; owner-run, not executable in this environment).
