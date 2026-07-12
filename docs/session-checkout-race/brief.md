# Session — checkout `success_url` vs webhook race (FOLLOW_UPS #84)

**Date:** 2026-07-12
**Owner-picked item:** Candidate work #1 — the #84 half (solo-buildable).
The S5 flag-flip half stays owner-gated and is **not** part of this session.

## The bug (root cause)

With real Stripe on (`VAULT_STRIPE_ENABLED=true`), `createCheckoutSession`
sets `success_url` → `/app/voice/processing?session_id={CHECKOUT_SESSION_ID}`.
Stripe redirects the browser to `success_url` **the instant** checkout
completes — which can be **before** the `checkout.session.completed` webhook has
written the `trial` row. In that window `getSubscriptionStatus` returns `none`.

Two guards read that `none` and misbehave — the SAME root cause, two symptoms:

1. **`src/app/app/voice/processing/page.tsx`** — server guard sees `none`,
   `redirect(ROUTES.vaultProtect)` → a just-paid user is bounced back to the
   paywall. Post-payment dead-end on the money path.
2. **`/api/voice-profiles/[id]/start`** → `assertCanStartVoiceCreation` →
   `assertCanCreateVoice` → `getSubscriptionStatus` sees `none` → **402**.
   The client wrapper (`ProcessingActions`) triggers `/start` on mount, so even
   a user who slips past guard (1) can 402 here on the same race.

FU #84 only named symptom (1). Symptom (2) is the same window — a page-only fix
would be a band-aid that leaves the 402 live.

## The fix — reconcile-on-landing (not grace-poll)

On landing with a `session_id`, if the subscription reads `none`, **reconcile
synchronously from the authoritative source before any guard decides**: retrieve
the Checkout Session; if it is `complete` and owned by this user, run the exact
`handleCheckoutCompleted` path the webhook runs to write the `trial` row; re-read
status; then let the guard decide.

Because the row is written during the page's server render — before the guard's
redirect decision AND before the client-triggered `/start` — this closes **both**
symptoms at once. That's why it's a root-cause fix, not a page-local patch.

**Why reconcile beats a grace-poll:**
- Deterministic — no arbitrary wait, no flaky "did the webhook land in N ms?".
- Authoritative — Stripe is the source of truth, not "hope the webhook raced us".
- Idempotent with the webhook — `upsertSubscription` keys on
  `stripe_subscription_id` and has terminal-state guards, so a later/concurrent
  `checkout.session.completed` is a harmless no-op.

**Ownership check (security):** the session's `metadata.user_id` is stamped by us
at creation. We reconcile only when it matches the caller — a forged/borrowed
`session_id` never grants this user another account's subscription.

**Gate:** reconcile runs only when `VAULT_STRIPE_ENABLED` is on (a real session
id only exists on the real path; the mock path carries `?mock=true` and no
`session_id`). Off → unreachable, exactly as today.

## Scope

- NEW `src/lib/stripe/reconcile-checkout-session.ts` — retrieve + validate +
  reconcile via `handleCheckoutCompleted`.
- EDIT `src/app/app/voice/processing/page.tsx` — read `session_id`,
  reconcile-on-`none`, re-read, then guard.
- NEW `tests/unit/reconcile-checkout-session.test.ts`.
- FOLLOW_UPS #84 → resolved. Spec known-edges note updated.

No telemetry surface touched (no new/moved event) → no analytics note.
`create-checkout-session.ts` already emits `session_id` in `success_url` — no
functional change there (a clarifying comment only).

## Verification

- **Unit:** `tests/unit/reconcile-checkout-session.test.ts` — 7 cases: reconciled
  (owned + complete), trial (complete + `no_payment_required`), not_owned
  (mismatched / missing `user_id`), incomplete (`status: open`), error
  (retrieve throws / handler throws). All green. Full suite 381/381.
- **typecheck + lint:** clean.
- **Live-verify limitation (stated plainly):** the reconcile branch only
  activates under real Stripe (`VAULT_STRIPE_ENABLED=true` + a real
  `session_id`), which is the owner-run S5 flip with vendor keys. It is **not
  live-exercisable in this environment** — verified by unit test, not by a real
  checkout. The existing **mock** path (`?mock=true`) is structurally untouched:
  the whole reconcile block sits inside `if (!isMock)`, and the mock path sets
  `isMock` and skips it entirely. The plain `none`-no-session bounce and the
  `trial` refresh path are also unchanged (reconcile is skipped without a
  `session_id`).

### Manual test plan — run at S5 (real Stripe on)

1. Real checkout with webhooks **delayed/paused** (Stripe CLI: don't forward, or
   add latency). Complete payment → land on `/app/voice/processing?session_id=…`
   with the row not yet written. **Expect:** page reconciles, shows processing
   (no bounce to Card Capture); `/start` proceeds (no 402).
2. Resume webhook delivery → `checkout.session.completed` upserts the same row.
   **Expect:** no duplicate row, no error (idempotent on `stripe_subscription_id`).
3. Forge/borrow: hit `/app/voice/processing?session_id=<another user's cs_…>` as
   a `none` user. **Expect:** `not_owned` → still bounced to Card Capture (no
   subscription granted).
4. Open (unpaid) session id. **Expect:** `incomplete` → bounced to Card Capture.

## Still owner-gated (out of scope here)

S5: flip `VOICE_CREATION_REQUIRES_PAYMENT` + `VAULT_STRIPE_ENABLED`, swap
`PLACEHOLDER_*` price IDs, remove the `?mock=true` bypass, vendor-backed walk
(real ElevenLabs $). This session removes the #84 blocker gating that flip.
