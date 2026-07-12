# Session — S5: Stripe go-live (flag flip + vendor-backed walk)

**Date:** 2026-07-12
**Depends on:** FU #84 reconcile (landed, `6429650`) — was the gate.
**Strategy (owner-chosen):** Stripe **TEST mode** walk locally first, then flip
Vercel prod to LIVE. Owner has prices + keys ready.

## The design — one reversible lever

Every S5 "go-live" behavior is **conditional on `VAULT_STRIPE_ENABLED`**, so the
code lands to `main` with flags still OFF (behavior identical to today) and the
env flip is a single, reversible switch. No big-bang, no coupling breakage.

| Surface | Flag OFF (today) | Flag ON (S5) |
|---|---|---|
| `create-checkout-session` route | returns mock URL (`?mock=true`) | real Stripe Checkout |
| `processing` page `?mock=true` | honored (mock = paid) | **inert** — paid guard always runs |
| `processing` page `none` + `session_id` | n/a (mock path) | reconcile from session (#84), else → Card Capture |
| `reveal` page `none` | renders (mock walk) | → Card Capture paywall |
| `/start` entitlement (`VOICE_CREATION_REQUIRES_PAYMENT`) | no-op | 402 unless {trial, active} |

Flip **all three together**: `VAULT_STRIPE_ENABLED=true` +
`VOICE_CREATION_REQUIRES_PAYMENT=true` + real `STRIPE_PRICE_ID_VAULT_*`.

## Track A — Code (this PR, safe with flags off)

- `processing/page.tsx`: `isMock` gated on `!VAULT_STRIPE_ENABLED`.
- `reveal/page.tsx`: `none → Card Capture` only when flag on.
- `feature-flags.ts` + `.env.example`: comments refreshed to the flip-ready state.
- `vault.ts`: removed the dead `stripePriceId: 'PLACEHOLDER_*'` fields (checkout
  reads env `STRIPE_PRICE_ID_VAULT_*`; `VAULT_PRICING` is display-only).

**Verification of Track A:** typecheck ✅ · lint ✅ · unit 381/381 ✅. The two
flag-conditional guards are NOT unit-tested — this repo has no page-guard test
harness (pages are server components; the suite covers libs/hooks/reducers), and
inventing one for two redirect lines isn't worth it. They are verified by the
Track C walk (both flag states). Stated plainly, not hidden.

## Track B — Owner ops: `.env.local` for the TEST-mode walk

Set these in `.env.local` (Stripe **test** mode — keys start `sk_test_` /
`pk_test_`, price IDs from test-mode Products):

```
VAULT_STRIPE_ENABLED=true
VOICE_CREATION_REQUIRES_PAYMENT=true
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_VAULT_MONTHLY=price_...        # test-mode monthly
STRIPE_PRICE_ID_VAULT_ANNUAL=price_...         # test-mode annual
STRIPE_WEBHOOK_SECRET=whsec_...                # from `stripe listen`, see below
NEXT_PUBLIC_APP_URL=http://localhost:3100      # must match the dev port
# ElevenLabs: a funded/real key so /start actually creates a voice
ELEVENLABS_API_KEY=...
```

Two terminals for the walk:
1. `next dev -p 3100`  (port MUST match `NEXT_PUBLIC_APP_URL`)
2. `stripe listen --forward-to localhost:3100/api/stripe/webhook`
   → copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`, then restart (1).

Log in locally: `node scripts/dev-login.mjs`.

## Track C — The vendor-backed walk (verify, together)

Test card: `4242 4242 4242 4242`, any future expiry / CVC / ZIP.

1. Record a reference clip → land on **Card Capture** (`/app/vault/protect`).
2. Pick a plan → **real Stripe Checkout** opens (not the mock URL).
3. Pay with 4242 → redirect to `/app/voice/processing?session_id=cs_test_...`.
   - **Assert:** no bounce to Card Capture; processing screen shows.
   - The `trial` row is written by the reconcile (#84) even if the webhook lags;
     the `stripe listen` webhook then upserts idempotently (no dup row).
4. `/start` fires (real **ElevenLabs $**) → voice trains → **Reveal**.
   - **Assert:** no 402; `voice_profiles.status` → `ready`.
5. **First Breath → First Message.**
6. **DB asserts:** one `subscriptions` row `status=trial`, correct
   `stripe_price_id`/`billing_period`; a `usage_events` row for the voice
   creation; no duplicate subscription.
7. **Guard re-checks (flag ON):** hitting `/app/voice/processing?mock=true` as a
   `none` user → bounced to Card Capture (mock inert); `/app/vault/reveal` as
   `none` → Card Capture.

## Track D — Prod cutover (after the walk passes)

In Stripe **live** mode: create live Products/Prices, add the prod webhook
endpoint (`https://<domain>/api/stripe/webhook`), copy its signing secret.
In Vercel prod env: set live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, live
`STRIPE_PRICE_ID_VAULT_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and flip
`VAULT_STRIPE_ENABLED=true` + `VOICE_CREATION_REQUIRES_PAYMENT=true`. Redeploy.
Smoke: one real checkout (can refund immediately in the dashboard).

**Analytics:** the monetization event already relocated to Card Capture in S2 (a
note landed with PR #95). S5 flips no new event, so no new analytics note.

## Rollback

Set `VAULT_STRIPE_ENABLED=false` (+ `VOICE_CREATION_REQUIRES_PAYMENT=false`) and
redeploy. All guards revert to mock-walk form; no code revert needed.
