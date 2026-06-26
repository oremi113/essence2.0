---
title: GET /api/messages exposes play-history, duration, and category
date: 2026-06-16
event: messages_list
type: schema-change
impact: Memory Shelf list responses now carry per-message played/durationSeconds/category; these reflect existing DB columns, not new tracking.
---

**What changed**

`GET /api/messages` (Memory Shelf list) widened its response items with three
fields, mapped from columns that already exist on `messages` but were not
previously exposed over the wire:

- `played: boolean` — derived from `played_count > 0`.
- `durationSeconds: number | null` — `Math.round(audio_duration_ms / 1000)`,
  null when no duration was recorded.
- `category: message_category` — the raw DB enum value (`birthday`,
  `encouragement`, `daily_reminder`, `future_message`, `comfort`, `holiday`,
  `checking_in`).

No new events fire and no new columns were added. This is purely a read-surface
widening to feed the Step 7 Memory Shelf redesign (unplayed-glow + woven
category caption + `m:ss` meta).

**Root cause**

Intentional — Step 7 Chunk 1. The screen needs play-state and duration to render
the unplayed honey glow and the `Kept on <date> · <m:ss>` caption, and the
category to weave its soft occasion line. The data was always in the DB; only
the API projection changed.

**When**

Landed on `main` with the Step 7 Chunk 1 PR (branch
`feat/durable-ceremony-flag-54`), 2026-06-16.

**What to watch**

- `played` is a coarse "ever played" flag, not a count. It reads
  `played_count > 0`. **Caveat (corrected 2026-06-17):** at the time this field
  was first exposed, *nothing wrote `played_count`* — so `played` was always
  `false`. The write was added the next day (see
  `2026-06-17-played-count-write.md`); rows played before then read `false`
  regardless of actual history. Cross-check `played_count`/`last_played_at`
  directly when auditing engagement.
- `durationSeconds` is rounded; do not sum it for precise listening-time
  analytics — use `audio_duration_ms` at the source for that.
- `category` is emitted as the DB enum (`daily_reminder`, `future_message`,
  `checking_in`), not the prototype's short keys (`daily`, `future`, `checkin`).
  Any dashboard grouping on category should key off the enum values.
