# Step 6 · A6 — Deferred-Audio Variant — Design Handoff

**For:** the design architect
**From:** engineering (Session 8)
**Date:** 2026-06-10
**Status:** Spec for a second A6 variant. The first prototype
(`essence-step6-a6.html`) is approved as the **control-arm** A6 and is not
changing. This doc specs the **Deferred-Audio** A6 — a re-composition of that
prototype, not a rebuild.

---

## 1. Why there are two A6s

The shipped prototype implements **audio-on-every-regenerate**: every "Try
another take" renders a new voice recording immediately, capped at 3, dots
draining. That's the **control arm** — the baseline.

Since that prototype was built, we locked **Amendment A1 (Deferred Audio
Render)** — the cost-saving model where the cheap thing (text) is free to
explore and the expensive thing (a voice recording) is only spent on intent. It
ships behind a flag and is A/B-tested against the control arm, so **both A6s
need to exist.** This doc is the Deferred-Audio one.

The amendment decisions are locked — see `Step6_OpenContracts.md` → Amendment
A1. **Do not relitigate them** (§4 below); spend the design energy on the new
states, the candidate-vs-committed treatment, and the copy.

---

## 2. The model shift, in one sentence

> **Text is free to explore; a recording is the thing you commit to.**

| | Control arm (shipped prototype) | **Deferred Audio (this variant)** |
|---|---|---|
| "Try another" | renders audio every time | **free text draft, no audio** |
| To hear a draft | (always already rendered) | **tap "Hear this in your voice"** (spends a recording) |
| Limits | 3 takes total | **10 free text re-rolls + 3 voice recordings** |
| The dots | regenerations remaining (3) | **voice recordings remaining (3)** |
| Reshape | re-renders on arrival | **returns as a text draft, no audio** |

The first listen is **unchanged** — it still arrives already recorded. We never
defer the opening "hear it in your voice" moment. Deferral applies only once the
user is *shopping for a take*.

---

## 3. What to reuse verbatim (please don't rebuild)

The control-arm prototype's foundation is correct and shared. Carry it over
unchanged:

- Token set, phone frame, status bar / island / home indicator, variant label.
- The **atmosphere stack** (warm-light glow + vignette) and its `is-playing` intensify.
- The **Breath Stone** and its three states — Ready, Playback, Working.
- Backbar + 5 pips (step 4 current).
- The **scrubber / player** component and its first-listen behavior.
- The **discard bottom sheet** (focus trap, Escape/backdrop = Keep it).
- The **Save** submitting → saved states.
- Reduced-motion handling and the accessibility patterns (slider role, SR gating).
- Entrance choreography (stone → question → player → transcript).

The Deferred-Audio A6 is **these parts, re-composed** around a new "candidate"
state and a commit affordance.

---

## 4. Locked decisions (A1 — do not change)

1. **Limits:** 3 voice recordings + 10 free text re-rolls per message.
2. **Dots = voice recordings remaining** (not text re-rolls).
3. **Save keeps the last take you *heard*.** An un-heard draft on screen is dropped.
4. **Reshape is deferred** — returns as a text draft, no auto-recording.
5. **No reveal beat on commit** — when a committed draft first plays, it just
   slides into Playback. Commit reads as "choosing," not a second ceremony.
6. **"You've hit a limit" points at recordings** (the paid thing).

---

## 5. The state set

The control-arm prototype had 4 dev-rail states (first listen, after regenerate,
cap reached, discard sheet). The Deferred-Audio variant needs the following.
**Bold = new or materially changed** vs the control-arm prototype.

### 5.1 First listen — *unchanged from control arm*
Committed take, already recorded. Stone Ready → Playback on tap, scrubber,
transcript (dimmed until first play), full action stack. This is the magic
moment; leave it as the prototype has it.

### 5.2 **Variant Preview (candidate)** — the core new state
After "Try another," a **text draft** is shown with **no audio**.

- The **player/scrubber is replaced** by a commit affordance: **"Hear this in
  your voice."** (There is nothing to scrub — no recording exists yet.)
- The **stone holds in Ready** (not Playback — nothing is playing).
- The **transcript shows the candidate text**, visually marked as **not-yet-yours**
  (see §7 — this is the key open design call).
- The committed take you last heard is **still safe underneath** — "Keep the
  current one" returns to it.

