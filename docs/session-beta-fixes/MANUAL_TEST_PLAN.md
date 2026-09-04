# Manual test plan — beta payment + message creation

Two halves: what was already verified in a real browser this session, and what
only the owner can do (production).

---

## Part A — verified locally, 2026-09-04

Run: `npx next dev -p 3100` (port must match `NEXT_PUBLIC_APP_URL`).

| # | Step | Expected | Result |
|---|------|----------|--------|
| A1 | `/app/vault/protect` with a ready voice and no subscription | Card Capture renders with plan toggle + "Keep my voice" | ✅ |
| A2 | Tap "Keep my voice" | Full-page navigation to `checkout.stripe.com` (not the mock `?mock=true` route) | ✅ |
| A3 | Read the Checkout summary | **"7 days free · Then $0.00 per year"** | ✅ |
| A4 | Check the form | Card fields present and required — the comp does not skip collection | ✅ |
| A5 | Pay with `4242 4242 4242 4242`, 12/34, 123 | Returns into the app (`/app/vault/reveal` for an already-ready voice) | ✅ |
| A6 | Query `subscriptions` for the user | One row, `status = 'trial'`, real `stripe_subscription_id` (`sub_1UC0yZ…`) | ✅ |
| A7 | `/messages/new/g/<id>` for a finished generation | A6 preview renders ("Here it is, in your voice.") — **not** the 404 | ✅ |
| A8 | `/messages/new` with a finished, unsaved generation | Redirects to that generation's A6 (resume) | ✅ |
| A9 | `/messages/new` with a >5min unfinished generation | `superseded_at` gets stamped; A2 "Who's this one for?" renders | ✅ |

A5 note: uncheck Stripe's pre-ticked "Save my information for faster checkout"
or it demands a phone number before it will submit. That is Stripe Link's own
UI, not ours — worth knowing before watching a tester get stuck on it.

Not run: the 4× CPU throttle pass. These changes are routing and configuration
with no motion surface; the screens themselves are unchanged.

---

## Part B — owner, on production

### B1. Set the environment variables

Vercel → Project → Settings → Environment Variables → **Production**:

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | the production https URL | Stripe's return trip. Unset = testers redirected to localhost after paying. |
| `VAULT_STRIPE_ENABLED` | `true` | Routes checkout through real Stripe. |
| `STRIPE_BETA_COUPON_ID` | `ESSENCE_BETA_100` | Makes it $0. **Unset before charging real money.** |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Test mode for beta. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Same account as the secret key. |
| `STRIPE_PRICE_ID_VAULT_MONTHLY` / `_ANNUAL` | test-mode price ids | Must be from the same mode as the keys. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from B2 | Lifecycle events. |

Leave `VOICE_CREATION_REQUIRES_PAYMENT` off. `DEFERRED_AUDIO_ENABLED` must be
**absent** — it now defaults on, and setting it to `"false"` re-breaks message
creation.

The coupon `ESSENCE_BETA_100` already exists in the Stripe **test-mode**
account. If production uses a different Stripe account or live mode, create the
coupon there too — a coupon id that does not exist makes checkout fail outright.

### B2. Point a Stripe webhook at production

Stripe Dashboard (test mode) → Developers → Webhooks → Add endpoint:
`https://<prod-url>/api/stripe/webhook`. Copy the signing secret into
`STRIPE_WEBHOOK_SECRET`.

Without it, the `success_url` reconcile (FU-84) still writes the first
subscription row — so checkout *appears* to work — but every later lifecycle
event (renewal, cancel, payment failure, trial end) is silently dropped.

### B3. Redeploy

Env changes do not apply to an existing deployment. Auto-deploy from `main` is
currently broken (see the Vercel deploy notes), and the deploy hook dedups an
unchanged commit — so this needs a **new commit** or a manual redeploy.

### B4. Walk it as a tester

1. New account → onboarding → record.
2. At the end of recording: **Stripe Checkout appears**, showing $0.00.
3. Pay with `4242 4242 4242 4242`.
4. You land back in the app, not on localhost.
5. Create a message → you reach the preview screen, **not** "We couldn't find
   that page."
6. Save it.

### B5. Clear anyone already stuck

Testers who hit the 404 before this fix each left an active
`pending_generations` row that blocks new attempts. The fix clears it
automatically on their next visit to "create a message" — one visit, no action
needed from them. If someone reports still being blocked after two attempts,
that is a new bug, not a leftover.
