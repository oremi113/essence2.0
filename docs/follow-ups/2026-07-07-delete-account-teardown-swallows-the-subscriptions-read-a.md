---
id: 2026-07-07-delete-account-teardown-swallows-the-subscriptions-read-a
legacy_id: 85
priority: P2
status: resolved
opened: 2026-07-07
resolved: 2026-08-10
owner_paired: true
summary: Delete-account teardown swallows the `subscriptions` read → a closed account can keep being billed *(triage 2026-07-07/-10, merged)*
---

# Delete-account teardown swallows the `subscriptions` read → a closed account can keep being billed

> **✅ RESOLVED 2026-08-10** (`refactor/fu-85-subscriptions-read-check`). Root cause:
> the step-1 subscriptions `.select()` destructured only `{ data }`, discarding
> `{ error }` — and a Supabase select resolves as `{ data: null, error }` rather than
> throwing, so the surrounding `try/catch` never saw a read failure. **Fix:** capture
> `{ error: subsError }` and abort into the "we couldn't finish closing your account"
> failure terminal *before* any irreversible step, giving the read the same fail-closed
> treatment the writes already get via `checkedWrite`. On a transient read failure the
> teardown now stops before cancelling nothing/deleting everything, so a live
> subscription can never be stranded billing a deleted account. Guarded by
> `tests/unit/settings-delete-account-subscriptions-read.test.ts` (read-error → aborts
> with no cancel/row-delete/auth-delete/wipe; healthy read → teardown proceeds). This is
> a genuine root-cause fix, not a workaround.

*(merged: triage 2026-07-07 #80 + triage 2026-07-10 #81 — same finding)*
`src/app/app/settings/actions.ts:191` — `deleteAccountAction` step 1 reads the user's
subscriptions as `const { data: subs } = await service.from('subscriptions').select(...)`,
discarding `{ error }`. A Supabase `.select()` that errors returns `{ data: null, error }`
(it does not throw, so the surrounding `try/catch` never sees it). On a transient read
failure `subs` is null, `for (const sub of subs ?? [])` iterates zero times, **no Stripe
subscription is cancelled**, and the teardown proceeds to wipe storage, delete every row,
and delete the auth user anyway — returning `ok: true`.
**Why it matters:** the step-1 comment (l.159-162) promises "cancel any live Stripe
subscription so a deleted account is never billed … a hard failure aborts BEFORE any data
loss." A swallowed read defeats exactly that: a momentary DB hiccup during deletion leaves
a live subscription charging the user's card for an account that no longer exists — and
because the `subscriptions` row is cascade-deleted with the auth user, the
`stripe_subscription_id` is gone, so it can't be found and cancelled later. Money + trust +
a stated safety invariant, on the irreversible delete path. Not live today
(`ACCOUNT_DELETE_ENABLED` is OFF) — a landmine to close before the flag flips.
**Fix shape:** destructure `{ error }` on the subscriptions select and abort into the "we
couldn't finish closing your account" failure terminal *before* any data loss if it's
non-null — the teardown's reads need the same fail-closed treatment as its writes. (The
repo's `checkedWrite` lint guard covers *writes*, so this *read* slipped through.)
**Pick up when:** before `ACCOUNT_DELETE_ENABLED` is enabled (part of that sign-off). Pairs
with #86/#88 and FU-77/78 as billing-hardening. Owner-paired (Stripe/auth teardown).
