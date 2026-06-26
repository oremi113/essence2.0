---
title: messages.played_count is now written on playback
date: 2026-06-17
event: play_signed_url
type: behavior-change
impact: played_count/last_played_at start populating on every playback; before today they were never written, so all historical values are 0/null regardless of real play history.
---

**What changed**

`GET /api/messages/:id/play` now records the play: on successfully issuing a
playback signed URL it does

```
UPDATE messages
   SET played_count = played_count + 1,   -- read-modify-write
       last_played_at = now()
 WHERE id = :id AND user_id = :uid
```

Best-effort: a failed counter write is logged (`play_count_update_failed`) but
does not fail playback. The write is the signal behind the Memory Shelf's
`played` flag (`played_count > 0`) — the "unheard" honey glow retires once a
message has been played.

**Root cause**

Gap found during the Step 7 live-verify (2026-06-16): the column existed
(default 0) and was read by the shelf, but **no code path ever wrote it**, so
`played` was permanently `false` and the unplayed glow never turned off across
sessions. This change adds the missing write.

**When**

Landed on `main` with the Step 7 follow-up, 2026-06-17 (branch
`docs/step7-memory-shelf-design`).

**What to watch**

- **Hard discontinuity at 2026-06-17.** Any `played_count`/`last_played_at`
  before this date is unrecorded, not "never played." Don't compute
  engagement/replay metrics across the boundary.
- **"Play" = playback URL issued**, not "listened to completion." `played_count`
  counts signed-URL issues; it over-counts vs. actual finished listens
  (a user can open the overlay, fetch the URL, and not finish). It's a coarse
  "has been opened for playback" counter, adequate for the binary glow.
- Read-modify-write, not an atomic SQL increment, so a rapid double-play can
  undercount by one. Harmless for the glow (only needs `> 0`); don't treat the
  count as exact.
