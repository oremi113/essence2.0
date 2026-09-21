---
id: 2026-09-08-beta-coupon-comps-every-subscriber-if-left-set
priority: P2
status: open
opened: 2026-09-08
owner_paired: true
summary: "`STRIPE_BETA_COUPON_ID` applies a 100%-off coupon to EVERY checkout with no live-mode guard — one env var left set at launch comps every real subscriber $0 forever, silently *(triage 2026-09-08)*"
---

# The beta $0 coupon has no launch guardrail — a stray env var comps everyone forever

*(surfaced reviewing the #142 beta-checkout change, 2026-09-08)*

`src/lib/stripe/create-checkout-session.ts:189-214`

To let beta testers walk the real Stripe Checkout and be charged $0 (so the
webhook, the `subscriptions` row, and the FU-84 reconcile all run for real before
launch), #142 added `STRIPE_BETA_COUPON_ID`: when set, a 100%-off coupon is
attached to **every** checkout session, plus `payment_method_collection: 'always'`
so a card is still collected.

The only thing stopping this from comping paying customers is a code comment —

> `// UNSET THIS BEFORE CHARGING REAL MONEY. Leaving it set in a live-mode`
> `// environment comps every subscriber, forever.`

— and a matching line in `.env.example` (`STRIPE_BETA_COUPON_ID=  # Unset it
before going live`). There is **no** code enforcement: nothing checks whether the
Stripe key is in live mode, nothing warns, nothing refuses the coupon in
production. `grep` confirms the variable is read at exactly one site and guarded
nowhere else.

**Why it matters (plain language):** on launch day someone flips ESSENCE to real
Stripe keys but forgets to clear this one leftover beta variable — and every
person who subscribes is silently charged **$0, forever**. The app looks
completely healthy: real Checkout screen, real card collected, a genuine
`trial`/`active` subscription row written, no error anywhere. The money just
never arrives, and nobody notices until the first Stripe payout is empty. It is
the same silent-env-var failure class as the just-logged
`NEXT_PUBLIC_APP_URL`-localhost item (`2026-09-04-app-url-localhost-fallback-on-prod-redirects`),
but this one leaks *revenue* rather than stranding a redirect, which makes it a
step more severe.

**Fix shape (owner-paired — Stripe + an env flip, so flagged not auto-fixed):**
make it impossible to comp silently in live mode. Options, cheapest first:
  (a) In `createCheckoutSession`, ignore `STRIPE_BETA_COUPON_ID` (and log a loud
      warning) whenever the Stripe secret key is a live key (`sk_live_…`) — the
      coupon then only ever applies under test keys, so a forgotten value can
      never charge a real customer $0. Smallest, self-enforcing.
  (b) Add it to a real `env.ts` validation that fails the build/boot if a
      live-mode deploy still carries the beta coupon.
  (c) At minimum, make the launch runbook's "unset the coupon" step a checklist
      item with a verification, not just a comment.
Prefer (a): a human checklist is exactly what failed here (the flag was never
written to `.env.example`/Vercel in the first place, per #142).

**Pick up when:** BEFORE switching to live Stripe keys / taking the first real
payment — this is a launch-gate item, not post-launch cleanup.
