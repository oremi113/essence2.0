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
| 13 | Tab away mid-utterance, return | Resolves to the settled beat; does not resume mid-word or snap forward | ⚠️ handler ✅, real backgrounding not reproducible — see below |
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

| # | Check | Expected | Result 2026-09-10 |
|---|---|---|---|
| 17 | Render once, persisting everything | `sample_status = 'ready'`, path set, duration non-null, line stored, **`sample_render_count = 1`** | ✅ live |
| 18 | Repeated calls after ready | `sample_render_count` **stays 1**. Anything higher is a double-bill | ✅ live · 5 extra calls, still 1 · mutation-verified |
| 19 | **Concurrent calls** | Exactly one vendor render; losers log `voice_sample_claim_noop` | ✅ live · 5 parallel → 1 render, 4 noops · mutation-verified |
| 20 | GET when ready | 200 + signed url + `durationMs` + the **stored** line; one usage event | ✅ route · mutation-verified |
| 21 | GET while `rendering` | **409** with `status: 'rendering'` — distinguishable from failure | ✅ route · mutation-verified |
| 22 | GET with no sample | 404 with the status echoed | ✅ route |
| 23 | GET **another user's** profile | 404, never a leak | ✅ route + live (data layer) |
| 24 | Vendor 502 during render | `sample_status = 'failed'`; re-claimable | ✅ live |
| 25 | The GET never renders | No vendor call at any status | ✅ route · asserted across all four states |

Covered by `tests/integration/voice-sample-guard.live.test.ts` (6, against real
Postgres — run with `npx vitest run --config vitest.integration.config.ts`) and
`tests/unit/voice-sample-play-route.test.ts` (8). Both mutation-checked: removing
the claim filter fails row 19, removing both guards fails 18 and 19, collapsing
409→404 fails 21, and recording usage early fails four tests.

**What is NOT covered:** the full cookie-authenticated HTTP round trip. The route
tests stub the auth boundary, following `messages-play-route.test.ts`. A real
browser session needs the test password passed into Playwright's snippet
sandbox, which has no `fs`/`process` — so it could not be done without printing
the password. The branch logic and the RLS isolation are both proven; the
cookie plumbing is shared with the already-shipped messages endpoint.

**Two findings the live run exposed** — neither visible with mocks:
- `2026-09-10-storage-buckets-are-not-in-version-control` (P2) — no migration
  creates the buckets, so a fresh database fails every upload.
- `2026-09-10-voice-sample-retry-has-no-billing-cap` (P3) — a failure *after* the
  paid call re-bills on every retry. Six attempts, six charges, observed.

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
| 32 | Reduced motion | No stone travel — the cut alone. Everything else per row 9 | ✅ 2026-09-10 · movedY 0, 1 distinct position over 1200ms, 0 animations |
| 33 | Live walk with a real rendered sample | Audio plays, the stone's amplitude follows RMS rather than the cadence model | ⬜ needs a seeded account |
| 34 | `journey.first_playback_heard` fires **once**, on completed listen | Not on arrival; not again on replay | ⬜ needs live analytics |

**The one thing the dev page cannot show:** rows 33–34 need a real profile with a
rendered sample. Use the seed + magic-link protocol from `project_step6_live_verify`.

## Real-device pass — owner, iPhone 16 Pro Safari, 2026-09-10

Found two defects that **no automated check could have caught**, because every
measurement had been taken at the prototype's 390×844 frame and real Safari
gives ~700px. See `DECISION-real-device-height.md`.

| # | Check | Expected | Status |
|---|---|---|---|
| 35 | The lede never touches the sphere | Clearance is proportional to the stone — the aura glows 15% beyond its box, so a fixed gap is not enough | ✅ fixed · 14px visible clearance at 700px |
| 36 | Nothing is ever unreachable | Root is `overflow-y: auto`. It was `hidden`, which **clipped** the payoff and CTA rather than letting them scroll | ✅ fixed |
| 37 | The sphere stays a hero, not a dot | Compact mode **cuts the lede** rather than shrinking the stone. 189px at 700px (was 140px) | ✅ fixed, owner-approved |
| 38 | The primary does not out-weigh the sphere | 296px, down from 330px against a 255px text measure. Label must not wrap | ✅ fixed, owner-approved · amends the dark-stage ruling |
| 39 | The lede does not pop in/out as Safari's toolbar collapses | Threshold sits above both toolbar states on every current iPhone | ✅ 700 / 790 both compact |
| 40 | The 844 design frame is unchanged | Lede shown, prototype fidelity intact | ✅ |

**Residual, accepted:** a 664px screen overflows by 10px (CTA still on screen); a
560px screen scrolls properly. Both recorded in the decision memo.

**Lesson for the next screen:** a 4× throttle pass at 390×844 says nothing about
whether a screen fits a real phone. The two are different tests.

## Rows 13 and 32 — run 2026-09-10

**Row 32 passes outright.** Walked the ceremony to Continue with
`prefers-reduced-motion: reduce`: the stone occupied **one** position across
1200ms of frames (`movedY: 0`, `grew: 0`), `wrap.getAnimations()` was empty so no
entrance animation was even created, `data-entering` never appeared, breath was
off, `--sus` held at 0, and the words still lit per word. Restriction of
movement, not of luminance — as designed.

*Noted, not a failure:* under reduced motion the incoming stone appears at its
own position (cy 295.7 / 169px) rather than the outgoing one's (cy 233.8 /
200px), so it changes place in a single frame. That is the correct reduced-motion
behaviour — an instant change instead of a glide — but it means "the stone must
not re-enter" is weaker here than on the animated path. It resolves with the
stone-renderer unification in
`2026-09-10-two-stone-renderers-meet-at-the-playback-cut`.

**Row 13 is half-verified, and the honest half is the handler.**

The `settle()` handler is correct. Interrupted at 2/10 words with the utterance
running, it resolves immediately and completely to the settled beat: 10/10 words
lit and rested, `--lum` and `--sus` both 0, CTA and replay mounted, payoff and
aside shown, and the live region announcing "That's you. It kept the pauses."
Four seconds later nothing further fired — no late timer, no snap-forward.

**But the browser here never actually backgrounds the page.** Opening a second
tab and calling `bringToFront()` fired **zero** `visibilitychange` events
(instrumented and confirmed empty), so the event had to be dispatched manually
with `document.hidden` overridden. That proves the handler, not the integration.

A first attempt looked like a pass and was not: the 2.4s background window let
the utterance finish *naturally*, so `settle()` may never have run at all. The
give-away was that the CTA had not mounted — the tail had not arrived yet.

**Still owed:** background the tab for real on the phone. iOS Safari also
freezes timers on background, which is a different mechanism again from a
desktop tab switch, so this genuinely needs the device.
