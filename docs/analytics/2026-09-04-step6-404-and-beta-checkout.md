---
title: Step 6 funnel discontinuity ends (A6 no longer 404s); beta checkout starts emitting real Stripe events at $0
date: 2026-09-04
event: multiple
type: behavior-change
impact: Every message-creation attempt in the beta previously died at a 404 between /generate and A6 — so step6.generate ran to completion but no downstream A6/A7 event could ever fire. Historical data shows a 100% drop-off at that hop; it is a bug, not user behaviour. Separately, checkout now produces real Stripe subscription rows (status=trial) at $0 instead of mock ones, so subscription counts become non-zero without representing revenue.
---

## What changed

Two beta-configuration fixes land together.

**1. The Step 6 funnel had a hard wall after generation.**
`DEFERRED_AUDIO_ENABLED` defaulted off, and the control arm's A6 screen was
never built, so `/messages/new/g/[generationId]` returned 404. The flow was:
`step6.flow_started` → `step6.generate` (a *successful*, fully paid LLM +
ElevenLabs render) → 404. Nothing after A6 could fire — no
`step6.message_saved`, no A6 interaction events, no C1 ceremony, ever, in any
deployed environment.

The default is now on, so those events begin firing for the first time.

**2. Two new/newly-reachable server log events.**
- `step6_stale_pending_superseded` — `/messages/new` reclaiming an abandoned
  `pending_generations` row on entry (see the follow-up
  `2026-09-04-abandoned-pending-generations-have-no-sweeper`). A burst of these
  is expected on first visits after this ships, as users stranded by the 404 are
  unblocked. It is cleanup, not user intent.
- `step6.cost_limit_blocked` with `limit_kind: pending_max` should now go to
  roughly zero. Prior occurrences were almost entirely the 404's stranded rows
  hitting the one-active-generation cap, not genuine abuse.

**3. `flow_started` no longer precedes every A6 arrival.**
`/messages/new` now redirects a user with a finished, unsaved generation
straight to that generation's A6. A resumed flow therefore reaches A6 (and
possibly `message_saved`) with no new `flow_started` in the same session. Any
query that assumes `A6 arrivals ≤ flow_started` will be wrong by the number of
resumes.

**4. Checkout emits real Stripe objects at $0.**
`VAULT_STRIPE_ENABLED` is on for the beta with `STRIPE_BETA_COUPON_ID` (a
100%-off coupon) applied to every session. Testers walk real Stripe Checkout,
enter a real card, and are charged nothing. So: `subscriptions` rows appear with
`status = 'trial'`, real `stripe_subscription_id`s, and webhook lifecycle events
fire for the first time — but `price_amount_cents` on the row is the list price
while the actual invoice total is $0. **Do not read beta subscription counts as
revenue, and do not derive ARPU from this window.**

## Root cause

Configuration, not code intent. `DEFERRED_AUDIO_ENABLED` was only ever set as an
inline prefix in dev sessions and never written into any env file or Vercel, so
every deployment selected the arm with no screen.

## When

2026-09-04, on the fix branch off `main`.

## What to watch

- A step change (0 → non-zero) in every Step 6 event downstream of `generate`.
  Treat the pre-2026-09-04 period as **no data**, not as zero conversion.
- `step6.generate` succeeded during the broken window: those rows are real
  vendor spend with no user-visible product. Useful as a cost floor, useless as
  an engagement signal.
- `step6_stale_pending_superseded` decaying to near-zero after the first week.
  If it stays elevated, users are abandoning mid-flow for a *new* reason.
- Subscription rows in this window carry a 100% discount. Segment them out
  before any billing analysis; they end when `STRIPE_BETA_COUPON_ID` is unset.
