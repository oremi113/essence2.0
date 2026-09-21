---
id: 2026-07-24-stripe-webhook-non-active-statuses-map-to-terminal-lapsed
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: true
summary: The Stripe webhook maps `incomplete` / `incomplete_expired` (and any unhandled status via `default`) to the TERMINAL `lapsed`, so if such a status is ever written for a live subscription id, the confirming `active` event is ignored and the user is permanently locked out (and can double-subscribe via restore) — latent landmine, owner-paired (never-touch webhook) *(triage 2026-07-24)*
---

# Stripe webhook `deriveStatus` sends non-active statuses to the terminal `lapsed` — a latent lockout / double-charge landmine

*(triage 2026-07-24 — discovery. **Owner-paired — never-touch (Stripe webhook).** Flagged only; the
agent does not propose fixing webhook logic. Distinct from FU-79 (event-ID idempotency) and FU-84
(success_url race) — this is about the status *mapping*.)*

`src/app/api/stripe/webhook/handlers.ts` — `deriveStatus` (l.166-183) maps `incomplete` and
`incomplete_expired` to `'lapsed'`, and the `default:` branch maps *any* unhandled Stripe status to
`'lapsed'` too. `'lapsed'` is in `TERMINAL_STATUSES` (l.164), and `upsertSubscription` refuses to move a
row once it's terminal (l.205-210: "ignoring … event for already-terminal subscription"). Stripe does
not guarantee event ordering, so two sequences leak:

- `customer.subscription.created` with status `incomplete` arrives (or is processed) *after*
  `checkout.session.completed` already wrote `active`. `active` is not terminal, so the `incomplete`
  write drags the row `active → lapsed`.
- Or `incomplete` is written first and the confirming `active` / `updated` event is then dropped by the
  terminal guard.

Either way a paying user reads as `lapsed`, is denied the paid path, and the restore screen routes them
to *restart* → a **second** Stripe subscription → double charge. The `default → lapsed (terminal)` case
is the sharper edge: any Stripe status the switch doesn't handle (e.g. `paused`) becomes permanently
terminal with no recovery.

**Why it matters today vs later:** **currently low-risk** — this app creates subscriptions with a 7-day
trial, so they start `trialing` (→ `trial`), not `incomplete`, and the `incomplete` path shouldn't fire
at creation. It becomes a genuine **P2 double-charge** the moment a non-trial / immediate-charge checkout
(or SCA-required initial payment, common in the EU) is introduced — the mapping bakes the bug in ahead of
that feature. That "the next feature built on top of it breaks" shape is exactly the landmine band.

**Fix shape (owner's call — never-touch webhook):** map `incomplete` / `incomplete_expired` to a
non-terminal transient status (keep as `past_due`, or add a `pending`), and make `default` non-terminal
too. Only `canceled`-derived and retry-exhaustion deletes should be terminal.

**Pick up when:** paired with any change that adds a non-trial / immediate-charge checkout path, or the
next Stripe-lifecycle audit — whichever comes first. Owner conversation required (webhook logic is on the
never-touch list).
