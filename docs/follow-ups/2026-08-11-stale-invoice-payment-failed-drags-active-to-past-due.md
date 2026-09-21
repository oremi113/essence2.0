---
id: 2026-08-11-stale-invoice-payment-failed-drags-active-to-past-due
priority: P3
status: open
opened: 2026-08-11
resolved:
summary: "A stale or duplicate `invoice.payment_failed` can drag a recovered `active` subscription back to `past_due` *(triage 2026-08-11, salvaged from the monolith 2026-09-21)*"
---

# Stripe webhook: a stale/duplicate `invoice.payment_failed` can drag a recovered `active` subscription back to `past_due`

*(triage 2026-08-11 - originally written into the legacy `docs/FOLLOW_UPS.md`
monolith by PR #127, which never landed. Salvaged into the per-file ledger on
2026-09-21 and verified to have no existing per-file entry before copying.)*

`src/app/api/stripe/webhook/handlers.ts:138` — `handlePaymentFailed` guards its update with
`.in('status', ['trial','active','past_due'])`. The comment protects terminal states but leaves
`active` overwritable.

**Why it matters:** A customer who already fixed their card and is fully active could suddenly see
the "your payment failed" dunning banner again for no reason, because a delayed/duplicate webhook
from the earlier failure lands after they've recovered. It self-heals only on the next
`subscription.updated` (possibly a full billing period away).

**Failure scenario (needs out-of-order delivery, which Stripe does not guarantee against):** invoice
fails → row `past_due`; user updates card, retry succeeds → `subscription.updated` (active) → row
`active`; a duplicate/delayed `invoice.payment_failed` for the *original* failure arrives, matches the
now-`active` row, and overwrites `status='past_due'`.

**Fix shape (owner conversation — Stripe webhook = never-touch):** don't let a stale failure reverse a
recovery — only apply `past_due` when the row isn't already `active`, or key the update to the specific
invoice/period so an older failed-invoice event can't override a newer success.

**Pick up when:** before launch, or first false-dunning report. Owner-paired webhook change.