### 5.3 **Committed (after a commit)** — back to playback
Tapping "Hear this in your voice" records the draft and it becomes the new
committed take. It enters **Playback** (per decision #5, **no special reveal**) —
visually this looks like the first-listen playback state, now for the new take.

### 5.4 **Recording cap reached** (3 recordings spent)
The commit affordance is spent. **Text re-rolls may still be available** (they're
a separate budget), so "Try another" can remain — but committing is done. Surface
a quiet note keyed to recordings (decision #6). The user can still Save the take
they last heard, Reshape, or Discard.

### 5.5 **Text-reroll soft cap** (10 text re-rolls)
Stays invisible until ~1 re-roll remains, then a quiet note. Not a hard wall in
the foreground.

### 5.6 **Commit failure** — new, and the delicate one (A1 §5.5)
If "Hear this in your voice" fails to record, the user invested in choosing this
draft and hit a wall. **The prior committed take stays intact**, the **draft text
is preserved**, and we offer a clean retry. Never silently fall back to a
different take, and a failed recording **does not** spend one of the 3. This is
distinct from the control arm's "audio clip failed to load" affordance — design a
retry that fits the commit moment.

### 5.7 Discard sheet — *reuse from control arm.*

### 5.8 Reshape (deferred) — returns to A6 as a **candidate** (§5.2), text-first.

---

## 6. The action stack

Two shapes, depending on whether a candidate is on screen.

**Committed / first-listen state** (no candidate):
1. **Save this message** (primary) — keeps the take you're hearing.
2. **Try another** (secondary, free) — with the dots = **recordings remaining**.
3. Reshape your note (link)
4. Discard (link)

**Candidate on screen** (un-heard draft):
1. **Hear this in your voice** — the commit (spends a recording).
2. **Try another** (free) — pull a different draft.
3. **Keep the current one** — drop the draft, return to the committed take.
4. Save / Reshape / Discard still present — **Save keeps the *committed* take**,
   and the draft is dropped (decision #3). The UI must make it unambiguous that
   Save does **not** keep the un-heard draft.

**You own the hierarchy** when a candidate is on screen — what reads as primary,
how Save's "I'll keep the heard one" is signaled, where the dots sit.

---

## 7. Open design decisions (yours to make)

These are the real design calls — please drive them:

1. **Candidate-vs-committed visual treatment** *(the big one)* — how an un-heard
   draft looks distinct from the take you've committed to. It must read as
   "exploring / not yet yours," not as "saved." Everything else hangs off this.
2. **Action-stack hierarchy with a candidate present** (§6) — and how Save
   signals it keeps the *heard* take, not the draft.
3. **Commit-failure retry UX** (§5.6) — copy + the retry affordance.
4. **Where the dots live and how the text-reroll soft cap surfaces** (§5.5).
5. **Copy** for every new slot — see §8.

---

## 8. Copy slots needed (for the copy pass)

- The commit affordance — working: *"Hear this in your voice."*
- "Try another" (free text draft) — working: *"Try another."*
- "Keep the current one" (return to committed) — working as written.
- Candidate "not-yet-yours" marker (label or microcopy on the transcript).
- Recording-cap note (decision #6 — keyed to recordings, calm register).
- Text-reroll soft-cap note (quiet, near the end of 10).
- Commit-failure message + retry (§5.6).

All copy is placeholder until the copy pass — same as the control-arm prototype.

---

## 9. What the UI talks to (backend contract — for awareness, already built)

The Deferred-Audio backend is built and tested behind the `DEFERRED_AUDIO_ENABLED`
flag. The screen's actions map to:

| Screen action | Backend |
|---|---|
| Arrive (first listen) | comes from A5 with a `generationId`; recording already exists |
| **Try another** | `POST /api/messages/regenerate` (variant) → returns a **text candidate, no audio**; soft-capped at 10 |
| **Hear this in your voice** | `POST /api/messages/commit` → records the candidate, promotes it; capped at 3; failure-safe |
| Keep the current one | clears the candidate (small server bit, lands with this build) |
| Save | `POST /api/messages/save` → keeps the committed take |
| Reshape | `POST /api/messages/generate` (edit-note) → returns a candidate |
| Discard | `POST /api/messages/discard` |
| Play a take | a pending-audio playback URL (engineering is adding this) |

You don't need to design to the API shapes — this is just so the states above
have a real backend behind them. They do.

---

## 10. Out of scope (per the control-arm foundation)

- Final copy (copy pass).
- Telemetry and URL routing (engineering).
- The control-arm A6 — it's done; this is the sibling variant.

---

## 11. Deliverable

A second self-contained prototype (e.g. `essence-step6-a6-deferred.html`)
mirroring the control-arm file's structure and dev-rail, with states for: first
listen, **variant preview (candidate)**, committed-after-commit, recording-cap,
text-reroll soft cap, **commit failure**, and the discard sheet. Reuse §3
verbatim; spend the energy on §5.2, §5.6, and §7.
