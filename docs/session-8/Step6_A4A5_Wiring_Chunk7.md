# Step 6 · A4→A5 Forward Wiring — Chunk 7

**Date:** 2026-06-13
**Scope (agreed):** Wire the forward cold-start `/generate` handoff that
the A3 chunk deliberately deferred (FOLLOW_UPS #47): A4 submit →
**A5 (Generation)** wait → A6. Resolves the spine's last "screen exists
but isn't reached in the forward flow" gap.

## Decisions taken (owner, 2026-06-13)

1. **Wait experience: honoring beat → A5 (overlapped).** A4's "We'll
   bring this into your voice" beat (note path, ~2.4s) plays while
   `/generate` is *already in flight* (fired at submit), then the
   orchestrator hands off to A5's working beats — the honoring overlaps
   the call rather than stacking before it. The skip path has no honoring
   and goes straight to A5.
2. **Verify bar: live failure-only + dev-page success.** The A5.b failure
   path is proven against the real backend (fake-vendor 502, no
   ElevenLabs spend); the success→A6 navigation is dev-mocked (no live
   render).

## Architecture (resolved, not re-litigated)

`/generate` is **synchronous** (LLM text → ElevenLabs render inline,
returns only when done). So by the time the client has a `generationId`,
the message is already complete — A5 (the wait) **cannot** live on
`/messages/new/g/[id]` (that route would render A6). A5 is therefore a
**client-side orchestrator step** that shows while the POST is in flight.
This matches A5's existing status-driven contract (the page owns the
round-trip; success = unmount via navigation; failure flips `status`).

Forward sequence:
- **Note path:** A4 input → A4 honoring (2.4s, `/generate` already firing)
  → A5 `working` → success: `router.push` to A6 / failure: A5.b.
- **Skip path:** A4 → A5 `working` → success/failure.

## What shipped

- **`src/app/messages/new/page.tsx`** — fetches the user's ready, cloned
  `voiceProfileId` (most-recent ready; redirects to `voiceCreate` if none
  — can't shape a message in a voice that doesn't exist) and the
  saved-message `count`; passes both to the client.
- **`MessagesNewPageClient.tsx`** — real `onGenerate`: builds the
  `/generate` body (voiceProfileId + category + note + recipient branch:
  existing `recipientId` vs pending name/relationship/descriptor), POSTs,
  and on 200 `router.push`es to `messageGenerationRoute(generationId)`
  (A6). Not-ok resolves so A5 shows its retry.
- **`MessageCreationFlow.tsx` / `.types.ts`** — adds the `generating`
  step (A5); the honoring→A5 overlapped seam (`runGenerate` fires at
  submit; note path awaits `HONORING_HANDOFF_MS` before the step swap,
  skip path swaps immediately); `genStatus` working→failed; **Try again**
  re-runs the kept `lastRequest`; **Adjust your note** → A4 with the note
  pre-filled (note now staged). Wires `isFinalOfThree = savedCountBefore
  === 2` and the real `saved_count_before` into `flow_started` (was a
  hardcoded 0 stub).
- **`/dev/messages-flow`** — mock updated for the A5 flow: success
  remounts (stands in for the A6 navigation the sandbox can't perform),
  plus a **Fail generate** toggle to exercise A5.b on the dev page.

## Verification

**Dev-page (4× CPU throttle, 390×844):** note path (A4 → honoring → A5
working → success-loop), skip path (A4 → A5 working → success), failure
→ A5.b (note-aware: "Your note is kept." + Try again + Adjust your note),
Adjust-note → A4 with note pre-filled, Try again → A5 working → success.
No errors.

**Live (real backend, authenticated test user, fake-vendor voice):**
- Walked the real `/messages/new`: A2 (new recipient "Sarah/daughter") →
  A3 (birthday) → A4 (skip) → real POST `/api/messages/generate` → **502**
  (Anthropic text succeeded; ElevenLabs rejected the fake
  `vendor_voice_id` → no synthesis billed) → **A5.b** rendered with the
  correct skip-path copy ("Something slipped on our end. Nothing is lost."
  + Try again alone, no Adjust-note).
- Backend asserted: `pending_generations` row written with
  `text_status=succeeded`, `audio_status=failed`,
  `pending_recipient_name=Sarah`, `relationship=daughter` (the
  new-recipient branch threaded A2→onGenerate→/generate→DB correctly);
  `usage_events` recorded `step6_generate` (started) + `step6.flow_started`.
- Console clean apart from the expected 502.

**Gates:** `tsc` ✅ · eslint ✅ · unit 181/181 ✅.

## Deferred / notes
- **Live success→A6 round-trip** (real ElevenLabs render) — dev-mocked
  this chunk per the verify decision; exercise when a real cloned voice +
  render budget is on hand. Needs `DEFERRED_AUDIO_ENABLED` (the A6 route
  renders only under the flag; control-arm A6 isn't built).
- **C1–C3** (ceremony / waitlist / vault-limit) — next on the spine.
