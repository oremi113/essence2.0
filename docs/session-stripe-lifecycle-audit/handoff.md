# Handoff — Stripe subscription-lifecycle hardening (roadmap bucket #5)

Review-ready summary for landing `feat/stripe-trial-abuse-guard`.

## Integration note (read first)

The branch was cut before S10-B was squash-merged to `main` (`#89`), so it
carries the *original* S10-B commits (`1c54c66` and its parents) that `main`
now holds as a single squash. **Rebase onto current `main` and keep only the
four Stripe commits below** — the S10-B originals are already represented by the
squash and should drop out. (Verified: none of the touched files were modified
on `main` since the merge-base, so the code itself merges cleanly.)

## Commits to land

| Commit | What | Why |
|--------|------|-----|
| `0682fb9` | **F1** — trial is first-subscription-only | Closes the lapse→restart loop that farmed unlimited free trials (HIGH, money-path) |
| `3824407` | **F2** — reject checkout if a live subscription exists (→ 409 `already_subscribed`) | Stops a direct/abnormal call from minting a 2nd subscription = double billing (MEDIUM) |
| `48ad348` | doc — session README records F2 | — |
| `b24a49c` | **F3** — disambiguate lapse-vs-cancel via `past_due` fallback | A dunning delete with a null / `payment_disputed` reason no longer mislabels a lapse as a voluntary cancel (LOW-MED) |

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
