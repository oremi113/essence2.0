---
title: Step 6 vault_limit_blocked now fires (C3 Vault Limit shipped)
date: 2026-06-14
event: step6.vault_limit_blocked
type: new-event
impact: step6.vault_limit_blocked (catalogued 2026-06-01 as event #13) starts emitting now that the C3 Vault Limit screen exists. surfaced_from splits a2_entry (cap gate before the flow) vs save_race (the /save 403 mid-flow). No events before 2026-06-14 — absence is "screen didn't exist," not "no one hit the cap."
---

## What changed

The C3 Vault Limit screen (`/messages/limit`) shipped in the Step 6 spine
Chunk 8 build. Its page client fires `step6.vault_limit_blocked` once on
mount with `surfaced_from`:

- `a2_entry` — the `/messages/new` cap gate redirected a 3/3 user before
  the flow started (also the default for direct navigation to
  `/messages/limit`).
- `save_race` — the `/api/messages/save` race-case 403 (`vault_limit_reached`)
  pushed a mid-flow user here after another tab saved their 3rd.

The event carries the standard Step 6 globals. On the `save_race` path the
push deliberately preserves `flow_id` (the screen clears it after emitting),
so the block correlates to the flow it ended. On `a2_entry` there is usually
no active flow, so `flow_id` is null — expected, not a gap.

## Root cause

Intentional. The event name + props were defined during design (2026-06-01
catalog, event #13) but the trigger surface didn't exist until C3 was built.
Prior to C3, `vault_limit_reached` saves routed to Home and fired nothing
(FOLLOW_UPS #38, by design).

## When

Landed on the `step6-a4a5-forward-wiring` branch 2026-06-14 (Chunk 8);
reaches `main` when that branch merges.

## What to watch

- First non-null `vault_limit_blocked` volume appears from this date. Don't
  read pre-2026-06-14 zero as "no users hit the cap" — the screen and event
  simply weren't live.
- `surfaced_from` skew: a2_entry should dominate once users accumulate three
  saves; save_race should be rare (multi-tab races only). A save_race spike
  would suggest the A2-entry gate is being bypassed.
- schema_version stays 1 (no schema change — the event was already specced).
