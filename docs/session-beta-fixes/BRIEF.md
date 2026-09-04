# Session — beta blockers found in the first full owner walkthrough

**Date:** 2026-09-04
**Branch:** `fix/avatar-size-limit`
**Reported by:** owner, walking the real flow end to end for the first time.

Two reports, one of them a launch blocker.

---

## Report 1 — "I wasn't prompted to a Stripe payment screen after recording"

**Not a bug — a deliberate beta setting, now changed on the owner's call.**

`.env.example` carried the instruction *"Keep OFF / absent for the free beta:
`VAULT_STRIPE_ENABLED`, `VOICE_CREATION_REQUIRES_PAYMENT`"*. With
`VAULT_STRIPE_ENABLED` off, `/api/stripe/create-checkout-session` returns a
**mock** URL and the app jumps straight to `/app/voice/processing?mock=true`.
Card Capture still renders; the "Keep my voice" button simply never reaches
Stripe.

The cost of that is that the entire payment path — Checkout, the webhook, the
`subscriptions` row, the `success_url` reconcile (FU-84) — stays unexercised by
real users right up until the day it has to work.

**Decision (owner, this session):** real Stripe in test mode, comped to $0.

### What was built

`STRIPE_BETA_COUPON_ID`. When set, `createCheckoutSession` attaches
`discounts: [{ coupon }]` and `payment_method_collection: 'always'`. A tester
sees the real Checkout screen, enters a real card, and is charged nothing —
while every downstream mechanism runs for real.

`payment_method_collection: 'always'` is explicit and load-bearing: with a
100%-off coupon there is nothing to charge, and collecting the card anyway is
the entire point of doing this instead of leaving the mock in place.

A test-mode coupon `ESSENCE_BETA_100` (100% off, `duration: forever`) was
created in the Stripe sandbox and wired into `.env.local`.

**This is a one-line rollback.** Unset `STRIPE_BETA_COUPON_ID` and checkout
charges list price. It must be unset before taking real money.

---

## Report 2 — "creating a message took me to 'we couldn't find that page'"

**A launch blocker, and worse than it looked.**

### Root cause

`src/app/messages/new/g/[generationId]/page.tsx:36`:

```ts
if (!isDeferredAudioEnabled()) notFound();
```

`isDeferredAudioEnabled()` read `process.env.DEFERRED_AUDIO_ENABLED === "true"`.
That variable was **never written into `.env.local`, `.env.example`, or Vercel**.
It only ever existed as an inline prefix typed by hand during dev sessions
(`DEFERRED_AUDIO_ENABLED=true npm run dev`). So every real environment ran with
it off.

Off selects the "control arm" of a cost experiment — and that arm's A6 preview
screen was never built. `MessagesNewPageClient.tsx:26` says so outright: *"With
the flag off, a successful generate lands on a 404 — expected until the
control-arm A6 exists."*

So the actual sequence a tester experienced was:

1. `/api/messages/generate` runs to completion — **including a paid Anthropic
   text generation and a paid inline ElevenLabs voice render**;
2. it writes a `pending_generations` row;
3. the client pushes to that row's preview screen;
4. the screen 404s.

Money spent, message rendered, user shown "We couldn't find that page."

### The part that made it permanent

`/generate` allows **one active pending generation per user**
(`STEP6_LIMITS.maxActivePendingPerUser = 1`). The stranded row is never saved
and never superseded, so it stays active forever. Every subsequent attempt
returns `429 cost_limit_blocked`.

Fixing only the flag would not have unbroken anyone who already hit it — they
would have moved from a 404 to a silent failure on the A5 screen.

### What was fixed

1. **`isDeferredAudioEnabled()` now defaults ON** — `!== "false"` instead of
   `=== "true"`. The deferred arm is the only one with a working screen, so it
   is the only safe default. An explicit `"false"` still selects the control arm
   for tests. (`src/lib/messages/cost-controls.ts`)

2. **`/messages/new` resolves an in-flight generation on entry**
   (`src/app/messages/new/page.tsx`):
   - finished row (text + audio succeeded) → **resume** it at its A6;
   - stale unfinished row → **supersede** it, start fresh;
   - recent unfinished row → leave alone (a live `/generate` may still be
     rendering it).

   "Stale" is `> 5 minutes`, safely past `/generate`'s own `maxDuration = 120`
   ceiling. The threshold lives in `src/lib/messages/stale-pending.ts` — being
   late costs one extra visit, being early would supersede a live render.

3. **Both flags documented in `.env.example`**, including the production
   checklist at the top.

### Also caught while verifying

`NEXT_PUBLIC_APP_URL` builds Stripe's `success_url` / `cancel_url` and falls
back to `http://localhost:3100`. It was **not** in the production checklist.
With real Stripe now on, an unset value in production means every tester who
completes checkout is redirected to their own machine — payment taken, user
never returns to the app. Added to the checklist.

---

## Deferred (filed, not fixed)

- `2026-09-04-control-arm-a6-screen-was-never-built` (P2) — the `notFound()` is
  still a landmine for anyone who sets the flag to `"false"`. Either retire the
  control arm or give it a real destination.
- `2026-09-04-abandoned-pending-generations-have-no-sweeper` (P3) — the
  migration promises a prune job for `expires_at`; it does not exist. The
  entry-point reclaim is a doorway repair, not a sweeper.
