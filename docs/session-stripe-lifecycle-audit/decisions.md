# Decisions — Stripe lifecycle audit

## D1 — The 7-day trial is a one-time, first-subscription benefit

**Decision:** grant `trial_period_days: 7` only when the user has no prior
subscription row of any kind. Returning subscribers (restart after
lapse/cancel, or any repeat checkout) are charged immediately.

**Why:** the restore flow deliberately routes lapsed/cancelled users back
through `createCheckoutSession`. With an unconditional trial, a user could
cancel before each trial converts and re-subscribe forever — perpetual free
access. This is the standard SaaS default and is exactly what "harden against
trial abuse" (the finding the owner selected to fix) means.

**Product consequence (worth a second look):** a genuinely returning subscriber
now sees an immediate charge rather than "7 days free." That is the correct
anti-abuse behavior, but it is a real change to the restart funnel. If the
product ever wants a *grace* trial for good-faith returners (e.g. someone who
lapsed a year ago), that's a deliberate future choice — reintroduce a bounded,
history-aware trial then. Not telemetry-schema-affecting, so no
`docs/analytics/` note; flagged here because it changes conversion semantics.

**Keyed on `user_id`, not the Stripe customer.** `user_id` is stable; the
Stripe customer id can be reset by the file's own stale-customer reconciliation
(deleted-in-Stripe → new customer). Keying on the customer would reopen the
loophole for that edge. RLS lets a user SELECT their own subscription rows, so
the existing server client suffices — no service-role escalation.

**Lookup error → abort, don't guess.** A failed history read throws
(`profile_lookup_failed`), matching the file's existing profile-lookup pattern.
Fail-open would re-open the abuse vector on a transient blip; fail-closed
(silent no-trial) would wrongly charge a legitimate first-timer. Aborting lets
the caller retry with the trial state unambiguous.

## D2 — Scope grew, by explicit owner request, from F1 to F1+F2+F3

Initial scope was the HIGH money-path finding (F1) only; F2/F3/F4 were logged as
FOLLOW_UPS #77/#78/#79. The owner then asked to continue, so **F2 (double-sub
guard) and F3 (lapse/cancel label) were subsequently built in this same
session** — each as its own commit, re-agreed before starting (not silent scope
creep). **F4 (event-ID ledger) remains deferred** (#79): lowest severity,
handlers are idempotent by construction, and it needs a DB migration. On merge,
#77 and #78 flip to RESOLVED; #79 stays open.

## D2a — F2 is a best-effort guard, not an atomic one

F2 reads the `subscriptions` table then decides — there is no DB unique partial
index on live subscriptions, so it can't prevent a duplicate created in the
"checkout session started, webhook not yet written" window, nor two truly
concurrent checkouts. It backs a direct/abnormal POST (the happy-path UI already
routes subscribed users away), and the code comments + README are deliberately
honest about this — no race-safety is claimed. Making it a hard guarantee needs
a partial unique index `(user_id) WHERE status IN ('trial','active','past_due')`;
logged as a follow-up on merge (see handoff.md).

## D3 — Fresh branch, not the stale `feat/stripe-hardening`

`feat/stripe-hardening` is 43 commits behind `main` and its core files are
byte-identical to `main` (its work was folded into PR #61). Continuing there
would produce a conflict-prone artifact. Owner chose a fresh branch off `main`.
The stale branch can be deleted once this is confirmed — its commit adds nothing
`main` doesn't already have.
