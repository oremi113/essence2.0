# Step 5 · First Playback — manual test plan

Surface: `/dev/first-playback` (Chunk 1). The production phase is Chunk 3.

## Setup

`npm run dev`, viewport **390 × 844**. For the motion bar, 4× CPU throttle via
Playwright CDP (`Emulation.setCPUThrottlingRate { rate: 4 }`) or
`scripts/throttle-dev.mjs`.

## Chunk 1 — the screen

| # | Check | Expected | Verified 2026-09-09 |
|---|---|---|---|
| 1 | Load the page, watch once through | Eyebrow → lede (2 lines) → breath stops → line resolves word by word → 2.5s of nothing → "That's you." → aside → CTA → "Hear it again" | ✅ |
| 2 | Word separators | Real spaces between words. `.fpb__w` is `inline-block`, so a space *inside* the span collapses to zero — the separator must stay outside it | ✅ 8px gaps |
| 3 | Ceremonial size, line A | 33.99px, 3 lines, inside the reserved block | ✅ |
| 4 | Line B ("Whatever happens…") | Steps down to **32px**, still 3 lines. The fit loop must actually fire | ✅ |
| 5 | Line C ("I'm still here…") | 33.99px, 3 lines | ✅ |
| 6 | No page scroll at any line | `scrollHeight <= innerHeight`. The screen is one still frame | ✅ |
| 7 | Two-envelope follower | `--lum` oscillates per syllable; `--sus` rises monotonically to ~1 and decays after. Speech rises/articulates/settles — it is not a faster breath | ✅ peak lum .99, sus .998 |
| 8 | `will-change` is a state | `data-speaking` present only during the utterance, absent at rest | ✅ |
| 9 | Reduced motion | No animation, no transform, `--sus` pinned at 0 — but `--lum` still steps per word (quantised to .1). Still lit by the voice, never moving | ✅ |
| 10 | Screen-reader order | `role="status" aria-live="polite"` announces the line at playback, then "That's you. It kept the pauses." at its own beat. Word spans are `aria-hidden` | ✅ |
| 11 | CTA arrives alone | "Hear it again" is 1.2s behind the primary, and both **mount** rather than fade from `opacity: 0` | ✅ |
| 12 | Press stays tactile | The CTA's entrance is a `@keyframes` animation, so `:active` still scales at `--duration-small`. Press it — it must not feel dead | ✅ |
| 13 | Tab away mid-utterance, return | Resolves to the settled beat; does not resume mid-word or snap forward | ⬜ |
| 14 | **4× CPU throttle, 390×844** | No frame over 20ms across the utterance | ✅ p95 10.3ms, max 10.4ms, 0 over 20ms |
| 15 | Console | Zero errors | ✅ |
| 16 | The word "Vault" | Appears zero times | ✅ |

## Not covered here — deliberately

- **Skip path (§4.6)** and **failure state (§4.7)** — owner is building these.
- **Silent phone / blocked autoplay** — one shared state, a later pass. The
  always-visible line means an undetected silent phone still delivers the beat.
- **Autoplay on a real iPhone (§4.4)** — cannot be verified in this environment.
  Blocking for ship, not for this chunk.
- **A real device at 4× throttle.** Every number above is headless Chromium.
  Both the prototype and `ds/dark-stage.html` list this as still owed.

## Chunk 2 — the render + storage path

Unit-covered by `tests/unit/ensure-voice-sample.test.ts` (10 tests, mutation-checked
against removing the claim guard and against not counting spend at claim time).
The rows below are what still needs a **live** walk, because the guard's real
serialization is Postgres row locking, which a unit test cannot exercise.

| # | Check | Expected |
|---|---|---|
| 17 | Apply the migration locally, complete voice creation once | `sample_status = 'ready'`, `sample_audio_path` set, `sample_duration_ms` non-null, **`sample_render_count = 1`** |
| 18 | Refresh `/app/voice/processing` repeatedly after ready | `sample_render_count` **stays 1**. Anything higher is a double-bill |
| 19 | Fire two `/start` requests concurrently | Exactly one vendor render. The loser logs `voice_sample_claim_noop` |
| 20 | `GET /api/voice-profiles/:id/sample/play` when ready | 200 + signed url + `durationMs`; one `signed_url_playback` usage event |
| 21 | Same endpoint while `sample_status = 'rendering'` | **409** with `status: 'rendering'` — distinguishable from failure, which §4.7 will need |
| 22 | Same endpoint with no sample | 404 with the status echoed |
| 23 | Same endpoint for **another user's** profile id | 404 (RLS-scoped read, never a leak) |
| 24 | Force a TTS 502 during creation | Voice still completes ready; `sample_status = 'failed'`; the beat is re-claimable |
| 25 | The GET endpoint never renders | No ElevenLabs call on any GET, at any status |

**Free failure testing:** point the vendor at a fake voice per
`project_step6_live_verify` so 502s cost nothing.

## Chunk 3 — the ceremony wiring

| # | Check | Expected | Verified 2026-09-10 |
|---|---|---|---|
| 26 | Walk the ceremony to `detail`, tap **Continue** | Advances to the playback phase instead of `/messages/new` | ✅ |
| 27 | The stone does not re-enter | The incoming stone mounts on the outgoing one's exact rect, then travels | ✅ 237.2/200px → 254.2/220px, monotonic |
| 28 | Handoff has no superimposition artifact | One rendering visible at a time | ✅ match cut; the dissolve was rejected — see follow-up `2026-09-10-two-stone-renderers-meet-at-the-playback-cut` |
| 29 | Beat plays through inside the ceremony | 10/10 words, CTA then replay, `aria-live` announces | ✅ |
| 30 | **4× CPU throttle across handoff + utterance** | No frame over 20ms | ✅ p50 8.3, p95 9.2, max 16.7, 0 over 20ms |
| 31 | Sample fetch 404s (no sample) | Phase still plays, silently, driven by the cadence model. No crash, no dead end | ✅ (dev-mock-id has no profile) |
| 32 | Reduced motion | No stone travel — the cut alone. Everything else per row 9 | ⬜ |
| 33 | Live walk with a real rendered sample | Audio plays, the stone's amplitude follows RMS rather than the cadence model | ⬜ needs a seeded account |
| 34 | `journey.first_playback_heard` fires **once**, on completed listen | Not on arrival; not again on replay | ⬜ needs live analytics |

**The one thing the dev page cannot show:** rows 33–34 need a real profile with a
rendered sample. Use the seed + magic-link protocol from `project_step6_live_verify`.
