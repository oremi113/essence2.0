# Step 5 · First Playback — Design Brief

**For:** the design architect
**From:** engineering
**Date:** 2026-09-08
**Status:** **Not built.** This is a required beat in the journey that has never
existed in code. It was surfaced by the owner walking the live beta on 2026-09-08
and asking, correctly, *"am I supposed to hear a preview of my actual voice before
it jumps to create your first message?"* — the answer is yes, and you don't.
**Priority: High** (MASTER_SPEC's own rating).

---

## 0. The why (read once, then work from §2)

This is the moment the product proves it works.

The user has recorded 25 prompts, entered a card, waited through processing,
watched the Vault open, and watched a stone form. They are now asked to compose a
message for someone they love — **without ever having heard evidence that the
clone is any good.** The only voice they have heard is Carol's, a stranger's,
labelled *"An example, from another family,"* and that was before they paid.

MASTER_SPEC §Step 5 states the intent plainly:

> **Emotional Intent:** User hears their preserved voice for the first time.
> Recognition, validation, emotional proof.
>
> **System Rules:**
> - System generates a neutral playback sample from VoiceProfile
> - **No Message object is created** — this is demonstration of continuity
> - Playback must occur before first message creation

It is also one of the seven **Immutable Journey Rules** (§4.4):

> 3. Vault Reveal must occur before First Playback
> 4. **First Playback must occur before first message creation**

So this is not a nice-to-have beat someone can decide to skip. The journey order
is locked, and right now the app violates it.

### Why it's missing

The spec left it at *"**Not Yet Decided:** Playback UI specifics, waveform
rendering."* Never designed → never built. When FOLLOW_UPS #25 resolved where the
First Breath ceremony should exit to, it routed straight to message creation, and
the playback beat quietly disappeared between the two. Nobody removed it; it just
never got added.

### What exists today that is *not* this

`src/lib/audio/firstBreathAudio.ts` is **procedural ceremony sound design** —
ambient pad, crystallize swell, reveal bell, synthesised live from oscillators.
It is atmosphere for the stone animation. It is not the user's voice, and it does
not satisfy this beat. Keep it; this sits alongside it.

---

## 1. Where it goes in the journey

```
/app/voice/processing   →  /app/vault/reveal  →  /app/record/complete  →  ??? →  /messages/new
   "creating your voice"     Vault Reveal          First Breath ceremony    HERE     A2 Recipient
                                                   (stone forms)
```

Today `FirstBreathSequence.handleExit()` pushes straight to `ROUTES.messagesNew`.
This beat lands **between** the ceremony and message creation.

**Open question (§4.1): is this its own route, or the final phase of the First
Breath ceremony?** Both are defensible and it is a design call, not an
engineering one. See §4.

---

## 2. What the screen has to do

One job, stated three ways so it can't drift:

1. **The user hears their own preserved voice, for the first time, out loud.**
2. They understand that this is a *demonstration* — nothing was sent, nothing was
   saved, no message exists.
3. They move forward to make their first real message, having just been given a
   reason to believe it's worth doing.

### Emotional register

The Copy & Voice Guide rations an **Elevated** register to four moments in the
product's lifetime. This is almost certainly one of them — it is the emotional
apex of the activation journey. Confirm with the guide's existing four before
spending one here (`docs/ESSENCE_Copy_Voice_Guide.md`).

The feeling to design for is **recognition**, not spectacle. The prototype
reference for the closest existing beat is the playback moment in
`prototypes/old-monetization-trigger.html` (SCREEN 3), whose after-copy is
*"That's you. Clear, steady, familiar."* That line is the target register — plain,
short, and about the person rather than the technology.

### Hard copy constraints

- **"Vault" appears zero times.** MASTER_SPEC §304: *"Onboarding through First
  Playback: 'Voice Vault' appears zero times."* §315 puts this beat in the
  **Silent** register for vault language. The word is banned on this screen.
- The voice is **"your voice"** / **"your preserved voice"** — never "your AI
  voice", "your clone", "the model", "the sample".
- **Sentence case.** Short lines. End soft.
- CTA is a **specific verb**, never "Continue" (Copy Guide §7). The next beat is
  making a message for someone.

---

## 3. What already exists to build on

You are not starting from zero. All of the machinery is in place; what's missing
is the beat itself.

| Need | Already exists | Where |
|---|---|---|
| Text → speech in the user's cloned voice | `generateSpeech({ voiceId, text, voiceSettings })` | `src/lib/elevenlabs.ts:209` |
| Render + upload + duration + status flip | `generateAndStoreAudio()` | `src/lib/messages/audio.ts:40` |
| Audio storage bucket + path helpers | `essence-audio`, `storage-paths.ts` | `src/lib/audio/` |
| Signed-URL playback endpoint pattern | `GET /api/messages/[id]/play` | `src/app/api/messages/[id]/play/` |
| A play/pause controller with state | `usePlaybackController()` | `src/components/screens/shelf/usePlaybackController.ts` |
| A play surface with a real design | A6 Preview & Refine, Memory Shelf overlay | `PreviewRefineScreen.tsx` |
| The ready voice id | `voice_profiles.vendor_voice_id`, status `ready` | — |

**Do not invent a new playback UI grammar.** A6 and the Shelf already establish
how playback looks and behaves in this product. This beat should feel like the
first, most ceremonial instance of that same language — not a fourth dialect.

---

## 4. Open questions — owner + design architect

These are the decisions that block the build. Engineering has an opinion on each,
flagged, but none of these are engineering's call.

### 4.1 Its own route, or the last phase of First Breath?

- **(a) Own route** — e.g. a new page under `src/app/app/` reached from the
  ceremony, exiting to `/messages/new`. Cleaner separation, its own `/dev` page,
  its own analytics, resumable if the user closes the tab.
- **(b) A fifth phase of `FirstBreathSequence`** (`forming → crystallize →
  preserved → detail → **playback**`). Keeps the ceremony unbroken and reuses the
  stone, the ambient audio bed, and the existing crossfade machinery.

*Engineering leans (b)* for emotional continuity — the stone is already the visual
metaphor for the breath/voice, and a hard route change breaks the spell. But (b)
makes the beat un-resumable and un-linkable, which matters if the user closes the
tab. **Note the URL-stability lock:** if (a), the route is permanent once shipped.

### 4.2 What does the voice actually *say*?

The single highest-stakes copy decision in the product. It is the first sentence
anyone hears in their own preserved voice, and many users will be hearing a voice
they intend to outlive them.

Constraints: neutral (not addressed to any recipient — no Recipient exists yet),
short (§4.3 makes every second cost money), and true (it must not imply a message
was created or sent).

Candidate directions, **not recommendations**:
- Self-referential: *"This is my voice. However long it's needed, it's here."*
- Continuity-framed: *"If you're hearing this, I found a way to stay."*
- Plain//demonstrative: *"This is what I sound like. Kept, and ready."*

**Owner call.** Consider that a user may play this for family in the room.

### 4.3 When is it rendered? (this one has a real cost)

Every render is a paid ElevenLabs call.

- **(a) During processing** — rendered while the user waits on
  `/app/voice/processing`, ready the instant the ceremony ends. Zero wait at the
  peak moment. Costs one render per activated user, including those who bounce.
- **(b) On tap** — rendered when the user presses play. Only paid for by users who
  reach and want it, but inserts a several-second wait into the most emotionally
  loaded moment in the app.
- **(c) At voice-clone completion**, cached on the profile forever — rendered once,
  replayable from Settings or Home later, at no further cost.

*Engineering leans (a) or (c).* A spinner at this moment is the one place the
product genuinely cannot afford one. **(c) additionally answers §4.5.**

If cached, it needs a home: a nullable column on `voice_profiles`
(`sample_audio_path`, `sample_duration_ms`) is the obvious shape, and would need a
migration.

### 4.4 Does it autoplay, or does the user press play?

Autoplay is emotionally stronger and is blocked by iOS Safari without a prior user
gesture. The ceremony arriving here has *had* gestures, so it may be permitted —
**but this must be verified on a real iPhone, not assumed.** A silently-failed
autoplay at this beat is worse than a button.

A press-to-play also gives the user *consent* over a potentially overwhelming
moment, which may be the kinder design regardless.

### 4.5 Can they hear it again later?

Nothing in the product currently lets a user hear their own voice without creating
a message. If this sample is cached (§4.3c), Settings or Home B could offer a quiet
"hear your voice" affordance. **Out of scope for this build** — but if the answer
is likely yes, choose (c) now so the artifact exists.

### 4.6 Skip path?

The ceremony has a skip. Does this? The journey rule says playback *must occur*
before first message creation — is "occur" satisfied by *being offered*, or by
*being played*? Affects whether a skip is permitted and what the analytics event
means.

*Engineering reads it as offered, not forced* — never trap a user in a modal to
satisfy a spec line. But it makes the funnel metric ambiguous, so decide it
explicitly.

### 4.7 What if the render fails?

ElevenLabs 502s. The user has paid, waited, and is standing at the emotional peak.
Per Copy Guide §8 the beat must state what happened, reassure what is safe (*their
voice is fine — the render failed, not the voice*), and offer one next step. It
must never dead-end and must never block the path to message creation.

Design the failure state; do not leave it to engineering to improvise.

### 4.8 Waveform, or not?

The spec explicitly defers this (*"Not Yet Decided: waveform rendering"*). A6 and
the Shelf currently ship playback without one. A live waveform is the single most
expensive thing that could be added here on a throttled phone.

---

## 5. States the prototype must carry

The happy path is one frame out of roughly eighteen. Ship the prototype with a
state switcher (the Step 3 prototype's pattern — see
`src/components/screens/step3/mockStates.ts` for how the states were enumerated
there) so each of these can be inspected in isolation.

Grouped by axis. **Bold** = needs its own designed frame; the rest are variants
of one.

### A · Render — does the audio exist yet

| | State | Notes |
|---|---|---|
| A1 | **Rendering** | Only reachable if §4.3 chooses render-on-tap, or if a pre-render is still in flight. If the wait can exceed ~3s it needs timed copy beats — precedent: A5 `GenerationScreen` runs three beats at 5s and 10s. |
| A2 | **Ready, never played** | The primary state. Carries the whole invitation. |
| A3 | **Render failed — retryable** | ElevenLabs 502'd. Their voice is fine; the render failed. Say so. |
| A4 | Render failed — exhausted | After the retry ceiling, switch to contact-as-care. Precedent: A5's 3-attempt ceiling → "Reach us and we'll shape it with you". Variant of A3. |

### B · Playback — the listening itself

`usePlaybackController` already models all of this (`audioLoading`, `playingId`,
`isPaused`, `ended`, `currentTime`, `duration`, `audioError`) — the design just
has to say what each looks like.

| | State | Notes |
|---|---|---|
| B1 | (= A2) Idle / invitation | |
| B2 | Loading | Signed-URL fetch. Usually sub-second — must not flash a spinner. Variant of B1. |
| B3 | **Playing** | Elapsed vs. duration. See §4.8 on whether a waveform earns its cost. |
| B4 | Paused | Does a pause even exist here, or is this beat uninterruptible once begun? Design call. |
| B5 | **Ended — first listen complete** | **The actual payoff frame.** See below. |
| B6 | Replaying | Second and subsequent listens. Does the after-copy persist or has it done its work? Does the forward CTA stay put? |

### C · Failure

| | State | Notes |
|---|---|---|
| C1 | **Playback failed** | Decode error, 404, expired signed URL. Distinct from A3: the audio exists, delivery failed. Retry is free — say so differently. |
| C2 | **Autoplay blocked** | Only if §4.4 chooses autoplay. iOS Safari blocks silently. Must degrade to a visible, obvious play affordance. **Silence with no affordance is the single worst outcome this screen can produce** — it reads as "the product is broken" at the exact moment it is meant to prove it works. |
| C3 | Offline | Precedent: `useOnline()` + `OfflineActionNote`. Gate only the render/retry path; never trap the user — the way forward to message creation stays open. |

### D · Environment and accessibility

| | State | Notes |
|---|---|---|
| D1 | Reduced motion | `useReducedMotion()`. No held entrance; the beat is simply there. |
| D2 | **Audio unavailable to this user** | A deaf or hard-of-hearing user must still get this beat. The spoken line is one sentence — show it as text, always, not as a fallback. This is also what a screen reader announces. |
| D3 | Device muted / volume at zero | Undetectable in the browser. D2's visible text plus a gentle "sound on" hint before playing is the only real mitigation. Worth designing rather than ignoring — a muted phone otherwise produces the same experience as C2. |

### E · Entry and re-entry

| | State | Notes |
|---|---|---|
| E1 | **First arrival** | Straight out of the ceremony. The ceremonial framing. |
| E2 | **Re-entry / refresh** | User reloads mid-beat, or backs into it. Does the ceremony replay in full, or land calm and already-ready? A full ceremonial replay on every refresh becomes grating fast. |
| E3 | Returning later | Only if §4.5 says the sample is replayable from Settings/Home. Same audio, entirely different register — no ceremony, no first-time copy. |
| E4 | Skipped | Only if §4.6 permits a skip. What the user sees on the way out. |

### The four that actually matter

Do not grind evenly through all eighteen. These carry the screen:

1. **A2/B1 — ready, never played.** The invitation. Everything upstream has been
   spent to earn this frame.
2. **B5 — the moment it finishes.** This is the payoff and it is the one most
   easily left undesigned, because on the happy path it lasts two seconds and
   then the user leaves. It is where recognition actually lands
   (*"That's you. Clear, steady, familiar."*) and where the forward CTA should
   arrive — **not before the sample has been heard.**
3. **A3 — render failed.** The user has paid, waited, and is standing at the
   emotional peak. Copy Guide §8: state it plainly, reassure what's safe (their
   voice is intact — the render failed, not the voice), offer one next step,
   never dead-end.
