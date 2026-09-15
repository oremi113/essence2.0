---
title: New funnel landmark — first_playback_heard closes the voice-ready → first-message gap
date: 2026-09-10
event: journey.first_playback_heard
type: new-event
pr: pending
impact: Adds the fifth JOURNEY_EVENTS name. Until now the funnel jumped from `voice_profile_ready` straight to message creation, with no signal for MASTER_SPEC Immutable Journey Rule 4 ("first playback must occur before first message creation") — the beat did not exist in code, so it could not be measured. Volume should approximate `voice_profile_ready` once Step 5 ships; a large gap between them is the metric to watch.
---

## What changed

Step 5 First Playback ships as a fifth phase of the First Breath ceremony, and
it emits one new journey landmark:

```
journey.first_playback_heard   { voiceProfileId }
```

## When it fires

**On completed listen, not on arrival.** The event fires when the utterance
finishes, not when the phase mounts.

**Exactly once per mount.** Three routes reach the end of the utterance and only
the first is a completed listen. All three bottom out in the same `endSpeech()`,
which is why the other two fired before review caught it:

| Route | Counts? |
|---|---|
| The line plays through | **yes**, once |
| "Hear it again" replays it | no — the same user, already counted |
| Backgrounding mid-line (`settle()`) | no — the user was not there for it |

The second and third were live defects, found in pre-merge audit against test-plan
row 34 and fixed before this shipped: replay double-counted, and abandoning the
beat counted as hearing it — the precise case this event exists to exclude.
Enforced by a latch in `FirstPlaybackScreen`, covered and mutation-checked in
`tests/unit/first-playback-heard-once.test.tsx`. **If that test is ever loosened,
the 1:1 expectation below stops meaning anything.**

That choice matters for how the number reads: `first_playback_heard` measures
the beat *landing*, not the screen being reached. If you need "reached", that is
a separate event and does not exist yet.

## Why it exists

Immutable Journey Rule 4 has been unverifiable since it was written. The beat
had never been built (`2026-09-08-first-playback-beat-was-never-built`), so the
funnel could not distinguish "the user heard their preserved voice before
writing" from "we never asked them to." This closes that.

## What to watch

- **`voice_profile_ready` → `first_playback_heard` conversion.** These should be
  close to 1:1. A meaningful gap means users are reaching the ceremony and not
  finishing the beat — either abandoning the tab, or the sample failed to render.
- **Silent completions.** The phase plays even when no audio is available: the
  line is on screen and the choreography runs off the cadence model, so the beat
  visually lands and the event still fires. **`first_playback_heard` therefore
  does NOT prove the user heard audio.** Pair it with `voice_sample_rendered` /
  `voice_sample_render_failed` (structured logs, not journey events) to separate
  "heard" from "saw."
- **`voice_profiles.sample_render_count`.** Expected 0 or 1 per profile. Above 1
  means the single-flight claim has a hole and a user was double-billed.

## Schema

No change to the envelope. `trackJourney` adds the usual reserved props
(session_id, app_env, app_version, platform, device_type, schema_version) and
they still win over caller props.

## Test

`tests/unit/journey-analytics.test.ts` locks the event-name set exhaustively.
Adding a sixth landmark will fail that test by design — update it deliberately
and drop a note here in the same PR.
