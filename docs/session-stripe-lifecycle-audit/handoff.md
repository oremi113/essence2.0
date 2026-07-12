# Handoff — Stripe subscription-lifecycle hardening (roadmap bucket #5)

Review-ready summary for landing `feat/stripe-trial-abuse-guard`.

## Integration note

The branch was originally cut before S10-B was squash-merged to `main` (`#89`),
so it briefly carried the pre-squash S10-B commits. It has since been **rebased
onto `origin/main`** and now contains only the Stripe commits below — nothing
from S10-B. The PR diff is Stripe + session-docs only (9 files), and none of the
touched source files were modified on `main`, so it merges cleanly. (Commit SHAs
are intentionally omitted here — they change on rebase/squash; see the PR's own
commit list for the authoritative set.)

## Commits to land

| Fix | Commit (by title) | Why |
|-----|-------------------|-----|
| **F1** | `feat(stripe): trial is first-subscription-only` | Closes the lapse→restart loop that farmed unlimited free trials (HIGH, money-path) |
| **F2** | `feat(stripe): reject checkout when the user already has a live subscription` (→ 409 `already_subscribed`) | Stops a direct/abnormal call from minting a 2nd subscription = double billing (MEDIUM) |
| — | `docs(stripe): record F2 … in the session README` | — |
| **F3** | `feat(stripe): disambiguate lapse-vs-cancel … via past_due fallback` | A dunning delete with a null / `payment_disputed` reason no longer mislabels a lapse as a voluntary cancel (LOW-MED) |
| — | `docs(stripe): add review-ready handoff` (this file) | — |

## Context

Bucket #5's core hardening (webhook terminal-state stickiness, checked
customer-id write, restore CTA branch) already shipped on `main` via `#61`.
This branch is the output of a broader edge-case audit of the full state
machine. All three fixes are **backend / webhook / entitlement only** and
**do not touch `useCheckout.ts`'s offline-gating surface** (owned by S10-B).

## Test evidence

- Stripe unit suite 66 → **75** green.
- Full unit suite **370/370** green.
- typecheck ✅ · lint ✅.
- F3's fallback was verified against Stripe docs: `cancellation_details.reason`
  is reliably stamped `payment_failed` on dunning-exhaustion cancels, so the
  `past_due` fallback covers only the genuine null / `payment_disputed` /
  `canceled_by_retention_policy` / legacy-event edges.

## Not verified (needs owner / live env)

The true live E2E — real Stripe **test-mode** lapse→restart asserting the new
subscription carries no trial, and a duplicate-checkout attempt returning 409 —
is not reproducible in the build environment. Steps are in
`manual-test-plan.md`.

## On merge — flip in `docs/FOLLOW_UPS.md` (on `main`)

- **#77 → RESOLVED** (F2 shipped).
- **#78 → RESOLVED** (F3 shipped).
- **#79 (F4 — webhook event-ID idempotency ledger)** stays **open**: deferred,
  lowest severity (handlers are idempotent by construction), needs a
  `stripe_events` migration. Pick up in a pre-launch billing-hardening pass or
  before adding any non-idempotent webhook handler.
- **NEW follow-up to log — F2 is best-effort, not atomic.** The duplicate-sub
  guard reads-then-acts, so it can't stop a duplicate minted in the
  checkout-started-but-webhook-not-yet-written window, nor two concurrent
  checkouts. It backs a direct/abnormal POST and claims no race-safety. To make
  it a hard guarantee, add a partial unique index
  `(user_id) WHERE status IN ('trial','active','past_due')` on `subscriptions`.
  Surfaced by the pre-merge independent review. Low priority (happy-path UI
  already routes subscribed users away).
