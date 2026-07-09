# Manual test plan — trial-abuse guard (F1)

Requires Stripe **test mode** with real price ids
(`STRIPE_PRICE_ID_VAULT_MONTHLY` / `_ANNUAL`), the webhook forwarding to the
running app (`stripe listen --forward-to localhost:3100/api/stripe/webhook`),
and `VAULT_STRIPE_ENABLED` on. Use a test card (`4242 4242 4242 4242`).

## T1 — First-timer gets the trial (regression guard)
1. New user, no `subscriptions` row. Complete checkout from the vault flow.
2. In Stripe Dashboard → the new subscription → **status is `trialing`**, trial
   ends ~7 days out.
3. App: `subscriptions.status = 'trial'`, `trial_ends_at` set.

**Pass:** trial granted for a first subscription.

## T2 — Returning subscriber gets NO trial (the fix)
1. Take the T1 user to a terminal state: cancel via Portal (or
   `stripe subscriptions cancel <id>`), let the webhook write `lapsed`/
   `cancelled`. Confirm the app routes them to `/app/vault/restore`.
2. Tap **Restore** (mode = `restart` → new checkout). Complete it.
3. Stripe Dashboard → the NEW subscription → **status is `active`, no trial**;
   the first invoice was charged immediately.
4. App: newest `subscriptions` row is `active` (not `trial`), no future
   `trial_ends_at`.

**Pass:** no second free trial on restart. **Fail (the bug this closes):** the
new subscription shows `trialing` / 7 more free days.

## T3 — Repeat-abuse loop is closed
1. Repeat T2's cancel→restart a second time.
2. Every restart after the first is charged immediately — never `trialing`.

**Pass:** the cancel-before-convert loop can't farm free trials.

## T4 — History-lookup failure aborts (no silent wrong-trial)
- Covered by unit test `aborts (no checkout) when the prior-subscription lookup
  errors`. To exercise live, simulate a DB read failure (e.g. revoke the
  subscriptions SELECT grant) and confirm checkout returns an error instead of
  creating a session. Not part of the routine pass.

## Not covered here (logged as FOLLOW_UPS)
- #77 double-subscription guard · #78 lapse/cancel label under real dunning ·
  #79 event-ID idempotency. See `docs/FOLLOW_UPS.md`.
