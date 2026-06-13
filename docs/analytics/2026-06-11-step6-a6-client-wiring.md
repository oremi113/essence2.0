---
title: Step 6 A6 wiring — V1 client events start firing
date: 2026-06-11
event: multiple
type: instrumentation-live
impact: First production emitters for 5 of the 8 V1 catalog events (preview_played, message_saved, message_save_failed, message_discarded, cost_limit_blocked). No schema change; schema_version stays 1. Two deferred-audio caveats documented below.
---

## What changed

The A6 (Preview & Refine, Deferred-Audio) live wiring
(`src/app/messages/new/g/[generationId]/PreviewRefinePageClient.tsx`) is the
first production code to emit these catalog events from
`2026-06-01-step6-events.md`:

| Event | Fires from |
|---|---|
| `step6.preview_played` (#7) | First successful playback-URL resolve per A6 visit; `time_from_a6_arrival_ms` measured from client mount |
| `step6.message_saved` (#4) | `/save` 200; `time_from_flow_start_ms` present only when the flow_id (and its mint timestamp, new in `step6.ts`) survived in sessionStorage — absent on deep-link/refresh arrivals |
| `step6.message_save_failed` (#5) | `/save` non-200; `failure_phase: quota_check` for `vault_limit_reached`, otherwise `unknown` + `error_code` |
| `step6.message_discarded` (#6) | `/discard` 200, with `had_played` |
| `step6.cost_limit_blocked` (#8) | Any 429 from `/regenerate` or `/commit` |

Already firing before this change: `step6.flow_started` (#1, A2 mount).
Still unwired: #2/#3 (A5 doesn't exist), #14 (`vault_limit_blocked` — fires
when C3 is shown, and C3 isn't built; the save-race path currently lands on
Home, see FOLLOW_UPS #38).

## Deferred-audio caveats (catalog gaps, not bugs)

1. **`cost_limit_blocked.limit_kind` gains values** the catalog enum doesn't
   list: `text_reroll_cap` and `audio_render_cap` (the A1 split caps), beside
   the documented `regenerate_cap | edit_note_depth | pending_max |
   hourly_max`. Treat the prop as open-enum when ingesting.
2. **The deferred-audio actions themselves** (free draft, commit, keep) still
   have **no product-catalog events** — they're covered by server structured
   logs only (`step6_variant_previewed`, `step6_commit_complete/_failed`,
   `step6_candidate_kept` — see `2026-06-11-step6-candidate-kept.md`). Under
   the deferred flag, `regenerate_count` stays 0 on these events; the
   exploration depth lives in the server-side `text_reroll_count` /
   `audio_render_count`. Define the candidate funnel events before the A/B
   readout is needed.

## Root cause

New feature wiring (Step 6 A6, Chunk 2). Not a change to existing tracking.

## When

Landed with the A6 live route on `feat/step6-a6-screen`, 2026-06-11. This
partially backfills the V1 "ships with first production flow" milestone in
the catalog note.

## What to watch

- `preview_played` with no subsequent `message_saved`/`message_discarded` —
  the "listened then silently bailed" cohort the funnel was built to see.
- `message_save_failed.error_code == http_0` — client-side network failures
  (the wrapper's fetch threw), distinct from server 5xx.
- Any `cost_limit_blocked` with the new `limit_kind` values once the
  deferred flag turns on for the A/B.
