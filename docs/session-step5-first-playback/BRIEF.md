# Step 5 · First Playback — production build

**Design source of truth:** `prototypes/essence-step5-first-playback.html`
**Atmosphere spec:** `prototypes/ds/dark-stage.html` · **Motif:** `prototypes/ds/breath-stone.html`
**Tokens:** `src/app/globals.css @theme` § DARK CEREMONIAL STAGE
**Closes:** `docs/follow-ups/2026-09-08-first-playback-beat-was-never-built.md` (P1)

Production mirrors the prototype's timings, cadence, copy and motion. Where this
build departs from it, the departure is recorded here with a reason.

## The beat

MASTER_SPEC Step 5. The user hears their own preserved voice for the first time,
before being asked to write anything. No Message object is created. Immutable
Journey Rule 4: *first playback must occur before first message creation.*

Today `FirstBreathSequence.handleExit()` pushes straight to `/messages/new`. The
only voice a user hears before message creation is Carol's — explicitly labelled
*"An example, from another family."*

## Decisions already made (prototype §4 — do not re-open)

| # | Decision |
|---|---|
| 4.1 | A **fifth phase** of First Breath: `forming → crystallize → preserved → detail → playback`. Not a route — no URL lock. |
| 4.2 | *"If you're hearing this, I found a way to stay."* |
| 4.3 | Rendered **during processing**, cached on the profile. Needs `sample_audio_path` + `sample_duration_ms` and a migration. |
| 4.4 | **Autoplay.** Silent-phone state deferred. Verify on a real iPhone before ship. |
| 4.8 | **No waveform** — the stone is the waveform. |

Owner is building the non-happy paths (§4.6 skip, §4.7 failure, silent-phone)
separately. This build leaves explicit seams for them and does not stub them.

## Chunks

### Chunk 1 — the screen  *(this chunk)*
`FirstPlaybackScreen.tsx` + `.cadence.ts` + `.css.ts`, pure and props-driven, and
a permanent `/dev/first-playback`. Six-layer atmosphere, seven-layer stone,
two-envelope follower, word-by-word reveal, reduced motion, a11y. No Supabase, no
audio fetching — the amplitude source is a prop.

### Chunk 2 — the render + storage path
Migration for `sample_audio_path` / `sample_duration_ms`. Idempotent render fired
on `/app/voice/processing` keyed to the profile id, so a refresh or double-tap
cannot bill twice (reference: `src/lib/messages/cost-controls.ts`). Signed-URL
endpoint following the `GET /api/messages/[id]/play` pattern.

### Chunk 3 — wiring
The fifth phase into `FirstBreathSequence`, including **the inbound crossfade from
`detail`** — the stone must not re-enter, and no pass has built it (flagged as
unbuilt in dark-stage's "Not settled"). `AnalyserNode` → RMS → `--lum`.
`handleExit()` no longer jumps to `/messages/new`. Journey event + a
`docs/analytics/` note in the same PR.

## Known architectural fork — decide in Chunk 3

Production's `BreathStone` is a **canvas** engine (`breathStoneEngine.ts`); the
prototype's stone is **CSS layers** driven by `--lum` / `--sus`, and every
measured performance number (p95 16.7 ms) belongs to the CSS implementation.

Chunk 1 builds the CSS stone, because the prototype is the source of truth and
porting it to canvas would discard the measured work. That leaves two stone
implementations meeting mid-ceremony at the `detail → playback` boundary, which
is exactly the crossfade Chunk 3 owns. **Not a defect — a scheduled decision.**

## Non-negotiables carried in

- Three-layer: screen pure and props-driven; fetch + render trigger in the
  `page.tsx` / client wrapper; actions bubble via callbacks.
- `/dev/first-playback` is permanent scaffolding.
- Full-height sizing is `calc(100dvh - var(--app-main-inset-bottom, 0px))`, never
  plain `100dvh` (`2026-09-04-full-height-screens-overflow-the-app-shell-padding`).
- `will-change` only while `.speaking`. Blend-mode layers at `inset: 0`.
- Ceremonial type takes a **px** measure and container units, never `ch` / `vw`.
- Reveal with `@keyframes`, not a transition, on anything interactive.
- Unmount, don't just fade.
- Verify at **4× CPU throttle on 390×844** before "done".
- The word "Vault" appears zero times.
