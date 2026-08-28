---
id: 2026-08-28-get-subscription-status-folds-read-error-into-none
priority: P3
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: "`getSubscriptionStatus` collapses a transient DB read error into status `'none'` → a paying user can be bounced to the paywall on a read blip; the repo's recurring swallowed-error class *(triage 2026-08-28)*"
---

# `getSubscriptionStatus` conflates "read failed" with "never subscribed"

*(triage 2026-08-28)*
`src/lib/subscription/get-status.ts:27` — the single source of truth for a user's subscription state treats a query error and a genuinely-absent row identically:

```ts
const { data, error } = await supabase.from('subscriptions')…maybeSingle();
if (error || !data) {
  return { status: 'none', … };   // <- a transient read error becomes a definite "no subscription"
}
```

**Why it matters:** this is the repo's recurring swallowed-error bug class (cf. FU-42, FU-43, FU-44) on the money path. Consumers diverge on the blast radius: the processing-page paywall (`src/app/app/voice/processing/page.tsx`) and home routing read `'none'` as "not entitled" and bounce the user toward checkout, so a genuinely-paying user who hits a momentary Supabase read error is shown the paywall (self-corrects on refresh, but it's a paid-customer-locked-out moment). The entitlement/save gates read `'none'` and fail *closed*. The behavior is therefore both wrong and inconsistent, and every new caller inherits the ambiguity.

**Fix shape:** distinguish `error` from `!data`. On `error`, surface a retryable/unknown state (throw, or return a distinct `status` the callers handle as "couldn't read, don't downgrade entitlement") rather than folding it into `'none'`; only a truly missing row is `'none'`. Add a unit test for the error branch.

**Pick up when:** next subscription/entitlement touch, or the next pass on the swallowed-error class. Agent-fixable (a lib read helper — not migrations/webhook/auth), but it feeds paywall decisions, so verify each caller's error handling when changing the contract.