4. **C2 — autoplay blocked.** Cheap to design, catastrophic to omit.

### Extremes to hold the layout against

- **Sample length.** A 4-second line and a 20-second one must both sit correctly.
  §4.2's copy decision changes this, so design for a range rather than a number.
- **Long display name**, if the copy uses one.
- **390×844 at 4× CPU throttle** — the shippability bar, not a nice-to-have.

---

## 6. Build guidelines (engineering constraints — not negotiable)

Straight from `CLAUDE.md`; the design can shape anything except these.

**Three-layer separation**
- Screen component in `src/components/screens/` — **pure and props-driven.** It
  never imports Supabase, never fetches, never routes.
- Data fetch, auth check, and the render trigger live in the `page.tsx` (or the
  existing client wrapper if this becomes a First Breath phase).
- Actions bubble out via callback props.

**Required scaffolding**
- A `/dev/{name}` page rendering the screen with mock data — **permanent**, even
  if no QA flow uses it. This is how the screen gets iterated in isolation.
- If it becomes a route, the URL is **locked on first ship** (DECISIONS URL
  stability). Name it deliberately.

**Motion bar**
- Verify in a real browser via Playwright at **4× CPU throttle on a mobile
  viewport** (390×844) before calling it done. If motion feels off at 4×, it will
  feel off on a mid-range Android at 1×.
