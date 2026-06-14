---
title: Step 6 waitlist_joined now fires (C2 Waitlist shipped)
date: 2026-06-14
event: step6.waitlist_joined
type: new-event
impact: step6.waitlist_joined (catalogued 2026-06-01 as event #12) starts emitting now that the C2 Waitlist screen exists. surfaced_from splits c1 / c2_direct / c3; features_selected is the V2 demand signal and lives ONLY in this event (not persisted). Can fire more than once per user (idempotent re-join). No events before 2026-06-14.
---

## What changed

The C2 Waitlist screen (`/messages/waitlist`) shipped in the Step 6 spine
Chunk 9. On a successful join its page client fires `step6.waitlist_joined`
with:

- `surfaced_from` — `c1` (ceremony), `c2_direct` (direct nav), or `c3` (vault
  limit), from the `?from` param. Mirrored into the durable
  `legacy_waitlist.source` column for cross-checking.
- `features_selected` — array of the V2 feature `value`s the user picked, in
  registry order (`more-messages`, `scheduling`, `reminders`, `multi-profile`,
  `longer-messages`). **This is the only place feature picks are recorded** —
  per the C2 data-model decision, the durable `legacy_waitlist` row stores
  email + source only (no features column; a migration was deferred). So the
  feature-demand signal is analytics-only and inherits analytics' best-effort
  delivery.

## Root cause

Intentional. The event name + props were defined during design (2026-06-01
catalog, event #12) but the trigger surface didn't exist until C2 was built.

## When

Landed on the `step6-a4a5-forward-wiring` branch 2026-06-14 (Chunk 9);
reaches `main` when that branch merges.

## What to watch

- **Fires ≥1× per user.** A re-join (e.g. a capped user revisiting C3 → C2)
  POSTs again; the row insert is idempotent (unique user_id → 200) but the
  client still emits `waitlist_joined` each time, possibly with different
  `features_selected`. Treat repeat emits as re-expressed demand; dedup on
  `user_id` for "unique joiners."
- **features_selected is lossy.** It's not in the DB. A dropped analytics
  event loses that pick set permanently — fine for a soft demand signal, but
  don't treat the feature counts as authoritative conversion data.
- **surfaced_from cross-check.** `legacy_waitlist.source` is the durable twin
  of `surfaced_from`; if the two diverge in aggregate, suspect event loss.
- Email edits on re-join are NOT persisted (the table is append-only; first
  email wins). schema_version stays 1.
