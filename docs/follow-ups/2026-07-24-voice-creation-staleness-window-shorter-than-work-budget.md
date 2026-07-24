---
id: 2026-07-24-voice-creation-staleness-window-shorter-than-work-budget
priority: P2
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: Voice-creation staleness timeout (3 min) is shorter than the route's own 5-min work budget → a slow ElevenLabs creation can be marked "failed" mid-run while it still bills, orphaning the paid voice and pushing the user into a second paid creation *(triage 2026-07-24)*
---

# Voice-creation staleness window (3 min) is shorter than the route's 5-min work budget → a still-running paid creation can be killed, orphaning a billed ElevenLabs voice

*(triage 2026-07-24 — discovery, voice-profile creation lifecycle)*

`src/app/api/voice-profiles/[id]/start/route.ts:29` sets `maxDuration = 300` (5 min — "allow
ElevenLabs + download time"), but `:32` sets `STALE_PROCESSING_MS = 3 * 60 * 1000` (3 min). Request A
locks the profile to `processing` (`last_attempt_at = now`, l.178-190) and runs `createVoiceFromClips`,
which the route itself budgets up to 5 minutes. If a second `POST /start` for the same profile lands
after 3 minutes (impatient user, page refresh, a retry tap — the in-memory dedup gate is only 5 s and
explicitly non-authoritative), it sees `elapsed > STALE_PROCESSING_MS` (l.81) and marks the profile
`failed` / `TIMEOUT` (l.82-88) **while A is still legitimately running**. When A's ElevenLabs call
then succeeds, `persistVoiceReady`'s monotonic guard `.eq("status", "processing")`
(`src/lib/voice-training/persistVoiceReady.ts`) matches zero rows (the row is now `failed`), so
`persistResult.applied` is `false` — logged as a benign noop (l.334-343) — and A **still returns
`{ status: "ready" }`** (l.356).

**Why it matters:** the vendor voice was created and **billed** (~$6 ElevenLabs), but its
`vendor_voice_id` never gets stored (it's orphaned at ElevenLabs), the DB row reads `failed`, and the
user — shown a failure — retries into a **second paid creation**. The timeout can fire during work the
route's own budget considers valid; that mismatch is the root cause. Note the l.302-307 comment already
shows awareness of the staleness-window drift (it cites FU-43), but it only handles the *write-error*
path — the *noop-after-success* path (row already flipped to `failed`) is unhandled.

**Fix shape:** make `STALE_PROCESSING_MS` strictly greater than `maxDuration` (e.g. ≥ 6 min) so
recovery can only trigger after the in-flight budget is truly exhausted. Better still, treat a
`persistVoiceReady` noop-after-success as a reconciliation event: re-fetch the row, and if it's `failed`
with no `vendor_voice_id`, force it to `ready` with the just-billed `voice_id` rather than silently
returning "ready" over a `failed` row.

**Pick up when:** the next voice-creation / Step-6 cost-control pass, or before public launch — it's a
paid-vendor + data-integrity landmine, low-frequency (needs a >3-min creation racing a retry) but real.