- Prefer GPU-only properties (opacity/transform). Honour
  `prefers-reduced-motion` — see `useReducedMotion()`.

**Sizing gotcha, already paid for once**
- Full-height screens inside the app shell must size to
  `calc(100dvh - var(--app-main-inset-bottom, 0px))`, **not** plain `100dvh`,
  or the page scrolls by the shell's 40px bottom padding. See
  `docs/follow-ups/2026-09-04-full-height-screens-overflow-the-app-shell-padding.md`.

**Cost controls**
- A render is real money. Whatever §4.3 decides, the trigger must be
  **idempotent** — a refresh, a double-tap, or a back-navigation must not render
  twice. The Step 6 cost-control patterns in `src/lib/messages/cost-controls.ts`
  are the reference.

**Analytics**
- This is a **funnel landmark** and belongs in `JOURNEY_EVENTS`
  (`src/lib/analytics/journey.ts`) alongside `voice_profile_ready` and
  `subscription_started` — it is the missing link between "voice ready" and "first
  message". Ship a `docs/analytics/YYYY-MM-DD-*.md` note in the same PR.
- At minimum: reached, played, completed-listen, skipped (if §4.6 allows),
  render-failed.

**Copy**
- `docs/ESSENCE_Copy_Voice_Guide.md` governs. The "Vault-appears-zero-times" rule
  (§2 above) is the one most likely to be broken by accident.

