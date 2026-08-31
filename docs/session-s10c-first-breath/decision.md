# S10-C First-Breath — decision memo (2026-07-12)

**Task:** Step 10 S10-C — the "ceremony audio can't play" state for First Breath
(the last open S10-C gap; the Shelf audio-error state already exists).

## The divergence

`docs/Step10_Error_Chapters_Scope.md` scoped S10-C **before FU #41 landed**. It
assumed First Breath would **play an audio file** and prescribed *"mirror the
Shelf — add `onError` + a `.play()` catch + a retry state"* (scope §2B, lines
~137–145, table row line 221).

FU #41 shipped something different: a **procedural Web Audio synth engine**
(`src/lib/audio/firstBreathAudio.ts` — `createFirstBreathAudio`), which generates
the ambient bed / crystallize swell / reveal bell in real time. There is **no
audio file, no `<audio>` element, no `.play()`, and no recorded content** to lose
or retry. So the scope's "mirror the Shelf" prescription no longer applies.

## Decision — silent graceful degradation, NOT a visible error/retry state

- **The Shelf plays the user's real recorded voice.** If that fails, they lose
  content → a "couldn't play / retry" state is correct.
- **First Breath's audio is ambient enhancement of a visual-primary ceremony.**
  If it fails, the stone still forms, the copy still fades, the beats still fire,
  the ceremony completes — **nothing is lost.** There is nothing to retry.
- Popping an error/retry UI into this Elevated, sacred moment would **desecrate
  it** (see the Copy & Voice guide on Elevated moments). The correct treatment is
  robust **silent graceful degradation**: any audio failure degrades to silence
  and the ceremony is visually unchanged.

## The latent bug this surfaced (the real fix)

While tracing the failure paths, found a genuine crash path — not just a missing
"state":

- **`new AudioContext()` + the whole graph construction was unguarded**
  (`firstBreathAudio.ts`). Browsers cap concurrent AudioContexts (~6); repeated
  navigation through the app hits that cap, `new AudioContext()` throws, and the
  throw propagated **out of `createFirstBreathAudio()` into the ceremony's mount
  `useEffect`** — able to break the sacred beat.
- Two **uncaught `ctx.resume()` rejections** (`start()`, `onGesture`) — iOS can
  reject resume; these were unhandled promise rejections.

## Changes

- `firstBreathAudio.ts`: wrap context + graph construction → return `null` on any
  throw (callers already no-op on null); `.catch()` both `resume()` rejections.
- `FirstBreathSequence.tsx`: defensively wrap `createFirstBreathAudio()` /
  `start()` in the mount effect, and the two beat one-shots, so nothing audio can
  throw into the ceremony.
- `tests/unit/first-breath-audio.test.ts`: a throwing `AudioContext` constructor
  → `createFirstBreathAudio()` returns `null`, does **not** throw.

## Verification

typecheck ✅ · lint ✅ · unit **382/382** ✅ (incl. the new throw-safety case).
**No visual validation needed — the change is invisible by design** (silent
degradation; the ceremony renders identically). That invisibility *is* the
feature.
