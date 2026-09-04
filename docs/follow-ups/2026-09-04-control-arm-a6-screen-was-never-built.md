---
id: 2026-09-04-control-arm-a6-screen-was-never-built
priority: P2
status: open
opened: 2026-09-04
resolved:
summary: "`DEFERRED_AUDIO_ENABLED` is a flag with only one working arm — the control arm has no A6 screen, so \"off\" 404s after a paid generation *(found in beta, 2026-09-04)*"
---

# The deferred-audio flag has only one working arm

*(found while fixing the beta "we couldn't find that page" report, 2026-09-04)*

`src/lib/messages/cost-controls.ts` · `src/app/messages/new/g/[generationId]/page.tsx:36`

`DEFERRED_AUDIO_ENABLED` reads as an A/B switch between two generation cost
models, but only the deferred arm has a preview screen. With the flag off,
`/messages/new/g/[generationId]` calls `notFound()` — so the control arm
completes a full paid generation (Anthropic text + an inline ElevenLabs render,
per `FU-53`'s control-arm verification) and then drops the user on the app's
404. `MessagesNewPageClient.tsx` documented this as "expected until the
control-arm A6 exists," but nothing prevented an environment from selecting it.

It shipped that way because the variable was never written into `.env.local`,
`.env.example`, or Vercel — it only ever existed as an inline prefix in dev
sessions (`DEFERRED_AUDIO_ENABLED=true npm run dev`). Every real deployment
therefore ran the arm with no screen.

**Mitigated 2026-09-04** by inverting the default: `isDeferredAudioEnabled()`
now returns true unless the variable is explicitly `"false"`. That closes the
user-facing hole, but the underlying asymmetry is still there — a flag whose
"off" state is a broken product is a trap for the next person who flips it.

**Why it matters:** the remaining `notFound()` is a live landmine. Anyone who
sets the variable to `"false"` in a user-reachable environment (to "test the
control arm", to match an old runbook) silently re-breaks message creation, and
the failure costs vendor money on every attempt before it 404s.

**Fix shape:** pick one and delete the ambiguity.
  (a) Retire the flag and the control-arm branches entirely — deferred is the
      shipped cost model, and the branches in `/generate` and `/regenerate` are
      dead weight; or
  (b) if the control arm is still wanted for cost experiments, give it a real
      destination instead of `notFound()` — at minimum route it to A7 or back to
      the flow with a warm message, never a 404 after a paid render.

**Pick up when:** next touching Step 6 generation, or before any deliberate cost
experiment on the two arms.
