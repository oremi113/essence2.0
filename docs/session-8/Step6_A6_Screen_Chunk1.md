# Step 6 · A6 (Preview & Refine, Deferred-Audio) — Screen build, Chunk 1

**Date:** 2026-06-11 · **Status:** Screen + dev sandbox built, verified at 4× CPU on
a 390×844 mobile sim. Server route + live endpoint wiring deferred to Chunk 2.

Wires up the deferred-audio A6 from
`prototypes/message creation/essence-step6-a6-deferred.html` (the repo prototype
was first synced to the latest Downloads copy — adds the "Make a change" change
sheet, the play-hint-learned latch, and the sheet polish).

## What shipped (Chunk 1)

| File | Role |
|---|---|
| `src/components/screens/messages/PreviewRefineScreen.tsx` | The screen — pure, props-driven, owns view state + all motion |
| `…/PreviewRefineScreen.reducer.ts` | Deferred-model state machine (candidate/committed, budgets, commit-fail). Caps are derived, never stored |
| `…/PreviewRefineScreen.types.ts` | Prop + callback-result contract |
| `…/PreviewRefineScreen.css.ts` | Co-located scoped stylesheet (`.preview-refine` root, `pr-`-prefixed keyframes) — injected via `<style>`, FirstBreathSequence precedent |
| `src/app/dev/messages-preview/page.tsx` | Permanent dev sandbox — 6 state presets + 4 compose toggles, mock async backend |

### Departures from the prototype (deliberate)
- Phone frame / dev rail / variant label dropped — production renders full-bleed.
- The CSS-gradient stone is replaced by the shared canvas `BreathStone`
  (`ready`/`playback`/`working`). Architecturally correct; reads softer on cream —
  see **FOLLOW_UPS #35**.
- Added `initialCandidateText` prop so the screen can open in candidate mode (the
  server-rehydrate case: a mid-candidate refresh, or returning from reshape).

### Verified (mock backend, 4× CPU throttle)
First listen · tap-to-play scrubber · candidate · free-draft arrival
(exit-fade → rise + warm wash, fresh variant) · recording cap (Make-a-change +
free-draft retire, cap note) · commit failure (§5.6: "nothing was spent", dot
refills, draft preserved, retry = the button) · discard sheet · change sheet
(reword/reshape fork, caps fold in). No page errors. Screenshots in `.tmp/`.

## Action → endpoint map (for Chunk 2 wiring)

The screen exposes these async callbacks; the page.tsx owns the fetch + nav:

| Callback | Endpoint (already built + proven) |
|---|---|
| `onFreeDraft` | `POST /api/messages/regenerate` (variant, deferred) → text candidate |
| `onCommit` | `POST /api/messages/commit` → records + promotes; failure-safe |
| `onKeepCurrent` | `POST /api/messages/regenerate` `mode:"keep"` → clears candidate |
| `onSave` | `POST /api/messages/save` |
| `onDiscard` | `POST /api/messages/discard` |
| `onReshape` | navigate to A4 (returns to A6 as a candidate) |
| `onRequestPlayback` | `GET /api/messages/generations/:id/play` (pending signed URL) |

Result-shape notes for the page:
- commit returns `audioRenderCount`; screen wants `recordingsRemaining` =
  `MAX_AUDIO_RENDERS − audioRenderCount`.
- regenerate(variant) returns `textRerollCount`; screen wants
  `rerollsRemaining` = `MAX_TEXT_REROLLS − textRerollCount`.
- commit failure is HTTP 502 `{ retryable:true }`; the cost-cap 429
  (`audio_render_cap` / `text_reroll_cap`) is a *different* path the page maps to
  the cap UI rather than the commit-fail beat.

## What's left (Chunk 2)

1. `src/app/messages/new/g/[generationId]/page.tsx` — server-fetch the
   `pending_generations` row, derive the props (committed text/duration, the two
   remaining budgets from the counts above, `reshapeExhausted` from edit-note
   depth, `initialCandidateText` from `candidate_text`), render the screen behind
   `DEFERRED_AUDIO_ENABLED`.
2. A client wrapper that maps each callback to its `fetch`, normalizes the
   response shapes above, and routes (save → A7, discard → Home, reshape → A4,
   vault_limit → C3, subscription_lapsed → its gate).
3. Client telemetry events land with the wiring.
4. Manual real-voice render check for `/commit` (needs a cloned voice).

## Manual test plan (dev sandbox: `/dev/messages-preview`)

- **d1** play/pause, watch the scrubber + transcript resolve from dim; arrival line present once.
- **d1** → Make a change → both cards; pick "The way it's said" → re-roll arrival.
- **d2** → See another way ×N until the "one more" whisper, then the text-cap note replaces the button.
- **d2** → commit → stone works → slides into playback as the new committed take.
- **d5** (commit-fail armed) → commit → "nothing was spent", dot refills, draft intact → commit again succeeds.
- **d4** → commit retired + "Make a change" gone + rec cap note.
- **Audio fail** toggle on d1 → play → "Couldn't load it" → Try again recovers.
- Discard sheet + change sheet: Escape and backdrop-tap both dismiss; Tab cycles within the sheet.
- Repeat the motion checks with OS "Reduce motion" on.
