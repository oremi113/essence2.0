---
id: 2026-07-14-voice-create-stale-threshold-shorter-than-max-duration
priority: P2
status: open
opened: 2026-07-14
resolved:
summary: Voice-create "timed out" threshold (3 min) is shorter than the route's own 5-min budget → a slow-but-successful paid voice can be marked failed while the client is still told "ready" *(triage 2026-07-14)*
---

# Voice creation's staleness timeout (3 min) is shorter than its own max run time (5 min)

*(triage 2026-07-14)*
`src/app/api/voice-profiles/[id]/start/route.ts:29` sets `maxDuration = 300` (5 min, to allow the
ElevenLabs call + clip download), but `:32` sets `STALE_PROCESSING_MS = 3 * 60 * 1000` (3 min) as the
"this attempt must have crashed, let the user retry" threshold. The stale-recovery block (`:78-95`)
therefore fires on a creation that is *still legitimately running* between minute 3 and minute 5.

The damage needs a second `POST /start` to arrive in that window (the client re-polls, or the user
reloads and re-taps after waiting three minutes). That second call finds the row `processing` with
`elapsed > 3 min`, marks it **failed**, and returns `{status:"failed"}`. When the original request
then finishes successfully, `persistVoiceReady`'s monotonic `.eq("status","processing")` guard now
matches zero rows, so `vendor_voice_id` is never saved — yet the original request still returns
`{status:"ready"}` to its client (`:334-356` logs the zero-row persist as a benign no-op and continues).

**Why it matters:** the user paid ElevenLabs for a voice that was actually created, but the app throws
the voice ID away, records the profile as *failed*, and simultaneously tells the other browser tab it's
*ready*. That's real money spent for a lost result plus two screens disagreeing about what happened —
exactly the "paid render reported ready but unsaved" failure the codebase already hardened against
elsewhere (FU-43/#66), reopened here by a mismatched timeout constant.

**Fix shape:** set `STALE_PROCESSING_MS` to at least `maxDuration` plus a margin (e.g. 6 min) so a
still-running attempt is never declared stale; and when `persistResult.applied === false` after a
*successful* ElevenLabs call, treat it as a reconcile/error case (surface it or re-read the row) rather
than returning `"ready"`. The two fixes are independent — the constant closes the common case, the
`applied===false` handling closes the residual race.

**Pick up when:** before launch, or the next voice-creation reliability pass. Agent-fixable (constant +
one branch; no migration, no never-touch code).
