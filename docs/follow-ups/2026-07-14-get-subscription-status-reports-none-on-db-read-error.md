---
id: 2026-07-14-get-subscription-status-reports-none-on-db-read-error
priority: P3
status: open
opened: 2026-07-14
resolved:
summary: `getSubscriptionStatus` collapses a DB read *error* into the same `status: 'none'` as "never subscribed" → a paying user can be treated as unpaid (bounced toward the paywall) during a transient database blip *(triage 2026-07-14)*
---

# `getSubscriptionStatus` reports "not subscribed" when the database read fails

*(triage 2026-07-14)*
`src/lib/subscription/get-status.ts:27-36` — the guard `if (error || !data)` returns `status: 'none'`
for **both** a genuine query failure (`error`) and the legitimate "this user has no subscription row"
case (`!data`). A transient Supabase/network error therefore makes an actively-paying subscriber look
exactly like someone who never paid, to every entitlement check that consumes this helper (vault access,
the save-gate, the reveal/protect guards).

**Why it matters:** on a brief database hiccup, a real paying customer can be told their subscription
isn't active and pushed back toward the pay wall / restore screen — for our 45–70 audience that reads as
"they lost my vault," which is alarming and erodes trust, even though nothing about their billing
actually changed. It self-heals on the next successful read, so it's transient rather than permanent
data loss, but a *money-read* path should never make "the database blinked" indistinguishable from
"never paid."

**Fix shape:** split the two branches — on a real `error`, either throw (let the caller decide to retry
or keep access) or return a distinct `unknown`/`error` state, and only return `'none'` when the query
*succeeds* with no row. Then callers can fail safe (retain access / retry) instead of silently revoking
entitlement on a transient blip.

**Pick up when:** next subscription/entitlement hardening pass, or before launch. Agent-fixable (plain
read helper — not webhook logic, not auth). Consider auditing the call sites so a new `unknown` state
degrades gracefully.