---

## 7. Deliverable

Per the prototypes-are-source-of-truth rule, the design deliverable is a
**self-contained prototype** — `prototypes/essence-step5-first-playback.html` —
carrying the real timings, cadence, copy, and motion, plus written answers to §4.
Production then mirrors it rather than inventing a second motion grammar.

Reference prototypes for register and continuity:
- `prototypes/first-breath-stone.html` — the beat immediately before this one
- `prototypes/old-monetization-trigger.html` SCREEN 3 — the closest existing
  playback moment (*"That's you. Clear, steady, familiar."*)

---

## 8. Definition of done

- [ ] §4 answered in writing, by the owner where marked
- [ ] Prototype landed and agreed, carrying the §5 states
- [ ] Screen in `src/components/screens/`, pure and props-driven
- [ ] `/dev/{name}` page exists
- [ ] Render path idempotent; §5 failure states (A3, C1, C2) designed and implemented
- [ ] The spoken line is visible as text (§5 D2), not audio-only
- [ ] Journey analytics event + analytics note
- [ ] Verified at 4× throttle on 390×844, and **autoplay behaviour verified on a
      real iPhone** if §4.4 chooses autoplay
- [ ] The word "Vault" appears zero times on the screen
- [ ] `FirstBreathSequence.handleExit()` no longer jumps straight to
      `/messages/new` — the immutable journey rule is satisfied

---

## Appendix — source references

| Claim | Source |
|---|---|
| Step 5 intent, "neutral playback sample", no Message object | `docs/MASTER_SPEC.md:673-681` |
| Immutable rules 3 & 4 | `docs/MASTER_SPEC.md:795-796` |
| "Vault appears zero times" through First Playback | `docs/MASTER_SPEC.md:304`, `:315` |
| Journey order | `docs/MASTER_SPEC.md:595` |
| Current exit straight to message creation | `src/components/screens/FirstBreathSequence.tsx:132-141` |
| Ceremony audio is procedural, not the user's voice | `src/lib/audio/firstBreathAudio.ts:1-26` |
| Carol sample is another person, pre-payment | `src/app/app/vault/protect/CardCaptureActions.tsx:26-27` |
