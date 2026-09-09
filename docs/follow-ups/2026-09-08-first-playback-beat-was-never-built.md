---
id: 2026-09-08-first-playback-beat-was-never-built
priority: P1
status: open
opened: 2026-09-08
resolved:
owner_paired: true
summary: "MASTER_SPEC Step 5 (First Playback) has never existed in code — the user never hears their own voice before being asked to write their first message *(found in beta, 2026-09-08)*"
---

# The user never hears their preserved voice before writing their first message

*(found by the owner walking the live beta, 2026-09-08)*

`src/components/screens/FirstBreathSequence.tsx:132-141` · `docs/MASTER_SPEC.md:673-681`, `:795-796`

MASTER_SPEC **Step 5 — First Playback** (Priority: High) requires the system to
generate a neutral playback sample from the VoiceProfile so the user hears their
preserved voice for the first time — *"Recognition, validation, emotional proof"*
— with **no Message object created**. It is also **Immutable Journey Rule 4**:
*"First Playback must occur before first message creation."*

It has never been built. `FirstBreathSequence.handleExit()` pushes straight from
the ceremony to `/messages/new`.

The First Breath ceremony's audio (`src/lib/audio/firstBreathAudio.ts`) is
procedural sound design — pad, swell, bell, synthesised from oscillators. It is
not the user's voice and does not satisfy this beat. The only voice a user hears
before message creation is **Carol's**, the pre-payment sample explicitly labelled
*"An example, from another family."*

**Why it matters:** the user pays, waits through processing, sees the Vault open
and the stone form, and is then asked to compose a message for someone they love
**with no evidence the clone works.** The spec calls this beat "emotional proof"
and the whole activation funnel is built toward it. It is also a live violation of
a journey rule the spec marks as immutable.

**Why it's missing:** the spec deferred it — *"Not Yet Decided: Playback UI
specifics, waveform rendering"* — so it was never designed. When FU-25 resolved
the First Breath exit destination, it routed to message creation and the playback
beat fell between the two.

**Fix shape:** scoped in `docs/Step5_First_Playback_Design_Handoff.md` (brief for
the design architect: purpose, the eight open questions, build guidelines,
definition of done). All the machinery exists — `generateSpeech`,
`generateAndStoreAudio`, the signed-URL play route, `usePlaybackController`. What
is missing is the beat: a line of neutral copy, a render trigger, and a play
surface. **Owner-paired**: the spoken line and the render-timing/cost tradeoff are
owner decisions, not engineering ones.

**Pick up when:** next activation-journey work. It is not beta-blocking — the
funnel completes without it — but it is the single largest emotional gap in the
paid journey, and it should land before any paid acquisition spend.
