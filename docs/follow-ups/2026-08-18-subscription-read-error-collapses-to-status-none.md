---
id: 2026-08-18-subscription-read-error-collapses-to-status-none
priority: P3
status: open
opened: 2026-08-18
resolved:
summary: A subscription-status DB read *error* is collapsed into `status: 'none'` (identical to "never subscribed"), so a transient Supabase blip bounces a paying user to the paywall and 403s their save *(triage 2026-08-18)*
---

# A subscription read error collapses to `status: 'none'` → paying user hits the paywall

**What:** `getSubscriptionStatus` in `src/lib/subscription/get-status.ts:27` uses
`if (error || !data)` and returns `status: 'none'` for both branches — so a genuine DB read
*error* is indistinguishable from "this user genuinely has no subscription."

**Why it matters:** every gate treats `none` as unpaid. So a transient Supabase error
(timeout, connection blip) on the status read makes a live `trial`/`active` customer look
unsubscribed for that request: they get bounced to the paywall (`/app/vault/protect`,
`/app/voice/processing`, etc.) and `POST /api/messages/save` returns 403 "subscription is
not active" to someone who is paying. It self-heals on the next successful read, so it's
transient rather than permanent — but it's a paying customer being told they haven't paid,
which erodes trust at exactly the wrong moment.

**Fix shape:** separate the two cases. On `error` (as distinct from empty `data`), either
throw so the caller can render a real "something went wrong, retry" state, or return a
distinct sentinel status that gates treat conservatively — failing toward *access* for an
established customer, not toward the paywall. Keep the `!data → 'none'` mapping for the
genuinely-no-subscription case.

**Pick up when:** next time the subscription/vault-gating layer is touched. Agent-fixable
(a read-helper + the gates that consume it; confirm the desired fail-direction with the
owner if it changes user-visible gating behaviour).
