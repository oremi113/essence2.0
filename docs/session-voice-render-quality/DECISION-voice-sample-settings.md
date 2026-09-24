# Decision — what settings First Playback renders with, and how we learn the answer for other voices

**Date:** 2026-09-22
**Status:** decided 2026-09-22 — `stability .50 / similarity .75 / style .25`
(`future_message`'s shape). Landed as `VOICE_SAMPLE_SETTINGS` in
`ensureVoiceSample.ts`.
**Scope:** `ensureVoiceSample` → `generateSpeechWithTimestamps`

---

## The call in front of us

`ensureVoiceSample` passes no `voiceSettings`, so First Playback renders at the
voice's stored defaults — `stability .5 / similarity .75 / style 0 / speaker
boost on`. Every other render in the app passes a tuned per-category tuple with
style between .15 and .40. See `BRIEF.md` §4 for the full table.

This is an omission rather than a decision. The narrow fix is one argument. The
question worth answering while we're here is the one the owner asked:

> *how can we think through how users' voices will render in the future?*

---

## The comparison set

Rendered directly against the tester's real clone (`e65aW1OoqK3pmRim69Lv`), same
model production uses (`eleven_multilingual_v2`), 230 characters total. Files in
`.tmp/voice-settings-compare/` — scratch, gitignored, re-runnable from the
script in this session's scratchpad.

| file | stability | similarity | style | what it isolates |
|---|---|---|---|---|
| `1-current-style0` | .50 | .75 | .00 | the shipped behaviour |
| `2-comfort` | .55 | .75 | .20 | proposal — steady, gently expressive |
| `3-future-message` | .50 | .75 | .25 | a touch more delivery |
| `4-warmer` | .40 | .75 | .35 | expressive, less consistent |
| `5-max-likeness` | .45 | **.90** | .20 | likeness rather than expressiveness |

**1 vs 2** isolates the omission. **2 vs 5** answers a different question —
whether "sounds off" was *expressiveness* or *likeness*. Those are separate
dials and it matters which one was being reacted to, because they generalise
differently across voices.

**Proposed:** `comfort`'s shape (.55 / .75 / .20).
**Chosen by ear:** `future_message`'s shape — **`stability .50 / similarity .75
/ style .25`**. Slightly more delivery than proposed.

Two findings from the listen, both worth keeping:

- **style 0 → .25 was the audible change.** This was the omission, and fixing it
  fixed the complaint.
- **similarity .75 → .90 was nearly inaudible.** Variant 5 read as barely
  distinguishable from variant 3, and both read as "me".

So for this voice the dominant dial is **expressiveness, not likeness**. That is
one voice. Whether it generalises is exactly what §"the larger question" below
is about — and it gives the beta protocol a sharper prior: if a tester says
"doesn't sound like me", reach for style before reaching for similarity.

**Implementation note:** the values are *copied*, not imported from
`MESSAGE_VOICE_SETTINGS.future_message`. The sample is explicitly not a Message
(MASTER_SPEC Step 5, Immutable Journey Rule 4). Importing the category tuple
would mean retuning that message category silently retunes the most important
playback in the product.

---

## Two things to do regardless of which wins

### 1. Make it a named constant, not an argument

An explicit `VOICE_SAMPLE_SETTINGS` with the reasoning beside it. The failure
mode we just paid for is a value that was never chosen — a bare literal at the
call site would be the same trap with a different value in it.

### 2. Store the settings used, next to `sample_line`

`sample_line` is already stored, and its column comment gives the reason:

> *"Stored rather than assumed, because the screen typesets the line while the
> audio speaks it: if the constant in voice-sample-line.ts changes, an
> already-rendered user must keep reading what they actually hear."*

That argument transfers wholesale. When a tester says "it sounds off," the first
question is *what was it rendered with* — and today that is unanswerable for any
row. A `sample_voice_settings jsonb` column costs one migration and makes every
future report diagnosable instead of anecdotal.

---

## The larger question: how do we know it renders well for voice #7?

We do not, and cannot, from n=2 — both of which are the owner's own voice.
Stating that plainly matters, because the tempting move is to tune harder, and
tuning against two samples of one person is fitting noise.

Three gaps, in the order they actually bite:

### Gap 1 — the input is unmeasured (largest effect, least attention)

`source_clip_seconds` is `null`. `recorded_clip_count` is `0` on a profile with
25 uploaded clips. The only quality gate before a paid clone is
`MIN_TOTAL_BYTES`.

Bytes measure file size, not usable speech. 12MB recorded in a quiet room and
12MB recorded beside a highway pass the gate identically. Clone quality is
dominated by input quality, and input quality is the one thing not being looked
at anywhere in the pipeline.

**Cheapest real fix:** measure duration and a level statistic (peak, and
silence-to-speech ratio) at upload. Both are computable from the bytes already
in hand. That buys a truthful "that one was too quiet — try it again" *before*
money is spent, which is worth more than any render-side tuning.

### Gap 2 — render quality is invisible

Nothing measures whether a render was good. No telemetry, no user signal. The
only reason fault C was caught is that this particular tester happened to own
earlier clones to compare against.

**Cheapest real fix:** one question at First Playback — *"Does this sound like
you?"* — one tap. That moment is the single best place in the product to ask it:
the user has just heard it, they are the only one who can judge, and they will
never be better placed to answer than in that second.

That one number, collected across beta, *is* the calibration dataset. It cannot
be gathered retroactively.

### Gap 3 — settings are global, voices are not

Seven tuples applied identically to every human voice. Stability interacts with
voice character: a breathy voice wobbles where a resonant one holds.

**Deliberately not fixing this yet.** Per-voice calibration with n=2 is
premature. Ship one chosen setting, measure with Gap 2's signal, then decide. If
one value satisfies every tester, we are done. If it splits, the split itself
shows the axis.

---

## Sequencing

**Before testers land:**
- Choose from the comparison set; land it as a named constant.
- `sample_voice_settings` column; store what each render used.
- Duration + level measured at upload.
- The one-tap "does this sound like you?" at First Playback.

**During beta:** 5–15 testers is 5–15 *different* voices — precisely the sample
needed and unobtainable any other way. This is the main reason beta is worth
running for this question at all.

**Only if the data demands it:** per-voice calibration, or offering the user a
choice between two renders. The 3-render budget per profile already exists and
is unused; one of those renders is a legitimate *"that wasn't me, try again"* —
which would also give Gap 2 a second, stronger signal.

---

## Deferred, with a note: Instant vs Professional Voice Cloning

The app uses ElevenLabs **Instant** Voice Cloning. **Professional** Voice Cloning
wants ~30 minutes of audio and hours of training, and lands materially closer to
the speaker.

For a product whose entire promise is *this is my voice*, at $119/yr, that is a
real strategic question rather than a tuning one. It is **not** a beta question —
it would change the recording ask, the wait, and the cost model, all of which
beta is meant to hold still. Recording it here so the choice is visible when
scale makes it live, rather than discovered later as another omission.
