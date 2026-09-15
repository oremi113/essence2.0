---
title: Voice samples now render on demand — sample_render_count changes meaning, and a spend path moves to a GET
date: 2026-09-15
event: multiple
type: behavior-change
pr: 145
impact: "`GET /voice-profiles/:id/sample/play` can now issue a paid ElevenLabs render, where before it never spent. Adds `voice_sample_rendered_on_demand`, `voice_sample_render_cap_reached`, `voice_sample_render_rate_limited`. `sample_render_count` stops being a pure processing-time metric and becomes partly ceremony-time, so its timestamp distribution shifts — do not read a change in when renders happen as a change in how many."
---

## What changed

**A GET can now spend money.** `GET /api/voice-profiles/:id/sample/play`
previously refused with 404 when a profile had no sample. It now renders one,
gated by the voice-creation daily cap, the single-flight claim, and a new
per-profile billing ceiling.

Three new structured log events (not journey events):

| Event | Meaning |
|---|---|
| `voice_sample_rendered_on_demand` | A ceremony entry triggered a render. `meta.rendered: false` means a concurrent caller finished it first. |
| `voice_sample_render_cap_reached` | Refused: profile is at `VOICE_SAMPLE_MAX_RENDERS` (default 3). Terminal — never retried. |
| `voice_sample_render_rate_limited` | Refused before any render by the daily voice-creation cap. |

The ceremony's prefetch also moved from the `detail` phase to component mount,
so the request now fires ~10s and two user taps earlier than it did.

## Root cause

A gap, not a redesign. `ensureVoiceSample` had one caller, inside the branch of
`/voice-profiles/:id/start` that runs only when a **brand-new** voice was just
created — and that route returns early at `status === "ready"` long before
reaching it. Every profile that existed when Step 5 shipped could therefore
never get a sample by any path, making First Playback permanently silent for
exactly the users already in the beta. See
`docs/follow-ups/2026-09-15-existing-voice-profiles-can-never-get-a-sample.md`.

## When

2026-09-15, on `feat/step5-first-playback` (PR #145), before that branch merged.

## What to watch

- **`sample_render_count` timestamps, not totals.** Renders used to cluster at
  voice-creation time. They will now also appear at first ceremony entry, in a
  one-time wave as pre-Step-5 profiles pass through. That wave is expected and is
  not a regression — it is the backlog draining. **The count per profile should
  still be 0 or 1**; anything above 1 still means a user was billed twice for one
  artifact, and that reading is unchanged.
- **`voice_sample_rendered_on_demand` should decay toward zero** once the
  existing-profile backlog clears, since new profiles keep getting their sample
  at processing time. A persistent floor means the processing-time hook is
  failing and the ceremony is silently covering for it.
- **`voice_sample_render_cap_reached` should be ~0.** Any volume means real users
  are hitting a permanently silent beat after three paid attempts — a vendor or
  storage incident, not a user behaviour.
- **`first_playback_heard` volume may rise** relative to `voice_profile_ready`
  for existing users who previously reached a silent beat. Silence never blocked
  the event (the phase plays either way), so this is a change in audio delivered,
  not in beats counted. Pair with `voice_sample_rendered_on_demand` to separate
  "heard" from "saw" — see `2026-09-10-first-playback-heard.md`.
