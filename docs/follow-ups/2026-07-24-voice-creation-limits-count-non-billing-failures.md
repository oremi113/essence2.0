---
id: 2026-07-24-voice-creation-limits-count-non-billing-failures
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: Voice-creation limits count non-billing failures — validation rejects burn the 5/day cap (24 h lockout) and transient infra failures burn the permanent 3-attempt cap — locking users out of a paid feature they never actually consumed *(triage 2026-07-24)*
---

# Voice-creation limits count non-billing failures, so innocent users get locked out of a paid feature they never consumed

*(triage 2026-07-24 — discovery. Distinct from the prior "cost-control / rate-limit layer reviewed —
caps are sound" note in FOLLOW_UPS.md: that pass judged the **overspend** direction; this is the
opposite direction — the caps over-count and wrongly **lock users out**.)*

Two sibling accounting bugs in `src/app/api/voice-profiles/[id]/start/route.ts`:

1. **The daily cap counts validation rejects.** The `voice_create` usage event is recorded (l.122)
   *before* the clip-count and total-byte validation (l.155 `INSUFFICIENT_CLIPS`, l.164
   `CLIPS_TOO_SHORT`). `countRecentEvents` (`src/lib/rate-limit.ts:81-103`) counts events **by `action`
   only, regardless of `outcome`** — `updateUsageEventOutcome(..., "rejected")` changes the row but the
   count never filters on outcome. So 5 attempts that bounce on too-few / too-short clips (default
   `maxVoiceCreationsPerDay = 5`) exhaust the daily quota and hard-lock the user out of voice creation
   for 24 h — despite **zero** ElevenLabs cost. The quota meant to bound *paid* creations is spent by
   pure validation rejects.

2. **The permanent 3-attempt cap counts transient infra failures.** `attempt_count` is incremented at
   the `processing` lock (l.178-190), *before* the clip download. A transient Storage blip or a
   transient error on the clips SELECT makes `downloadClipsForVoiceProfile` return `download-failed` /
   `no-clips` (`src/lib/voice-creation/download-clips.ts` — a transient SELECT error is indistinguishable
   from "genuinely no clips"), and the route then marks the profile `failed` with the attempt already
   spent. `isVoiceProfileRetryAllowed` caps at `VOICE_PROFILE_MAX_ATTEMPTS = 3` with **no time-based
   reset** (`src/lib/voice-training/backoff.ts:33`), so three transient infra failures make a profile
   whose 10+ clips are all present and valid **permanently un-creatable**.

**Why it matters:** both are support-ticket generators on a paid, launch-critical feature — a user who
did nothing wrong (or hit a momentary infra hiccup) is told they've hit a limit and, in case (2), can
*never* create their voice again without manual DB intervention. No ElevenLabs cost was ever incurred in
either case, so the limits are punishing the wrong thing.

**Fix shape:** (1) record the `voice_create` usage event only once the run passes validation and reaches
the `processing` lock (move l.122 below l.175), or have `countRecentEvents`/`checkVoiceCreationLimit`
count only started-that-reached-vendor outcomes (exclude `rejected`). (2) Don't count infra-class
failures against the permanent attempt cap — roll back the `attempt_count` increment on
`DOWNLOAD_FAILED` / DB-error `no-clips`, or exclude those `last_error_code`s from the cap so only real
ElevenLabs failures consume attempts.

**Pick up when:** the next voice-creation reliability / cost-control pass. Cheap, self-contained, and
worth pairing with the staleness-window fix (`2026-07-24-voice-creation-staleness-window-shorter-than-work-budget`)
since they live in the same route.
