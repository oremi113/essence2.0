# Step 6 — A2 & A6 Design Package

For the ESSENCE design architect agent. Self-contained bundle — everything needed to build the two missing message-creation screen prototypes (A2 Recipient Setup, A6 Preview & Refine) without needing access to the rest of the repo.

## Package contents

1. **Design brief** — the spec for both screens with 9 open questions for you to resolve.
2. **Inventory excerpts** — the locked A2 and A6 screen rules from the canonical screen inventory.
3. **All five existing Step 6 prototypes** — full source for mirroring:
   - `essence-step6-pass2-c-screens.html` — multi-variation prototype with `dev-rail`. **Primary architecture reference.**
   - `essence-step6-a3.html` — Category Selector. Clean single-screen with Ready-state Breath Stone.
   - `essence-step6-a4.html` — Personal Note. Input pattern with skip/continue parity.
   - `essence-step6-a5.html` — Generation. Calm Working-state stone, latency framing.
   - `essence-step6-a7.html` — Save Confirmation. Ceremonial close, Infused/Celebrate stone.

## What we expect back

- Two files: `essence-step6-a2.html` and `essence-step6-a6.html`.
- Each fully self-contained (inline `<style>`, Google Fonts import, no external scripts).
- Each includes a `dev-rail` for variation switching, mirroring the pass2-c-screens pattern.
- Each opens with an inline comment block at the top documenting positioning intent, tone targets, and the resolutions chosen for each open question with brief reasoning.
- Any open question that couldn't be resolved gets a `<!-- DESIGN OPEN: ... -->` comment near the relevant code.

---

# 1. Design brief

# Step 6 — A2 & A6 Design Brief

For the design architect agent. Build two HTML prototypes that complete the Step 6 (message creation) screen set. Existing prototypes in the same folder are the style canon — mirror them, don't invent.

---

## What to build

Two single-file HTML prototypes, dropped into `prototypes/message creation/`:

1. **`essence-step6-a2.html`** — Recipient Setup. The flow entry.
2. **`essence-step6-a6.html`** — Preview & Refine. The emotional climax: the user hears their preserved voice say something they wrote, for the first time.

Both files self-contained (inline `<style>`, no external scripts beyond the existing Google Fonts import). Include a `dev-rail` for variation switching where multiple states exist (use `essence-step6-pass2-c-screens.html` as the reference for that pattern).

---

## Source documents

Authoritative, in priority order. If anything below contradicts an open question, read these first.

- **Screen specs**: `prototypes/message creation/ESSENCE_Step6_Message_Creation_Screen_Inventory.md` sections A2 and A6 — locked screen rules.
- **Style canon**: existing prototypes in `prototypes/message creation/` (a3, a4, a5, a7, pass2-c-screens). Mirror tokens, typography (Spectral + Inter), breath-stone integration, page cadence, motion grammar.
- **Breath Stone behavior**: `prototypes/breath-stone-api.md` + MASTER_SPEC Chapter 5 (states, transitions, what each state means emotionally).
- **Generation contract**: `MASTER_SPEC.md` Chapter 8 (text + audio timing, regenerate cap, audio-on-arrival rule).
- **Flow contract**: `docs/session-8/Step6_OpenContracts.md` (especially Q3 edit-note semantics — affects A6 affordances).
- **Telemetry**: `docs/analytics/2026-06-01-step6-events.md` events 1, 4, 7, 12 are the ones A2/A6 will eventually fire — design with the data joins in mind (e.g., `relationship` denormalized onto save means A2 surfaces a clean choice).

---

## V1 positioning (re-read before designing)

From the inventory: **the product is voice insurance.** Vault preservation is the core value; the 3 messages are a bolt-on. Step 6 should feel like "a nice thing you can do with your preserved voice," not a productivity tool, not a checkout flow. Tone everywhere: calm, ceremonial, never urgent.

This affects A6 especially. First listen is the emotional payoff. Don't bury it.

---

## A2 — Recipient Setup

**Purpose:** Who is this for?

**Locked content** (from inventory):
- Recipient name field.
- Relationship picker — daughter, son, partner, parent, grandchild, friend, other.
- Returning user variant: list of existing recipients with "+ Add new."
- Breath Stone in **Ready** state.

**Variations** (need separate panels in the dev-rail):
- **A2.a** — First-ever recipient. No list. Soft framing: "Who's this first message for?"
- **A2.b** — Returning user. List + "+ Add new."
- **A2.c** — Adding a new recipient (fresh form, from A2.b).

**Constraints carried in from the contracts doc:**
- The chosen recipient does **not** become a permanent `recipients` row at A2 submit (only at Save). So the UI should not promise "saved to your recipients" copy at this stage. The user is just labeling this attempt.

**Open questions for the architect to resolve:**

1. **Relationship picker shape** — chips, two-column grid, dropdown? Existing prototypes (a3 category selector) use a vertical option list with descriptors. Mirror that, or differentiate because relationship is a tighter choice with no descriptors?
2. **A2.a vs A2.b layout** — meaningfully different shape, or same screen with different headline + the optional list slot?
3. **Returning-user list cap** — most users will have 1–3 recipients across their 3 lifetime messages. Is pagination/scroll a real concern? If you show all of them, what's the layout when there are exactly 1, 2, or 3?
4. **Validation feedback** — recipient name is required to advance; relationship is required. Show inline errors on attempt, or disable Continue until both are valid? (Existing onboarding screens disable; check that pattern.)
5. **Privacy reassurance** — A2 is the first place a real person's name enters the system. Does the screen need a quiet reassurance line ("This stays in your private Vault" or similar), or is that a separate Settings/Trust surface? Risk: too much reassurance reads as "should I be worried?"
6. **Breath Stone position and scale** — same placement as a3/a4? Or does the entry screen warrant a slightly more prominent stone to set tone?

---

## A6 — Preview & Refine

**Purpose:** The user hears the message in their own voice for the first time. This is the emotional climax of the flow. Inventory calls this out as the screen that "deserves the most context and the highest fidelity."

**Locked content** (from inventory):
- Audio plays on arrival (or one-tap play if browser autoplay is blocked).
- Playback control (play / pause / scrub).
- Full transcript visible.
- Breath Stone in **Playback** state during play.
- Three actions: **Save**, **Regenerate**, **Discard**.
- Subtle indication of regenerations remaining — **visual, not numeric**.
- Secondary action: "Reshape your note" — routes back to A4 with note pre-filled. Counts as fresh generation, not regenerate. (Contracts doc Q3.)

**Variations** (dev-rail panels):
- **A6.a** — First listen (untouched).
- **A6.b** — After regenerate (same UI, new content, one fewer regeneration available).
- **A6.c** — Regeneration cap reached. Regenerate CTA softens — not a hard wall.
- **A6.d** — Discard confirmation. Soft modal: "Discard this message? Your voice will remain preserved."

**Constraints carried in from the contracts doc:**
- Audio is already generated when the user arrives at A6 (per MASTER_SPEC 8.7.2). No loading state.
- "Reshape your note" routes back to A4 but **does not** delete the current preview — the prior generation is preserved server-side until the new one succeeds (contracts doc Q3). Affects how this affordance reads: not a destructive action.
- Regenerate cap is 3 per generation; edit-note depth cap is 2. The cap-reached state is **soft language**, not a hard wall (inventory A6.c).

**Open questions for the architect to resolve:**

1. **Audio autoplay strategy** — design assuming autoplay works (the emotionally intended path), or design the one-tap-to-play fallback as the primary visual (the realistic browser path)? They look meaningfully different. Inventory acknowledges autoplay may be blocked but doesn't pick a primary visual. Pick one, justify it, and note how the other state surfaces.
2. **Regenerations-remaining indicator** — inventory says "visual, not numeric." Candidates: three subtle dots that fade as used, a breath-stone hue shift, a small radial indicator on Regenerate button. Pick a treatment that won't be misread as "energy" or "battery."
3. **Button hierarchy** — Save vs Regenerate vs Discard. My read: Save dominant (this is the goal), Regenerate prominent but secondary (it's where most users will go first), Discard tertiary/quiet. Confirm or counter-propose.
4. **Transcript treatment** — full text visible at once on mobile viewport? Or does it scroll under a sticky playback bar? Message length is 10–30 seconds spoken, so ~50–120 words. Mostly fits on one phone screen but not always.
5. **A6.c cap-reached softening** — how does the Regenerate CTA actually change? Same button, softer copy ("That's three — save, edit your note, or discard")? Disabled with a quieter affordance below? Don't let it feel punitive.
6. **A6.d discard modal form** — center modal with backdrop dim, bottom sheet, full overlay? Inventory says "soft modal" — pick a form and lock it.
7. **"Reshape your note" placement** — secondary action button next to Save, a quieter link below the three primary actions, or a tertiary slot inside a "more" affordance? It's important enough to be discoverable but not so prominent it competes with Save/Regenerate.
8. **Breath Stone across variations** — Playback during audio. What about the regen transition? Working state during the regen call, then back to Playback when new audio is ready? Same for "Reshape your note" → A4 — does the stone follow or reset?
9. **A6 → A4 visual continuity** — when the user taps Reshape, what does the transition look like? A4 has its own treatment. Does anything carry across (note text fades in, stone holds state)?

---

## Cross-cutting constraints

- **Mobile-first.** Existing prototypes target a mid-range Android viewport at 4× CPU throttle. Don't design something that feels precious only at desktop scale.
- **Reduced motion.** Each motion treatment needs a calm fallback per the onboarding pass-3 work. If you introduce a new motion grammar, include the reduced-motion shape.
- **Page cadence tokens.** Use the cadence tokens established in the voice-recording prototype.
- **No emoji.** No celebratory iconography on saves. ESSENCE's tone is quiet.
- **No content secrets in URL.** Per the contracts doc, A6 lives at a URL that includes only `generationId`. Don't design any affordances that imply note text or transcript is part of a shareable URL.

---

## Output expectations

For each prototype:
1. Single self-contained HTML file in `prototypes/message creation/`.
2. Title format matches existing: `ESSENCE · Step 6 · <code> <name>`.
3. Dev-rail at the top for variation switching (mirror `pass2-c-screens.html`).
4. Inline comment block at the top: short note on the *positioning intent*, *tone targets*, and *the resolutions chosen for each open question above* with reasoning. This becomes the design memo when production code starts.
5. Mark any open question that couldn't be resolved with a clear `<!-- DESIGN OPEN: ... -->` comment near the relevant code.

---

## What this brief does NOT cover

- Production code, screen components, dev pages, route paths — handled in a separate engineering session after the prototypes land.
- Telemetry instrumentation — events are defined in the analytics doc; wiring happens during production build.
- Failure / loading / network states inside A6 (audio playback failed, save failed) — those belong to the System States doc, not these prototypes.
- A2/A6 copy revisions for legal/trust — final copy lands after a separate copy pass.

---

# 2. Inventory excerpts — A2 and A6

Locked screen rules from `prototypes/message creation/ESSENCE_Step6_Message_Creation_Screen_Inventory.md`. These cannot change without an explicit decision memo.

### A2. Recipient Setup
**Purpose:** Who is this for?

**Content:**
- Recipient name field
- Relationship picker (daughter, son, partner, parent, grandchild, friend, other)
- Returning user: list of existing recipients with "+ Add new"
- Breath Stone in Ready state

**Variations:**
- A2.a — First-ever recipient (no list, soft "Who's this first message for?" framing)
- A2.b — Returning user (list + add new)
- A2.c — Adding a new recipient (fresh form)


### A6. Preview & Refine
**Purpose:** User hears the message in their voice for the first time. The emotional hook of the message creation flow.

**Content:**
- Audio plays on arrival (or one-tap play if autoplay is blocked)
- Playback control (play / pause / scrub)
- Full transcript visible
- Breath Stone in Playback state during play
- Three actions: **Save**, **Regenerate**, **Discard**
- Subtle indication of regenerations remaining (visual, not numeric counter)

**Variations:**
- A6.a — First listen (untouched)
- A6.b — After regenerate (same UI, new content, regenerations remaining decremented)
- A6.c — Regeneration cap reached (Regenerate CTA softens; user can save, edit note, or discard)
- A6.d — Discard confirmation (soft modal: "Discard this message? Your voice will remain preserved.")

**Edit note path:** Available as secondary action ("Reshape your note") that routes back to A4 with note pre-filled. Counts as a fresh generation, not a regeneration.


---

# 3. Reference prototype: pass2-c-screens.html

**Primary architecture reference.** Multi-variation prototype with `dev-rail` switching across C1/C2/C3 ceiling screens. Mirror this structure for A2 (3 variations) and A6 (4 variations).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>ESSENCE · Step 6 · Pass 2 · C1 · C2 · C3</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<!--
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║  NOTE FOR CODE ARCHITECT — Step 6 Pass 2 (C1, C2, C3)                 ║
  ║                                                                       ║
  ║  ─── POSITIONING ──────────────────────────────────────────────────── ║
  ║  The product is voice insurance. These three screens are the CEILING  ║
  ║  moment of the message creation flow. They are not a paywall.         ║
  ║  The user got what they paid for. Waitlist is a "look ahead."         ║
  ║                                                                       ║
  ║  Tone across all three:                                               ║
  ║   - Value-add framing ("the three included"), not scarcity            ║
  ║   - FOMO for V2, never pressure                                       ║
  ║   - Stewardship language, never sales                                 ║
  ║   - "Your voice is preserved" is the anchor phrase                    ║
  ║                                                                       ║
  ║  ─── VISUAL PROGRESSION (atmospheric step-down) ───────────────────── ║
  ║  C1 → full ceremonial, inherits A7's amber atmosphere                 ║
  ║  C2 → quieter warm, an announcement not a ceremony                    ║
  ║  C3 → cream calm, the ongoing steady-state                            ║
  ║                                                                       ║
  ║  ─── C1 · THREE SHAPED ────────────────────────────────────────────── ║
  ║  Triggered from A7 when variant='third' + user taps "See what's       ║
  ║  coming." One-time ceremony. Fires ONCE in the user's lifetime.       ║
  ║                                                                       ║
  ║  Stone state: infused (inherited from A7 — no mode change)            ║
  ║  Background: same 3-stop amber + ambient glow as A7                   ║
  ║  Primary CTA: "See what's coming" → routes to C2                      ║
  ║  Secondary link: "Back to Home" → Home B                              ║
  ║                                                                       ║
  ║  Entrance sequence (slower than A7 — this is the larger moment):      ║
  ║   0ms     stone fade + scale 0.92 → 1.0                               ║
  ║   1200ms  stone settled                                               ║
  ║   1600ms  title reveals (larger than A7 title)                        ║
  ║   2000ms  aside reveals                                               ║
  ║   2400ms  reassurance reveals (stewardship line)                      ║
  ║   2800ms  primary CTA reveals                                         ║
  ║   3200ms  secondary link reveals                                      ║
  ║                                                                       ║
  ║  ─── C2 · WAITLIST ────────────────────────────────────────────────── ║
  ║  Reachable from C1 primary, from C3 primary, and from Settings (V2).  ║
  ║  Captures: email (pre-filled) + multi-select feature priority signal. ║
  ║                                                                       ║
  ║  Stone state: shimmer (ceremonial stillness, smaller than C1)         ║
  ║  Background: bg-warm-1 (steps down from C1's gold)                    ║
  ║  Layout: stone small top, content stack below                         ║
  ║                                                                       ║
  ║  Data capture (V1 minimum):                                           ║
  ║   - Email opt-in (pre-filled from auth, confirmable)                  ║
  ║   - Multi-select: which features matter most                          ║
  ║   - Submit → confirm state with "You're on the list" treatment        ║
  ║                                                                       ║
  ║  V2 features to name explicitly:                                      ║
  ║   1. More messages each month                                         ║
  ║   2. Schedule messages for future dates                               ║
  ║   3. Birthday and occasion reminders                                  ║
  ║   4. Multiple voice profiles                                          ║
  ║   5. Longer, story-form messages                                      ║
  ║                                                                       ║
  ║  States:                                                              ║
  ║   - default  (before submit)                                          ║
  ║   - success  (after submit, confirmation surface)                     ║
  ║                                                                       ║
  ║  ─── C3 · VAULT LIMIT REACHED ─────────────────────────────────────── ║
  ║  Replaces A2 Recipient Setup when user taps "Create a message"        ║
  ║  with three already saved. This is the ONGOING state for capped       ║
  ║  users — they see this every time they try to create a 4th+.          ║
  ║                                                                       ║
  ║  Stone state: archive (static, preserved, no motion)                  ║
  ║  Background: bg-neutral (cream, matches the rest of the app)          ║
  ║  Primary CTA: "See what's coming" → routes to C2                      ║
  ║  Secondary link: "Back to Home" → Home B                              ║
  ║                                                                       ║
  ║  Tone here: the calmest of the three. The user has seen C1 already    ║
  ║  (likely weeks or months ago). This is not an event. It's a gentle    ║
  ║  fact. Shorter copy, less atmosphere, no celebration.                 ║
  ║                                                                       ║
  ║  ─── ACCESSIBILITY ──────────────────────────────────────────────── ║
  ║  - C1/C3: role="status" + aria-live="polite" on the confirm region    ║
  ║  - C2: form uses role="form" + labeled fieldsets                      ║
  ║  - Stones are aria-hidden="true" everywhere                           ║
  ║  - Primary button receives focus after entrance completes             ║
  ║  - Reduced motion: atmospheric loops pause at mid-frame; entrance     ║
  ║    animations collapse to instant                                     ║
  ║                                                                       ║
  ║  ─── DO NOT ADD ────────────────────────────────────────────────── ║
  ║  - Countdown timers anywhere                                          ║
  ║  - "Upgrade to Legacy" CTAs (Legacy is deferred to V2 waitlist)       ║
  ║  - Scarcity framing ("you've used up")                                ║
  ║  - Confetti, particle bursts                                          ║
  ║  - Discount offers                                                    ║
  ║  - "We'd hate to lose you" / save-offer language                      ║
  ║                                                                       ║
  ║  ─── V2 BACKLOG ────────────────────────────────────────────────── ║
  ║  - Sound design hook: soft chime on C1 stone arrival @ 1200ms         ║
  ║  - C2 multi-select: compute counts server-side as demand signal       ║
  ║  - C2 success state: post-submit email confirmation surface           ║
  ║  - Repeat-view compression on C3: after 3+ views, compress entrance   ║
  ╚═══════════════════════════════════════════════════════════════════════╝
-->

<style>
:root {
  /* Background ramp (from design-tokens.md, canonical) */
  --color-bg-neutral:     #FBF8F4;
  --color-bg-warm-1:      #F9F3E8;
  --color-bg-warm-2:      #F6F0E5;
  --color-bg-warm-phase:  #F2EDE4;
  --color-bg-gold:        #F2E8D6;
  --color-bg-rich:        #EDE3D0;

  --color-surface-card:   #F6F0E5;
  --color-surface-warm:   #EDE3D0;
  --color-surface-honey:  #F2E8D6;

  --color-mineral:        #7A8088;
  --color-mineral-dark:   #656B73;

  --color-text-primary:   #1C1A18;
  --color-text-secondary: #6B6B6B;
  --color-text-tertiary:  #ADA9A5;

  --color-border:         rgba(0, 0, 0, 0.06);
  --shadow-sm:            0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md:            0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-mineral:       0 4px 12px rgba(74, 107, 126, 0.3);
  --shadow-focus-ring:    0 0 0 4px rgba(122, 128, 136, 0.18);

  --font-display: 'Spectral', Georgia, serif;
  --font-body:    'Inter', system-ui, sans-serif;

  --text-h1:      36px;
  --text-hero:    40px;
  --text-title:   28px;
  --text-body-lg: 18px;
  --text-body:    16px;
  --text-ui:      15px;
  --text-small:   14px;
  --text-caption: 12px;

  --line-height-title: 1.4;
  --line-height-hero:  1.2;

  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   12px;
  --space-lg:   16px;
  --space-xl:   24px;
  --space-2xl:  32px;
  --space-3xl:  40px;
  --space-4xl:  48px;

  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   10px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  --ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-press:   cubic-bezier(0.2, 0.0, 0.0, 1);
  --duration-micro:  200ms;
  --duration-small:  400ms;
  --duration-medium: 800ms;
  --duration-large:  1200ms;
  --duration-breath: 3000ms;

  --size-control-md: 52px;
  --stone-sm: 100px;
  --stone-md: 140px;
  --stone-lg: 180px;
  --stone-xl: 220px;

  --scale-press:        0.98;
  --scale-press-subtle: 0.99;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: #1C1A18;
  background-image: radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 70%);
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 12px 60px; gap: 24px;
}
button { font-family: inherit; }

@media (prefers-reduced-motion: reduce) {
  .phone::before,
  .phone__screen--c1::after,
  .stone::before,
  .stone::after,
  .stone__body {
    animation-play-state: paused !important;
  }
  .stone,
  .reveal,
  .confirm-title,
  .confirm-aside,
  .confirm-reassurance,
  .footer .btn,
  .footer .btn--link {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   PHONE FRAME — reusable across all three screens
   ══════════════════════════════════════════════════════════════════════ */
.prototype-wrapper {
  width: 390px; height: 812px;
  border-radius: 48px; overflow: hidden;
  box-shadow:
    0 0 0 10px #1A1715,
    0 0 0 12px var(--color-mineral),
    0 50px 100px rgba(0,0,0,0.45);
  position: relative; flex-shrink: 0;
  background: var(--color-bg-neutral);
}
@media (max-width: 440px) {
  .prototype-wrapper { transform: scale(0.88); transform-origin: top center; }
}

.phone {
  width: 100%; height: 100%;
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  font-family: var(--font-body); color: var(--color-text-primary);
  /* Default background — individual screens override */
  background: var(--color-bg-neutral);
}
/* The `hidden` HTML attribute sets display:none at user-agent priority,
   which loses to our .phone { display: flex } rule above. Force it. */
.phone[hidden] { display: none !important; }

.phone__status {
  position: absolute; inset: 0 0 auto 0; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px 0;
  font-weight: 600; font-size: var(--text-small);
  color: var(--color-text-primary); z-index: 10; pointer-events: none;
}
.phone__status-icons { display: flex; gap: 6px; align-items: center; }
.phone__island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 30px; border-radius: 999px; background: #0B0B0B; z-index: 11;
}
.phone__home-indicator {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px; border-radius: 3px;
  background: rgba(28,26,24,0.35); z-index: 10;
}
.phone__screen {
  position: absolute; inset: 44px 0 0 0;
  display: flex; flex-direction: column; z-index: 3;
}

/* ══════════════════════════════════════════════════════════════════════
   C1 — THREE SHAPED (inherits A7 atmosphere, larger ceremony)
   ══════════════════════════════════════════════════════════════════════ */
.phone--c1 {
  background: linear-gradient(
    180deg,
    #EDDCAB 0%,
    var(--color-bg-gold) 45%,
    #F4E5BC 100%
  );
}
/* Ambient warm glow — amber light around stone focal point */
.phone--c1::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 40%,
    rgba(214, 162, 92, 0.32) 0%,
    rgba(214, 162, 92, 0.12) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: 1;
  animation: ambientGlow 13s var(--ease-essence) infinite;
}
/* Vignette — soft corner deepening, static */
.phone--c1::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
  pointer-events: none;
  z-index: 2;
}
@keyframes ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}

/* ══════════════════════════════════════════════════════════════════════
   C2 — WAITLIST (quieter, announcement not ceremony)
   ══════════════════════════════════════════════════════════════════════ */
.phone--c2 {
  background: linear-gradient(
    180deg,
    var(--color-bg-warm-2) 0%,
    var(--color-bg-warm-1) 55%,
    var(--color-bg-warm-2) 100%
  );
}
.phone--c2::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 80% 50% at 50% 18%,
    rgba(214, 180, 130, 0.18) 0%,
    rgba(214, 180, 130, 0.06) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: 1;
}

/* ══════════════════════════════════════════════════════════════════════
   C3 — VAULT LIMIT REACHED (cream, settled, ongoing)
   ══════════════════════════════════════════════════════════════════════ */
.phone--c3 {
  background: var(--color-bg-neutral);
}
/* Very subtle warm wash — present but almost imperceptible */
.phone--c3::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 85% 60% at 50% 35%,
    rgba(214, 180, 130, 0.10) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 1;
}

/* ══════════════════════════════════════════════════════════════════════
   STAGE — vertically centered ceremonial layout (C1, C3)
   ══════════════════════════════════════════════════════════════════════ */
.confirm {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
}

/* ══════════════════════════════════════════════════════════════════════
   STONE — three states, static PNG-style gradient approximations
   ══════════════════════════════════════════════════════════════════════ */
.stone {
  position: relative; border-radius: var(--radius-full);
  width: var(--stone-xl); height: var(--stone-xl);
  margin-bottom: var(--space-3xl);
  opacity: 0;
  transform: scale(0.92);
  animation: stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
.stone--md { width: var(--stone-md); height: var(--stone-md); margin-bottom: var(--space-xl); }
.stone--sm { width: var(--stone-sm); height: var(--stone-sm); margin-bottom: var(--space-lg); }

@keyframes stoneArrival {
  to { opacity: 1; transform: scale(1); }
}

/* ─── Infused (C1) — warm amber, 5s body / 7s halo / 9s shimmer ─── */
.stone--infused::before {
  content: ''; position: absolute; inset: -32%; border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(232, 178, 96, 0.32), transparent 62%);
  animation: stoneHaloInfused 7s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
.stone--infused::after {
  content: ''; position: absolute; top: 15%; left: 22%;
  width: 30%; height: 20%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 70%);
  border-radius: var(--radius-full); filter: blur(6px); pointer-events: none;
  animation: stoneShimmerInfused 9s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
.stone--infused .stone__body {
  background: radial-gradient(circle at 30% 28%, #FCEEC9 0%, #ECCC83 28%, #C99A4D 60%, #856029 90%);
  box-shadow:
    0 24px 48px rgba(160, 110, 50, 0.24),
    inset -16px -24px 50px rgba(100, 65, 25, 0.40),
    inset 16px 16px 36px rgba(255, 245, 220, 0.40);
  animation: stoneBreathInfused 5s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
@keyframes stoneBreathInfused {
  0%, 100% { transform: scale(1);    filter: brightness(1); }
  50%      { transform: scale(1.04); filter: brightness(1.06); }
}
@keyframes stoneHaloInfused {
  0%, 100% { transform: scale(1);    opacity: 0.18; }
  50%      { transform: scale(1.12); opacity: 0.32; }
}
@keyframes stoneShimmerInfused {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.80; }
}

/* ─── Shimmer (C2) — warm neutral, ceremonial stillness ─── */
.stone--shimmer::before {
  content: ''; position: absolute; inset: -24%; border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(214, 180, 130, 0.22), transparent 60%);
  animation: stoneHaloShimmer 5s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
.stone--shimmer::after {
  content: ''; position: absolute; top: 14%; left: 20%;
  width: 32%; height: 22%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.50), transparent 70%);
  border-radius: var(--radius-full); filter: blur(5px); pointer-events: none;
  opacity: 0.7;
}
.stone--shimmer .stone__body {
  background: radial-gradient(circle at 30% 28%, #F8F0DC 0%, #D7C8AE 32%, #A89577 65%, #7D7060 92%);
  box-shadow:
    0 18px 36px rgba(100, 85, 60, 0.20),
    inset -14px -20px 42px rgba(90, 75, 55, 0.34),
    inset 14px 14px 30px rgba(255, 245, 220, 0.32);
  animation: stoneBreathShimmer 5s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
@keyframes stoneBreathShimmer {
  0%, 100% { transform: scale(1);    filter: brightness(1); }
  50%      { transform: scale(1.03); filter: brightness(1.04); }
}
@keyframes stoneHaloShimmer {
  0%, 100% { transform: scale(1);    opacity: 0.08; }
  50%      { transform: scale(1.08); opacity: 0.22; }
}

/* Archive (C3) — preserved, still, NO MOTION. Warm amber family like
   infused but dialed down: slightly deeper saturation, less specular
   brightness, no breath. Reads as "at rest," not "dead." */
.stone--archive::before {
  content: ''; position: absolute; inset: -20%; border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(200, 150, 80, 0.18), transparent 62%);
}
.stone--archive::after {
  content: ''; position: absolute; top: 15%; left: 22%;
  width: 28%; height: 19%;
  background: radial-gradient(ellipse, rgba(255, 245, 220, 0.50), transparent 70%);
  border-radius: var(--radius-full); filter: blur(5px); pointer-events: none;
  opacity: 0.6;
}
.stone--archive .stone__body {
  background: radial-gradient(circle at 30% 28%, #F6E4BC 0%, #DDB778 28%, #B08A4A 60%, #6B4E25 92%);
  box-shadow:
    0 18px 36px rgba(120, 85, 40, 0.22),
    inset -14px -20px 44px rgba(85, 55, 20, 0.38),
    inset 14px 14px 32px rgba(255, 240, 210, 0.36);
}
.stone__body {
  width: 100%; height: 100%; border-radius: var(--radius-full);
}

/* ══════════════════════════════════════════════════════════════════════
   COPY REVEAL — shared pattern, delay set per-screen
   ══════════════════════════════════════════════════════════════════════ */
.reveal {
  opacity: 0;
  transform: translateY(8px);
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
@keyframes copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

/* ══════════════════════════════════════════════════════════════════════
   C1 — THREE SHAPED content
   ══════════════════════════════════════════════════════════════════════ */
.c1-title {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: 600;
  line-height: var(--line-height-hero);
  color: var(--color-text-primary);
  letter-spacing: -0.012em;
  margin-bottom: var(--space-lg);
  max-width: 340px;
  text-wrap: balance;
  animation-delay: 1600ms;
}
.c1-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 300px;
  margin-bottom: var(--space-lg);
  text-wrap: balance;
  animation-delay: 2000ms;
}
.c1-reassurance {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-tertiary);
  max-width: 280px;
  letter-spacing: 0.005em;
  animation-delay: 2400ms;
}

/* ══════════════════════════════════════════════════════════════════════
   C2 — WAITLIST content
   ══════════════════════════════════════════════════════════════════════ */
.waitlist {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center;
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
  overflow-y: auto;
  /* Ensure CTA footer content doesn't get crowded */
  padding-bottom: calc(var(--space-xl) + 140px);
}
.waitlist-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-mineral);
  margin-bottom: var(--space-md);
  animation-delay: 1400ms;
}
.waitlist-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  text-align: center;
  margin-bottom: var(--space-sm);
  max-width: 320px;
  text-wrap: balance;
  animation-delay: 1700ms;
}
.waitlist-subtitle {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--space-2xl);
  max-width: 300px;
  text-wrap: balance;
  animation-delay: 2000ms;
}

.waitlist-features {
  width: 100%;
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg) var(--space-lg);
  margin-bottom: var(--space-xl);
  animation-delay: 2300ms;
}
.waitlist-features-label {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  display: block;
}
.waitlist-feature {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.waitlist-feature + .waitlist-feature {
  border-top: 1px solid rgba(0,0,0,0.04);
}
.waitlist-feature__check {
  width: 22px; height: 22px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-text-tertiary);
  background: transparent;
  flex-shrink: 0; margin-top: 2px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--duration-micro) var(--ease-essence),
              border-color var(--duration-micro) var(--ease-essence);
  position: relative;
}
.waitlist-feature__check svg {
  opacity: 0;
  transform: scale(0.6);
  transition: opacity var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
  color: #fff;
}
.waitlist-feature.is-checked .waitlist-feature__check {
  background: var(--color-mineral);
  border-color: var(--color-mineral);
}
.waitlist-feature.is-checked .waitlist-feature__check svg {
  opacity: 1;
  transform: scale(1);
}
.waitlist-feature__text {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.45;
  color: var(--color-text-primary);
  text-align: left;
  padding-top: 1px;
}
.waitlist-feature.is-checked .waitlist-feature__text {
  color: var(--color-text-primary);
  font-weight: 500;
}
.waitlist-feature__helper {
  display: block;
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  margin-top: 2px;
  font-weight: 400;
}

.waitlist-email {
  width: 100%;
  animation-delay: 2600ms;
}
.waitlist-email-label {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  display: block;
}
.waitlist-email-input {
  width: 100%;
  min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-neutral);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  transition: border-color var(--duration-micro) var(--ease-essence),
              box-shadow var(--duration-micro) var(--ease-essence);
}
.waitlist-email-input:focus {
  outline: none;
  border-color: var(--color-mineral);
  box-shadow: var(--shadow-focus-ring);
}

/* ─── C2 success state ─── */
.waitlist-success {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.waitlist-success .stone {
  animation-delay: 0ms;
}
.waitlist-success-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: var(--line-height-hero);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 320px;
  text-wrap: balance;
}
.waitlist-success-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  text-wrap: balance;
}

/* ══════════════════════════════════════════════════════════════════════
   C3 — VAULT LIMIT REACHED (state, not moment)
   Less centered, faster entrance, smaller stone, shorter copy stack.
   Reads as practical redirect, not ceremony.
   ══════════════════════════════════════════════════════════════════════ */
.confirm--c3 {
  /* Shift content upward from true center so the stage feels grounded,
     not floating. Padding-top creates breathing room under the status bar;
     justify-content: flex-start locks the layout at that anchor. */
  justify-content: flex-start;
  padding-top: var(--space-4xl);
}
.c3-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-mineral);
  margin-bottom: var(--space-sm);
  animation-delay: 700ms;
}
.c3-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 320px;
  text-wrap: balance;
  animation-delay: 900ms;
}
.c3-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 290px;
  text-wrap: balance;
  animation-delay: 1100ms;
}

/* ══════════════════════════════════════════════════════════════════════
   FOOTER CTAs — shared pattern
   ══════════════════════════════════════════════════════════════════════ */
.footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  background: transparent;
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.footer--c2 {
  /* C2 footer sits on top of warm bg, gradient fade for readability over scroll */
  background: linear-gradient(
    180deg,
    rgba(249, 243, 232, 0) 0%,
    rgba(249, 243, 232, 0.95) 40%,
    var(--color-bg-warm-1) 100%
  );
  padding-top: var(--space-xl);
  position: absolute;
  left: 0; right: 0; bottom: 0;
  z-index: 5;
}

.footer .btn {
  width: 100%; min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
  opacity: 0;
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.footer .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.footer .btn:not(:disabled):active { transform: scale(var(--scale-press)); }
.footer .btn:disabled {
  background: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}

.footer .btn--link {
  background: transparent;
  color: var(--color-text-secondary);
  box-shadow: none;
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  width: auto;
  opacity: 0;
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.footer .btn--link:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}

/* C1 footer reveals */
.footer--c1 .btn        { animation-delay: 2800ms; }
.footer--c1 .btn--link  { animation-delay: 3200ms; }

/* C2 footer reveals (no ceremonial entrance, straightforward) */
.footer--c2 .btn        { animation-delay: 2900ms; opacity: 0; }
.footer--c2 .btn--link  { animation-delay: 3100ms; opacity: 0; }

/* C3 footer reveals — faster than C1, this is a state not a ceremony */
.footer--c3 .btn        { animation-delay: 1300ms; }
.footer--c3 .btn--link  { animation-delay: 1500ms; }

/* ══════════════════════════════════════════════════════════════════════
   DEV NAV — screen selector
   ══════════════════════════════════════════════════════════════════════ */
.dev-rail {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.dev-rail__label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.dev-rail__nav {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  max-width: 480px;
}
.dev-rail__nav button {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 6px 12px;
  font-family: var(--font-body); font-size: 11px;
  letter-spacing: 0.04em; cursor: pointer;
  transition: background var(--duration-micro) var(--ease-essence),
              color var(--duration-micro) var(--ease-essence),
              border-color var(--duration-micro) var(--ease-essence);
}
.dev-rail__nav button:hover {
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.95);
}
.dev-rail__nav button.is-current {
  background: var(--color-mineral); color: #fff; border-color: var(--color-mineral);
}
.dev-rail__nav button.replay {
  background: transparent;
  color: rgba(255,255,255,0.55);
  border: 1px dashed rgba(255,255,255,0.2);
}
.variant-label {
  position: absolute; top: 12px; left: 14px;
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(28,26,24,0.45);
  z-index: 12; pointer-events: none;
}
</style>
</head>
<body>

<div class="dev-rail">
  <div class="dev-rail__label">Step 6 · Pass 2 · Ceiling &amp; Waitlist</div>
  <div class="dev-rail__nav" id="devNav">
    <button data-screen="c1" class="is-current">C1 · Three Shaped</button>
    <button data-screen="c2">C2 · Waitlist</button>
    <button data-screen="c2-success">C2 · Submitted</button>
    <button data-screen="c3">C3 · Vault Limit</button>
    <button data-action="replay" class="replay">↻ Replay</button>
  </div>
</div>

<div class="prototype-wrapper">
  <!-- All four screens live inside the same phone frame; only one is visible at a time -->

  <!-- ═══════════════════════════════════════════════════════════
       C1 — THREE SHAPED
       Triggered from A7 when user has just saved message 3 of 3
       ═══════════════════════════════════════════════════════════ -->
  <div class="phone phone--c1" data-screen="c1">
    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>
    <div class="variant-label">C1 · Three Shaped</div>

    <div class="phone__screen">
      <div class="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div class="stone stone--infused" aria-hidden="true">
          <div class="stone__body"></div>
        </div>
        <h1 class="c1-title reveal">Three are kept.</h1>
        <p class="c1-aside reveal">The messages you shaped for the people you love are on the shelf, safe.</p>
        <p class="c1-reassurance reveal">Your voice stays preserved in your Vault. More ways to use it are on the way.</p>
      </div>
      <div class="footer footer--c1">
        <button class="btn" data-goto="c2">See what&rsquo;s coming</button>
        <button class="btn btn--link" data-goto="back">Back to Home</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       C2 — WAITLIST
       Reachable from C1 primary, C3 primary, or Settings
       ═══════════════════════════════════════════════════════════ -->
  <div class="phone phone--c2" data-screen="c2" hidden>
    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>
    <div class="variant-label">C2 · Waitlist</div>

    <div class="phone__screen">
      <div class="waitlist" role="form" aria-labelledby="waitlistTitle">
        <p class="waitlist-eyebrow reveal">Coming to Essence</p>
        <h1 class="waitlist-title reveal" id="waitlistTitle">What we&rsquo;re building next.</h1>
        <p class="waitlist-subtitle reveal">Tell us what matters most to you, and we&rsquo;ll let you know when it&rsquo;s ready.</p>

        <div class="waitlist-features reveal" role="group" aria-label="Which features matter most to you">
          <span class="waitlist-features-label">Features in development</span>

          <label class="waitlist-feature" data-feature="more-messages">
            <span class="waitlist-feature__check" aria-hidden="true">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="waitlist-feature__text">
              More messages each month
              <span class="waitlist-feature__helper">Keep creating beyond the three you&rsquo;ve shaped</span>
            </span>
            <input type="checkbox" name="feature" value="more-messages" style="display:none;">
          </label>

          <label class="waitlist-feature" data-feature="scheduling">
            <span class="waitlist-feature__check" aria-hidden="true">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="waitlist-feature__text">
              Schedule messages for future dates
              <span class="waitlist-feature__helper">Arriving on birthdays, anniversaries, the moments you choose</span>
            </span>
            <input type="checkbox" name="feature" value="scheduling" style="display:none;">
          </label>

          <label class="waitlist-feature" data-feature="reminders">
            <span class="waitlist-feature__check" aria-hidden="true">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="waitlist-feature__text">
              Birthday and occasion reminders
              <span class="waitlist-feature__helper">Gentle prompts so no moment slips past</span>
            </span>
            <input type="checkbox" name="feature" value="reminders" style="display:none;">
          </label>

          <label class="waitlist-feature" data-feature="multi-profile">
            <span class="waitlist-feature__check" aria-hidden="true">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="waitlist-feature__text">
              Multiple voice profiles
              <span class="waitlist-feature__helper">Preserve parents, partners, others you love</span>
            </span>
            <input type="checkbox" name="feature" value="multi-profile" style="display:none;">
          </label>

          <label class="waitlist-feature" data-feature="longer-messages">
            <span class="waitlist-feature__check" aria-hidden="true">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="waitlist-feature__text">
              Longer, story-form messages
              <span class="waitlist-feature__helper">Room for the memories that take a while to tell</span>
            </span>
            <input type="checkbox" name="feature" value="longer-messages" style="display:none;">
          </label>
        </div>

        <div class="waitlist-email reveal">
          <label class="waitlist-email-label" for="waitlistEmail">Notify at</label>
          <input
            type="email"
            class="waitlist-email-input"
            id="waitlistEmail"
            value="oremi@essence.co"
            autocomplete="email"
          >
        </div>
      </div>

      <div class="footer footer--c2">
        <button class="btn" id="waitlistSubmit">Add me to the list</button>
        <button class="btn btn--link" data-goto="back">Back to Home</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       C2 SUCCESS — after submit
       =============================================================== -->
  <div class="phone phone--c2" data-screen="c2-success" hidden>
    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>
    <div class="variant-label">C2 · Submitted</div>

    <div class="phone__screen">
      <div class="waitlist-success" role="status" aria-live="polite">
        <div class="stone stone--md stone--shimmer" aria-hidden="true">
          <div class="stone__body"></div>
        </div>
        <h1 class="waitlist-success-title">You&rsquo;re on the list.</h1>
        <p class="waitlist-success-aside">We&rsquo;ll write when something&rsquo;s ready. Your voice stays preserved while you wait.</p>
      </div>
      <div class="footer footer--c3">
        <button class="btn" data-goto="back">Back to Home</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       C3 — VAULT LIMIT REACHED
       Replaces A2 when user attempts to create msg 4+
       =============================================================== -->
  <div class="phone phone--c3" data-screen="c3" hidden>
    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>
    <div class="variant-label">C3 · Vault Limit</div>

    <div class="phone__screen">
      <div class="confirm confirm--c3" role="status" aria-live="polite" aria-atomic="true">
        <div class="stone stone--sm stone--archive" aria-hidden="true">
          <div class="stone__body"></div>
        </div>
        <p class="c3-eyebrow reveal">Your Vault</p>
        <h1 class="c3-title reveal">Three messages, kept.</h1>
        <p class="c3-aside reveal">Your voice stays preserved. You can revisit what you&rsquo;ve saved anytime.</p>
      </div>
      <div class="footer footer--c3">
        <button class="btn" data-goto="back">Visit your Memory Shelf</button>
        <button class="btn btn--link" data-goto="c2">See what&rsquo;s coming</button>
      </div>
    </div>
  </div>

</div>

<script>
/**
 * NOTE FOR CODE ARCHITECT
 *
 * Screen routing in production (Next.js):
 *   /app/message/complete → A7
 *     if messageCount === 3 && hasCeremony === false
 *       → /app/message/ceiling  (C1, one-time only; set hasCeremony=true)
 *
 *   /app/message/new
 *     if messageCount >= 3 → /app/message/limit  (C3, always)
 *
 *   /app/waitlist  (C2)
 *     GET: render form pre-filled with session email
 *     POST: persist {user_id, email, selected_features[], submitted_at}
 *     → /app/waitlist/submitted  (success state)
 *
 * The dev rail below is a prototype-only switcher. Remove for production.
 */

// ─── Screen switcher ────────────────────────────────────────────────────
// Dev-rail buttons are queried once; phone frames must be queried FRESH
// on each call because the clone-to-replay-animations trick detaches the
// old reference, leaving the original NodeList pointing at stale nodes.
const navButtons = document.querySelectorAll('#devNav button[data-screen]');

// History stack — lets "Back to Home" and "back" buttons walk backwards
// through whatever path the user took. In production, real routing handles
// this; the stack is a prototype-only convenience so you can test the full
// loop without reloading.
const screenHistory = ['c1'];

function showScreen(name, pushHistory = true) {
  if (pushHistory && screenHistory[screenHistory.length - 1] !== name) {
    screenHistory.push(name);
  }
  // Query fresh each call — clone/replace below invalidates stale refs
  const screens = document.querySelectorAll('.phone[data-screen]');
  screens.forEach(s => {
    s.hidden = s.dataset.screen !== name;
  });
  navButtons.forEach(b => {
    b.classList.toggle('is-current', b.dataset.screen === name);
  });
  // Replay animations on the newly shown screen
  const active = document.querySelector(`.phone[data-screen="${name}"]:not([hidden])`);
  if (active) {
    const clone = active.cloneNode(true);
    active.replaceWith(clone);
    wireScreen(clone);
  }
}

function goBack() {
  if (screenHistory.length > 1) {
    screenHistory.pop();
    const prev = screenHistory[screenHistory.length - 1];
    showScreen(prev, false);
  } else {
    // Already at root — in production would navigate to Home B; here,
    // cycle back to C1 so the prototype is always navigable.
    showScreen('c1', false);
  }
}

// ─── Interactions within screens ────────────────────────────────────────
function wireScreen(root) {
  // In-screen "goto" buttons (primary CTAs that route between screens)
  root.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.goto;
      if (target === 'back' || target === 'home') {
        goBack();
        return;
      }
      showScreen(target);
    });
  });

  // C2 feature multi-select
  const features = root.querySelectorAll('.waitlist-feature');
  features.forEach(f => {
    f.addEventListener('click', (e) => {
      // Only toggle on label click, not on the hidden input
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      const input = f.querySelector('input[type="checkbox"]');
      input.checked = !input.checked;
      f.classList.toggle('is-checked', input.checked);
    });
  });

  // C2 submit
  const submitBtn = root.querySelector('#waitlistSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // In production: POST selected features + email to /api/waitlist
      showScreen('c2-success');
    });
  }
}

// ─── Dev rail wiring ────────────────────────────────────────────────────
document.querySelectorAll('#devNav button[data-screen]').forEach(b => {
  b.addEventListener('click', () => showScreen(b.dataset.screen));
});
document.querySelectorAll('#devNav button[data-action="replay"]').forEach(b => {
  b.addEventListener('click', () => {
    const current = document.querySelector('#devNav button.is-current')?.dataset.screen || 'c1';
    showScreen(current);
  });
});

// Wire the initially visible screen
wireScreen(document.querySelector('.phone[data-screen="c1"]'));
</script>
</body>
</html>
```

---

# 4. Reference prototype: essence-step6-a3.html

Category Selector. Clean single-screen with Breath Stone in **Ready** state — the same stone state A2 will use.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>ESSENCE · Step 6 · A3 Category Selector</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  /* Background ramp */
  --color-bg-neutral: #FBF8F4;
  --color-bg-warm-1: #F9F3E8;
  --color-bg-warm-2: #F6F0E5;
  --color-bg-warm-phase: #F2EDE4;
  --color-bg-gold: #F2E8D6;
  --color-bg-rich: #EDE3D0;

  /* Surfaces */
  --color-surface-card: #F6F0E5;
  --color-surface-warm: #EDE3D0;
  --color-surface-honey: #F2E8D6;

  /* Accent */
  --color-mineral: #7A8088;
  --color-mineral-dark: #656B73;

  /* Text */
  --color-text-primary: #1C1A18;
  --color-text-secondary: #6B6B6B;
  --color-text-tertiary: #ADA9A5;

  /* Borders + shadows */
  --color-border: rgba(0, 0, 0, 0.06);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-mineral: 0 4px 12px rgba(74, 107, 126, 0.3);
  --shadow-focus-ring: 0 0 0 4px rgba(122, 128, 136, 0.18);

  /* Type */
  --font-display: 'Spectral', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --text-h1: 36px;
  --text-title: 28px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  --line-height-title: 1.4;
  --line-height-hero: 1.25;

  /* Text sizing — 16px floor for 45-70 audience */
  --text-descriptor: var(--text-body);
  --text-meta: var(--text-body);

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 40px;
  --space-4xl: 48px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-pill: 20px;
  --radius-full: 9999px;

  /* Easing + duration */
  --ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-press: cubic-bezier(0.2, 0.0, 0.0, 1);
  --duration-micro: 200ms;
  --duration-small: 400ms;
  --duration-medium: 800ms;

  /* Sizing */
  --size-avatar: 44px;
  --size-control-md: 52px;
  --pip-w-rest: 6px;
  --pip-w-active: 20px;

  /* Motion */
  --scale-press: 0.98;
  --scale-press-subtle: 0.99;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: #1C1A18;
  background-image: radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 70%);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 12px 60px; gap: 24px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
button { font-family: inherit; }

/* PHONE FRAME */
.prototype-wrapper {
  width: 390px; height: 812px;
  border-radius: 48px; overflow: hidden;
  box-shadow: 0 0 0 10px #1A1715, 0 0 0 12px var(--color-mineral), 0 50px 100px rgba(0,0,0,0.45);
  position: relative; flex-shrink: 0;
  background: var(--color-bg-warm-phase);
  /* Background transitions when ceiling-moment kicks in */
  transition: background var(--duration-medium) var(--ease-essence);
}
.prototype-wrapper[data-tone="warm-2"] { background: var(--color-bg-gold); }

@media (max-width: 440px) {
  .prototype-wrapper { transform: scale(0.88); transform-origin: top center; }
}
.phone {
  width: 100%; height: 100%;
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  background: inherit;
  font-family: var(--font-body); color: var(--color-text-primary);
}
.phone__status {
  position: absolute; inset: 0 0 auto 0; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px 0;
  font-weight: 600; font-size: var(--text-small);
  color: var(--color-text-primary); z-index: 10; pointer-events: none;
}
.phone__status-icons { display: flex; gap: 6px; align-items: center; }
.phone__island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 30px; border-radius: 999px; background: #0B0B0B; z-index: 11;
}
.phone__home-indicator {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px; border-radius: 3px;
  background: rgba(28,26,24,0.35); z-index: 10;
}
.phone__screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; }

/* BACKBAR */
.backbar {
  padding: var(--space-md) var(--space-xl);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; flex-shrink: 0;
}
.backbar__btn {
  background: transparent; border: 0;
  padding: var(--space-sm); margin: calc(-1 * var(--space-sm));
  color: var(--color-text-secondary); cursor: pointer;
  display: flex; min-height: 44px; align-items: center;
  border-radius: var(--radius-md);
  transition: color var(--duration-micro) var(--ease-essence);
}
.backbar__btn:hover { color: var(--color-text-primary); }
.backbar__pips { display: flex; gap: 6px; }
.backbar__pip {
  width: var(--pip-w-rest); height: var(--pip-w-rest);
  border-radius: var(--radius-sm);
  background: var(--color-surface-warm);
  transition: width var(--duration-medium) var(--ease-essence), background var(--duration-medium) var(--ease-essence);
}
.backbar__pip.is-current { width: var(--pip-w-active); background: var(--color-bg-gold); }
.backbar__pip.is-done { background: var(--color-bg-gold); }
.backbar__spacer { width: 22px; }

/* ANCHOR HEAD */
.anchor-head { margin-bottom: var(--space-lg); }
.eyebrow {
  font-family: var(--font-body); font-size: var(--text-caption); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--color-text-tertiary); display: inline-block;
}

/* ContextCrumb — tappable pill, alternative to eyebrow on A3+ */
.crumb {
  display: inline-flex; align-items: center; gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm);
  background: var(--color-bg-warm-2);
  border-radius: var(--radius-full);
  border: 0;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  cursor: pointer;
  min-height: 28px;
  transition: background var(--duration-micro) var(--ease-essence);
}
.crumb:hover { background: var(--color-surface-honey); }
.crumb:active { transform: scale(var(--scale-press-subtle)); }
.crumb svg { opacity: 0.6; }

.title {
  font-family: var(--font-display); font-size: var(--text-title); font-weight: 600;
  line-height: var(--line-height-title); color: var(--color-text-primary);
  margin: var(--space-md) 0 0; letter-spacing: -0.01em; text-wrap: pretty;
}
.title.has-aside { margin-bottom: var(--space-md); }
.title--hero {
  font-size: var(--text-h1);
  line-height: var(--line-height-hero);
}
.aside {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body); color: var(--color-text-secondary);
  margin: 0; line-height: 1.55; text-wrap: pretty;
}

/* BODY */
.body {
  padding: var(--space-xs) var(--space-xl) var(--space-3xl);
  flex: 1; display: flex; flex-direction: column;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}

/* ════════════════════════════════════════════════
   POSITION-2 CEILING NOTE — appears only on A3.b (last-of-three)
   ════════════════════════════════════════════════ */
.ceiling-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  margin-top: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-rich);
  border-left: 2px solid var(--color-mineral);
  border-radius: var(--radius-sm) var(--radius-md) var(--radius-md) var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
}
.ceiling-note__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-mineral);
}
.ceiling-note strong {
  color: var(--color-text-primary);
  font-weight: 600;
}

/* ════════════════════════════════════════════════
   CATEGORY LIST — adapts the .selectable-card pattern from A2
   with an icon tile on the left (echoes recipient avatars)
   ════════════════════════════════════════════════ */
.selectable-list { display: flex; flex-direction: column; gap: var(--space-md); }

.selectable-card {
  background: var(--color-surface-card);
  border: 1.5px solid transparent;
  border-radius: var(--radius-2xl);
  padding: var(--space-lg);
  display: flex; align-items: center;
  gap: var(--space-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  width: 100%; text-align: left;
  font-family: inherit;
  transition:
    background var(--duration-small) var(--ease-essence),
    border-color var(--duration-small) var(--ease-essence),
    box-shadow var(--duration-small) var(--ease-essence),
    transform 100ms var(--ease-press);
}
.selectable-card:hover { background: var(--color-bg-warm-2); }
.selectable-card:active { transform: scale(var(--scale-press-subtle)); }
.selectable-card.is-selected {
  background: var(--color-bg-gold);
  border: 2px solid var(--color-mineral);
  box-shadow: var(--shadow-sm);
}

.selectable-card__icon {
  width: var(--size-avatar); height: var(--size-avatar);
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-bg-warm-2);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-mineral);
  transition: background var(--duration-small) var(--ease-essence),
              color var(--duration-small) var(--ease-essence);
}
.selectable-card.is-selected .selectable-card__icon {
  background: var(--color-mineral);
  color: var(--color-bg-neutral);
}

.selectable-card__main { flex: 1; min-width: 0; }
.selectable-card__name {
  font-family: var(--font-display);
  font-size: var(--text-body-lg); font-weight: 600;
  line-height: 1.25;
  color: var(--color-text-primary);
}
.selectable-card__sub {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-descriptor);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs); line-height: 1.45;
}

.selectable-card__check {
  width: 22px; height: 22px;
  flex-shrink: 0;
  color: var(--color-mineral);
  display: none;
}
.selectable-card.is-selected .selectable-card__check { display: block; }

/* FOOTER */
.footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  border-top: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-bg-warm-phase) 24px,
    var(--color-bg-warm-phase) 100%
  );
  flex-shrink: 0;
}
/* Warmer footer for last-of-three variant */
.footer--warm-2 {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-bg-gold) 24px,
    var(--color-bg-gold) 100%
  );
}
.btn {
  width: 100%; min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence), transform var(--duration-small) var(--ease-press);
}
.btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.btn:not(:disabled):active { transform: scale(var(--scale-press)); }
.btn:disabled {
  background: var(--color-surface-warm);
  color: var(--color-text-tertiary);
  box-shadow: none; cursor: default;
  pointer-events: none;
}

/* DEV NAV */
.dev-rail { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 8px; }
.dev-rail__label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.dev-rail__nav, .dev-rail__row {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  max-width: 480px;
}
.dev-rail__nav button, .dev-rail__row button {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 6px 12px;
  font-family: var(--font-body); font-size: 11px;
  letter-spacing: 0.04em; cursor: pointer;
  transition: all 200ms ease;
}
.dev-rail__nav button:hover, .dev-rail__row button:hover {
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.95);
}
.dev-rail__nav button.is-current,
.dev-rail__row button.is-on {
  background: var(--color-mineral); color: #fff; border-color: var(--color-mineral);
}
.dev-row-label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  align-self: center; margin-right: 4px;
}

.variant-label {
  position: absolute; top: 12px; left: 14px;
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(28,26,24,0.45);
  z-index: 12; pointer-events: none;
}
</style>
</head>
<body>

<div class="dev-rail">
  <div class="dev-rail__label">A3 — Category Selector</div>
  <div class="dev-rail__nav" id="devNav">
    <button data-variant="default">A3.a Default</button>
    <button data-variant="last-of-three">A3.b Last of three</button>
    <button data-variant="selected">A3.a + selected</button>
  </div>

  <div class="dev-rail__row" id="contextRow" style="margin-top: 4px;">
    <span class="dev-row-label">Recipient context:</span>
    <button data-context="eyebrow">Eyebrow</button>
    <button data-context="crumb" class="is-on">Crumb (tappable)</button>
  </div>
</div>

<div class="prototype-wrapper" id="phoneWrapper">
  <div class="phone">

    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>

    <div class="variant-label" id="variantLabel">A3.a</div>

    <div class="phone__screen">
      <div class="backbar">
        <button class="backbar__btn" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="backbar__pips">
          <span class="backbar__pip is-done"></span>
          <span class="backbar__pip is-current"></span>
          <span class="backbar__pip"></span>
          <span class="backbar__pip"></span>
          <span class="backbar__pip"></span>
        </div>
        <div class="backbar__spacer"></div>
      </div>

      <div class="body">
        <div class="anchor-head">
          <!-- Recipient context — eyebrow OR crumb (toggle in dev nav) -->
          <span class="eyebrow" id="contextEyebrow">For Sarah</span>
          <button class="crumb" id="contextCrumb" style="display:none;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span>For Sarah</span>
          </button>

          <h1 class="title has-aside" id="title">What do you want to say?</h1>
          <p class="aside" id="aside">Pick the shape. The words come next.</p>
        </div>

        <!-- POSITION 2 — ceiling note appears only on A3.b -->
        <div class="ceiling-note" id="ceilingNote" style="display:none;">
          <svg class="ceiling-note__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <polyline points="12 7 12 12 15 14"/>
          </svg>
          <span>This is the <strong>third of the three messages</strong> included with your Vault. Take your time.</span>
        </div>

        <div class="selectable-list" id="categoryList">
          <button class="selectable-card" data-cat="birthday">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5A2.5 2.5 0 0 1 7.5 2C10 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C14 2 12 7 12 7z"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Birthday</div>
              <div class="selectable-card__sub">For the day itself, or the night before.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="encouragement">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Encouragement</div>
              <div class="selectable-card__sub">For when they&rsquo;re up against something hard.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="daily">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Daily reminder</div>
              <div class="selectable-card__sub">Something to wake up to. Like a good-morning call.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="future">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12"/><path d="M6 22h12"/><path d="M6 2v4a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2"/><path d="M6 22v-4a6 6 0 0 1 6-6 6 6 0 0 1 6 6v4"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">A message for the future</div>
              <div class="selectable-card__sub">Saved now. Opened on a date you choose.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="comfort">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 12h2a2 2 0 0 1 0 4h-2"/><path d="M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Comfort</div>
              <div class="selectable-card__sub">For the quiet, heavy hours.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="holiday">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Holiday</div>
              <div class="selectable-card__sub">A familiar voice at the door.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button class="selectable-card" data-cat="checkin">
            <div class="selectable-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div class="selectable-card__main">
              <div class="selectable-card__name">Just checking in</div>
              <div class="selectable-card__sub">No reason at all. You came to mind.</div>
            </div>
            <svg class="selectable-card__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>

      <div class="footer">
        <button class="btn" id="continueBtn" disabled>Begin shaping</button>
      </div>
    </div>
  </div>
</div>

<script>
const VARIANT_LABELS = {
  'default':       'A3.a',
  'last-of-three': 'A3.b',
  'selected':      'A3.a · selected',
};

const COPY = {
  default: {
    title: 'What do you want to say?',
    aside: 'Pick the shape. The words come next.',
  },
  'last-of-three': {
    title: 'One more to shape.',
    aside: 'This will complete your three. Take your time.',
  },
};

let state = {
  variant: 'default',
  context: 'eyebrow',
  selectedCategory: null,
};

function applyVariant(variant) {
  state.variant = variant;
  document.getElementById('variantLabel').textContent = VARIANT_LABELS[variant];

  // Background ramp — Position 2 earned warmth on last-of-three
  const wrap = document.getElementById('phoneWrapper');
  const footer = document.querySelector('.footer');
  if (variant === 'last-of-three') {
    wrap.setAttribute('data-tone', 'warm-2');
    footer.classList.add('footer--warm-2');
  } else {
    wrap.removeAttribute('data-tone');
    footer.classList.remove('footer--warm-2');
  }

  // Copy swap (default vs last-of-three; selected uses default copy)
  const copyKey = variant === 'last-of-three' ? 'last-of-three' : 'default';
  document.getElementById('title').textContent = COPY[copyKey].title;
  document.getElementById('aside').textContent = COPY[copyKey].aside;

  // Ceiling note visibility
  document.getElementById('ceilingNote').style.display =
    variant === 'last-of-three' ? 'flex' : 'none';

  // Selected demo: pre-select Encouragement to show the state
  document.querySelectorAll('#categoryList .selectable-card').forEach(c => c.classList.remove('is-selected'));
  if (variant === 'selected') {
    const target = document.querySelector('[data-cat="encouragement"]');
    target.classList.add('is-selected');
    state.selectedCategory = 'encouragement';
  } else {
    state.selectedCategory = null;
  }

  document.getElementById('continueBtn').disabled = state.selectedCategory === null;

  // Sync nav button state
  document.querySelectorAll('#devNav button').forEach(b => {
    b.classList.toggle('is-current', b.dataset.variant === variant);
  });
}

function applyContext(mode) {
  state.context = mode;
  document.getElementById('contextEyebrow').style.display = mode === 'eyebrow' ? 'inline-block' : 'none';
  document.getElementById('contextCrumb').style.display   = mode === 'crumb'   ? 'inline-flex'  : 'none';

  document.querySelectorAll('#contextRow button').forEach(b => {
    b.classList.toggle('is-on', b.dataset.context === mode);
  });
}

document.querySelectorAll('#devNav button').forEach(b => {
  b.addEventListener('click', () => applyVariant(b.dataset.variant));
});
document.querySelectorAll('#contextRow button').forEach(b => {
  b.addEventListener('click', () => applyContext(b.dataset.context));
});

// Category selection
document.querySelectorAll('#categoryList .selectable-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#categoryList .selectable-card').forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    state.selectedCategory = card.dataset.cat;
    document.getElementById('continueBtn').disabled = false;
  });
});

// Boot
applyVariant('default');
applyContext('crumb');
</script>
</body>
</html>
```

---

# 5. Reference prototype: essence-step6-a4.html

Personal Note. The only existing input-bearing screen. Reference for A2's recipient name field and relationship picker. Note the equally-weighted Skip/Continue CTA treatment.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>ESSENCE · Step 6 · A4 Personal Note</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<!--
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║  NOTE FOR CODE ARCHITECT — A4 Personal Note                           ║
  ║                                                                       ║
  ║  This screen uses placeholder copy throughout.                        ║
  ║  Two real production decisions need to land before this ships:        ║
  ║                                                                       ║
  ║  1. CATEGORY-AWARE QUESTION COPY                                      ║
  ║     The italic question floating below the stone changes based on     ║
  ║     the category selected on A3. Need 7 strings, one per category:    ║
  ║       birthday, encouragement, daily, future, comfort, holiday, checkin   ║
  ║     Each should be a single-sentence, second-person prompt that       ║
  ║     invites a specific kind of contribution. Validation task should   ║
  ║     workshop these.                                                   ║
  ║     Currently using: "What do you want them to know?" as placeholder. ║
  ║                                                                       ║
  ║  2. HONORING-MOMENT COPY (Direction 5)                                ║
  ║     After the user taps "Shape it from this", the note appears        ║
  ║     centered in italic Spectral with a quiet acknowledgment line.     ║
  ║     Currently using: "We'll bring this into your voice." as placeholder. ║
  ║     This line could vary by category, OR stay constant. Workshop.     ║
  ║                                                                       ║
  ║  3. STATE WIRING                                                      ║
  ║     - Recipient name + category come from prior screens (state.recipient,    ║
  ║       state.category). Currently mocked as "Sarah" + "Encouragement".  ║
  ║     - 200-char limit on the note input enforced via JS + visible      ║
  ║       counter that only appears after 150 chars.                      ║
  ║     - Skip path: empty input + tap "Use a generic message" button     ║
  ║       routes directly to A5, skipping the honoring moment entirely.   ║
  ║                                                                       ║
  ║  4. ANIMATION                                                         ║
  ║     The honoring moment uses a fade + slight upward translate         ║
  ║     (--duration-medium 800ms). Reduced-motion media query already     ║
  ║     handled at :root level. Stone state stays "ready" throughout      ║
  ║     A4, transitions to "working" only when generation starts on A5.   ║
  ╚═══════════════════════════════════════════════════════════════════════╝
-->

<style>
:root {
  --color-bg-neutral: #FBF8F4;
  --color-bg-warm-1: #F9F3E8;
  --color-bg-warm-2: #F6F0E5;
  --color-bg-warm-phase: #F2EDE4;
  --color-bg-gold: #F2E8D6;
  --color-bg-rich: #EDE3D0;
  --color-surface-card: #F6F0E5;
  --color-surface-warm: #EDE3D0;
  --color-surface-honey: #F2E8D6;
  --color-mineral: #7A8088;
  --color-mineral-dark: #656B73;
  --color-text-primary: #1C1A18;
  --color-text-secondary: #6B6B6B;
  --color-text-tertiary: #ADA9A5;
  --color-border: rgba(0, 0, 0, 0.06);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-mineral: 0 4px 12px rgba(74, 107, 126, 0.3);
  --shadow-focus-ring: 0 0 0 4px rgba(122, 128, 136, 0.18);

  --font-display: 'Spectral', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --text-h1: 36px;
  --text-title: 28px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  --line-height-title: 1.4;
  --line-height-hero: 1.25;

  /* Text sizing — 16px floor for 45-70 audience */
  --text-descriptor: var(--text-body);
  --text-meta: var(--text-body);

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 40px;
  --space-4xl: 48px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-pill: 20px;
  --radius-full: 9999px;

  --ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-press: cubic-bezier(0.2, 0.0, 0.0, 1);
  --duration-micro: 200ms;
  --duration-small: 400ms;
  --duration-medium: 800ms;
  --duration-large: 1200ms;
  --duration-breath: 3000ms;

  --size-avatar: 44px;
  --size-control-md: 52px;

  --stone-sm: 120px;
  --stone-md: 160px;
  --stone-lg: 180px;
  --stone-xl: 200px;

  --scale-press: 0.98;
  --scale-press-subtle: 0.99;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: #1C1A18;
  background-image: radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 70%);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 12px 60px; gap: 24px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
button { font-family: inherit; }

.prototype-wrapper {
  width: 390px; height: 812px;
  border-radius: 48px; overflow: hidden;
  box-shadow: 0 0 0 10px #1A1715, 0 0 0 12px var(--color-mineral), 0 50px 100px rgba(0,0,0,0.45);
  position: relative; flex-shrink: 0;
  background: var(--color-bg-warm-2);
}
@media (max-width: 440px) {
  .prototype-wrapper { transform: scale(0.88); transform-origin: top center; }
}
.phone {
  width: 100%; height: 100%;
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  background: var(--color-bg-warm-2);
  font-family: var(--font-body); color: var(--color-text-primary);
}
.phone__status {
  position: absolute; inset: 0 0 auto 0; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px 0;
  font-weight: 600; font-size: var(--text-small);
  color: var(--color-text-primary); z-index: 10; pointer-events: none;
}
.phone__status-icons { display: flex; gap: 6px; align-items: center; }
.phone__island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 30px; border-radius: 999px; background: #0B0B0B; z-index: 11;
}
.phone__home-indicator {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px; border-radius: 3px;
  background: rgba(28,26,24,0.35); z-index: 10;
}
.phone__screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; }

/* BACKBAR */
.backbar {
  padding: var(--space-md) var(--space-xl);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; flex-shrink: 0;
}
.backbar__btn {
  background: transparent; border: 0;
  padding: var(--space-sm); margin: calc(-1 * var(--space-sm));
  color: var(--color-text-secondary); cursor: pointer;
  display: flex; min-height: 44px; align-items: center;
  border-radius: var(--radius-md);
  transition: color var(--duration-micro) var(--ease-essence);
}
.backbar__btn:hover { color: var(--color-text-primary); }
.backbar__pips { display: flex; gap: var(--pip-w-rest); }
.backbar__pip {
  width: var(--pip-w-rest); height: var(--pip-w-rest);
  border-radius: var(--radius-sm);
  background: var(--color-surface-warm);
  transition: width var(--duration-medium) var(--ease-essence), background var(--duration-medium) var(--ease-essence);
}
.backbar__pip.is-current { width: var(--pip-w-active); background: var(--color-bg-gold); }
.backbar__pip.is-done { background: var(--color-bg-gold); }
.backbar__spacer { width: 22px; }

/* CRUMB — display-only on A4+ (per cross-cutting decision: tappable through A3 only) */
.crumb-display {
  display: inline-flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--color-bg-warm-2);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  /* No chevron, no hover, no cursor — display-only signals the system won't let you revise here */
}
.crumb-display__divider {
  width: 3px; height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
  opacity: 0.4;
}

/* BODY */
.body {
  padding: var(--space-xs) var(--space-xl) var(--space-lg);
  flex: 1; display: flex; flex-direction: column;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}

/* ════════════════════════════════════════════════
   STAGE A — input mode (Direction 1: stone as prompt)
   ════════════════════════════════════════════════ */
.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: var(--space-lg);
  text-align: center;
}

/* ═══ ENTRANCE CHOREOGRAPHY ═══
   Stone → question → textarea, staggered 200ms apart.
   Each element fades in + drifts up 8px. */
@keyframes stageReveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stage .stone {
  opacity: 0;
  animation: stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 100ms;
}
.stage .prompt-question {
  opacity: 0;
  animation: stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 300ms;
}
.stage .note-wrap {
  opacity: 0;
  animation: stageReveal var(--duration-medium) var(--ease-essence) forwards;
  animation-delay: 500ms;
}

/* ═══ QUESTION RECEDES WHEN TYPING ═══
   Fades to secondary and lifts slightly when user is writing.
   Returns when field is empty + blurred. */
.prompt-question {
  transition:
    opacity var(--duration-medium) var(--ease-essence),
    transform var(--duration-medium) var(--ease-essence),
    color var(--duration-medium) var(--ease-essence);
}
.stage.is-writing .prompt-question {
  opacity: 0.35;
  transform: translateY(-4px);
}

/* ═══ TEXTAREA GLOW RESPONDS TO CONTENT ═══
   Ambient warmth behind the textarea intensifies as the user writes more. */
.note-wrap::before {
  transition: opacity var(--duration-large) var(--ease-essence);
}
.stage.has-content .note-wrap::before {
  opacity: 1;
  background: radial-gradient(ellipse at 50% 40%, rgba(242, 232, 214, 0.7), transparent 65%);
}
.stage.has-long-content .note-wrap::before {
  background: radial-gradient(ellipse at 50% 40%, rgba(237, 227, 208, 0.85), transparent 60%);
}

/* Stone — companion presence, not centerpiece */
.stone {
  position: relative; border-radius: 999px; display: block;
  width: var(--stone-sm); height: var(--stone-sm);
}
.stone::before {
  content: ''; position: absolute; inset: -28%; border-radius: 999px;
  background: radial-gradient(circle, rgba(255,220,160,0.22), transparent 62%);
  animation: stoneHalo 4s var(--ease-essence) infinite;
}
.stone::after {
  content: ''; position: absolute; top: 15%; left: 22%;
  width: 30%; height: 20%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 70%);
  border-radius: 999px; filter: blur(6px); pointer-events: none;
}
.stone__body {
  width: 100%; height: 100%; border-radius: 999px;
  background: radial-gradient(circle at 30% 28%, #FBF2DC 0%, #E8CF9A 28%, #C9A665 60%, #8A6F3E 90%);
  box-shadow:
    0 12px 28px rgba(139,111,62,0.16),
    inset -12px -18px 40px rgba(90,65,30,0.30),
    inset 12px 12px 28px rgba(255,245,220,0.30);
  animation: stoneBreath 4s var(--ease-essence) infinite;
}
@keyframes stoneBreath {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.025); filter: brightness(1.015); }
}
@keyframes stoneHalo {
  0%, 100% { transform: scale(1); opacity: 0.12; }
  50% { transform: scale(1.06); opacity: 0.18; }
}

/* The question — the emotional anchor of this screen */
.prompt-question {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-title);
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 280px;
  margin-top: var(--space-xl);
  text-wrap: pretty;
}

/* Writing area wrapper — ambient warmth behind the textarea */
.note-wrap {
  position: relative;
  width: 100%;
  margin-top: var(--space-xl);
}
.note-wrap::before {
  content: '';
  position: absolute;
  inset: -20px -16px;
  border-radius: var(--radius-2xl);
  background: radial-gradient(ellipse at 50% 40%, rgba(242, 232, 214, 0.5), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Textarea — recessed, warm, inviting */
.note-field {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: var(--space-lg) var(--space-lg) var(--space-xl);
  background: var(--color-surface-honey);
  border: 1.5px solid rgba(0,0,0,0.04);
  border-radius: var(--radius-2xl);
  font-family: var(--font-display);
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-primary);
  outline: none;
  resize: none;
  min-height: 130px;
  text-align: left;
  transition:
    border-color var(--duration-small) var(--ease-essence),
    box-shadow var(--duration-small) var(--ease-essence);
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,0.04),
    0 1px 3px rgba(0,0,0,0.03);
}
.note-field::placeholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}
.note-field:focus {
  border-color: var(--color-mineral);
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,0.04),
    var(--shadow-focus-ring);
}

/* Char counter — only appears past 150 chars */
.note-counter {
  position: relative;
  z-index: 1;
  margin-top: var(--space-sm);
  text-align: right;
  font-family: var(--font-body);
  font-size: var(--text-caption);
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  opacity: 0;
  transition: opacity var(--duration-small) var(--ease-essence);
}
.note-counter.is-visible { opacity: 1; }
.note-counter.is-warning { color: var(--color-status-warning, #8A5A1E); }

/* ════════════════════════════════════════════════
   STAGE B — honoring moment (Direction 5)
   ════════════════════════════════════════════════ */
.honoring {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity var(--duration-medium) var(--ease-essence),
    transform var(--duration-medium) var(--ease-essence);
}
.honoring.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.honoring__quote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-title);
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 300px;
  position: relative;
  letter-spacing: -0.005em;
  text-wrap: pretty;
}
.honoring__quote::before,
.honoring__quote::after {
  font-family: var(--font-display);
  color: var(--color-text-tertiary);
  font-size: 1.2em;
  position: relative;
  top: 4px;
}
.honoring__quote::before { content: '\201C'; margin-right: 4px; }
.honoring__quote::after  { content: '\201D'; margin-left: 4px; }

.honoring__ack {
  margin-top: var(--space-2xl);
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  max-width: 280px;
}

.honoring__pulse {
  margin-top: var(--space-2xl);
  display: flex;
  gap: var(--space-sm);
}
.honoring__pulse-dot {
  width: var(--pip-w-rest); height: var(--pip-w-rest);
  border-radius: var(--radius-full);
  background: var(--color-mineral);
  opacity: 0.4;
  animation: pulseDot 1.6s var(--ease-essence) infinite;
}
.honoring__pulse-dot:nth-child(2) { animation-delay: 200ms; }
.honoring__pulse-dot:nth-child(3) { animation-delay: 400ms; }
@keyframes pulseDot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.3); }
}

/* FOOTER */
.footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  border-top: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-bg-warm-2) 24px,
    var(--color-bg-warm-2) 100%
  );
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: var(--space-sm);
  transition: opacity var(--duration-small) var(--ease-essence);
}
.footer.is-hidden { opacity: 0; pointer-events: none; }

.btn {
  width: 100%; min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press),
              opacity var(--duration-small) var(--ease-essence);
}
.btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.btn:not(:disabled):active { transform: scale(var(--scale-press)); }

/* "Use a generic message" — quieter ghost button (Direction 4 free bonus) */
.btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
  box-shadow: none;
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
}
.btn--ghost:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}

/* DEV NAV */
.dev-rail { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 8px; }
.dev-rail__label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.dev-rail__nav, .dev-rail__row {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  max-width: 480px;
}
.dev-rail__nav button, .dev-rail__row button {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 6px 12px;
  font-family: var(--font-body); font-size: 11px;
  letter-spacing: 0.04em; cursor: pointer;
  transition: all 200ms ease;
}
.dev-rail__nav button:hover, .dev-rail__row button:hover {
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.95);
}
.dev-rail__nav button.is-current, .dev-rail__row button.is-on {
  background: var(--color-mineral); color: #fff; border-color: var(--color-mineral);
}
.dev-row-label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  align-self: center; margin-right: 4px;
}

.variant-label {
  position: absolute; top: 12px; left: 14px;
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(28,26,24,0.45);
  z-index: 12; pointer-events: none;
}

.stage--hidden { display: none; }
</style>
</head>
<body>

<div class="dev-rail">
  <div class="dev-rail__label">A4 — Personal Note · Direction 1 + 5</div>
  <div class="dev-rail__nav" id="devNav">
    <button data-stage="input" class="is-current">Stage A · Input</button>
    <button data-stage="honoring">Stage B · Honoring</button>
  </div>
</div>

<div class="prototype-wrapper">
  <div class="phone">

    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>

    <div class="variant-label" id="variantLabel">A4 · Stage A</div>

    <div class="phone__screen">

      <div class="backbar">
        <button class="backbar__btn" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="backbar__pips">
          <span class="backbar__pip is-done"></span>
          <span class="backbar__pip is-done"></span>
          <span class="backbar__pip is-current"></span>
          <span class="backbar__pip"></span>
          <span class="backbar__pip"></span>
        </div>
        <div class="backbar__spacer"></div>
      </div>

      <!-- Display-only crumb (no chevron, no tap) -->
      <div style="padding: 0 var(--space-xl); margin-bottom: var(--space-md);">
        <div class="crumb-display">
          <span>For Sarah</span>
          <span class="crumb-display__divider"></span>
          <span>Encouragement</span>
        </div>
      </div>

      <div class="body">

        <!-- ═══ STAGE A — Input mode (Direction 1: stone as prompt) ═══ -->
        <div class="stage" id="stageInput">
          <div class="stone">
            <div class="stone__body"></div>
          </div>

          <!-- PLACEHOLDER COPY — see header note for production strings -->
          <p class="prompt-question" id="promptQuestion">
            What do you want them to know?
          </p>

          <div class="note-wrap">
            <textarea
              class="note-field"
              id="noteField"
              placeholder="Say what comes to mind."
              maxlength="200"
              rows="3"
            ></textarea>

            <div class="note-counter" id="noteCounter">
              <span id="charCount">0</span> / 200
            </div>
          </div>
        </div>

        <!-- ═══ STAGE B — Honoring moment (Direction 5) ═══ -->
        <div class="stage stage--hidden" id="stageHonoring">
          <div class="honoring" id="honoringContent">
            <p class="honoring__quote" id="honoringQuote">
              Whatever happens Friday, you were braver than you think.
            </p>
            <!-- PLACEHOLDER COPY — see header note for production strings -->
            <p class="honoring__ack">
              We&rsquo;ll bring this into your voice.
            </p>
            <div class="honoring__pulse">
              <span class="honoring__pulse-dot"></span>
              <span class="honoring__pulse-dot"></span>
              <span class="honoring__pulse-dot"></span>
            </div>
          </div>
        </div>

      </div>

      <div class="footer" id="footer">
        <button class="btn" id="primaryBtn">Use a generic message</button>
      </div>

    </div>
  </div>
</div>

<script>
const state = {
  stage: 'input',
  noteText: '',
};

function applyStage(stage) {
  state.stage = stage;
  document.getElementById('variantLabel').textContent = `A4 · Stage ${stage === 'input' ? 'A' : 'B'}`;

  const input = document.getElementById('stageInput');
  const honoring = document.getElementById('stageHonoring');
  const honoringContent = document.getElementById('honoringContent');
  const footer = document.getElementById('footer');

  if (stage === 'input') {
    input.classList.remove('stage--hidden');
    honoring.classList.add('stage--hidden');
    honoringContent.classList.remove('is-visible');
    footer.classList.remove('is-hidden');
  } else {
    input.classList.add('stage--hidden');
    honoring.classList.remove('stage--hidden');
    footer.classList.add('is-hidden');
    // Hydrate the quote from current note text, fall back to demo string
    const noteText = state.noteText || 'Whatever happens Friday, you were braver than you think.';
    document.getElementById('honoringQuote').textContent = noteText;
    // Trigger fade-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => honoringContent.classList.add('is-visible'));
    });
    // After ~2.4s, would route to A5 in production. Here we just hold the moment.
  }

  document.querySelectorAll('#devNav button').forEach(b => {
    b.classList.toggle('is-current', b.dataset.stage === stage);
  });
}

document.querySelectorAll('#devNav button').forEach(b => {
  b.addEventListener('click', () => applyStage(b.dataset.stage));
});

// Note field — Direction 4: button copy changes based on input state
const noteField = document.getElementById('noteField');
const primaryBtn = document.getElementById('primaryBtn');
const noteCounter = document.getElementById('noteCounter');
const charCount = document.getElementById('charCount');
const stageInput = document.getElementById('stageInput');

noteField.addEventListener('input', e => {
  const value = e.target.value;
  state.noteText = value;
  const len = value.length;

  // Button copy and styling shift based on input state
  if (len > 0) {
    primaryBtn.textContent = 'Shape it from this';
    primaryBtn.classList.remove('btn--ghost');
    stageInput.classList.add('has-content');
  } else {
    primaryBtn.textContent = 'Use a generic message';
    primaryBtn.classList.add('btn--ghost');
    stageInput.classList.remove('has-content', 'has-long-content');
  }

  // Glow intensifies at 80+ chars
  if (len >= 80) {
    stageInput.classList.add('has-long-content');
  } else {
    stageInput.classList.remove('has-long-content');
  }

  // Counter — appears past 150 chars (75% threshold)
  charCount.textContent = len;
  if (len >= 150) {
    noteCounter.classList.add('is-visible');
    if (len >= 180) noteCounter.classList.add('is-warning');
    else noteCounter.classList.remove('is-warning');
  } else {
    noteCounter.classList.remove('is-visible', 'is-warning');
  }
});

// Question recedes while typing, returns when field empty + blurred
noteField.addEventListener('focus', () => {
  stageInput.classList.add('is-writing');
});
noteField.addEventListener('blur', () => {
  if (state.noteText.length === 0) {
    stageInput.classList.remove('is-writing');
  }
});

// Initial state — empty field, ghost button
primaryBtn.classList.add('btn--ghost');

primaryBtn.addEventListener('click', () => {
  if (state.noteText.length > 0) {
    // Has content — show honoring moment
    applyStage('honoring');
  } else {
    // Empty — would route directly to A5 (generation) in production
    // For prototype demo, show honoring with placeholder content
    applyStage('honoring');
  }
});

// Boot
applyStage('input');
</script>
</body>
</html>
```

---

# 6. Reference prototype: essence-step6-a5.html

Generation. Calm copy + Working-state stone during latency. Reference for the visual that precedes A6 (the screen the user lands on right before first listen).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>ESSENCE · Step 6 · A5 Generation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<!--
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║  NOTE FOR CODE ARCHITECT — A5 Generation                              ║
  ║                                                                       ║
  ║  Stage progression in production:                                     ║
  ║   1. "Shaping your message." (0–4s)                                   ║
  ║   2. "Listening for the right tone." (4–9s if still pending)          ║
  ║   3. "Almost there." (9s+ if still pending)                           ║
  ║   → routes to A6 Preview when LLM + ElevenLabs both return            ║
  ║                                                                       ║
  ║  Atmosphere stack (ceremonial mode):                                  ║
  ║   - 3-stop warm gradient background with hue shift                    ║
  ║   - Ambient radial glow, 13s loop, independent of stone halo          ║
  ║   - Vignette at corners                                               ║
  ║   - Stone halo 6s + stone body 6s = three-harmonic breathing          ║
  ║                                                                       ║
  ║  Failed state copy/CTA depends on whether user provided a note:       ║
  ║   - With note: primary "Try again" → re-runs generation               ║
  ║                secondary link "Adjust your note" → routes back to A4  ║
  ║                (primary = fastest recovery path, edit is fallback)    ║
  ║   - Without note: primary "Try again" → re-runs generation            ║
  ║                                                                       ║
  ║  Failed stage shifts to task-oriented: smaller stone (--stone-md),    ║
  ║  content pushed higher in frame so actions sit above fold.            ║
  ║                                                                       ║
  ║  Stone state: cooler "working" tone throughout. Returns to honey      ║
  ║  "ready" tone only on failed state.                                   ║
  ║                                                                       ║
  ║  No backbar — generation is in flight, can't be cancelled or backed   ║
  ║  out of without losing the request.                                   ║
  ║                                                                       ║
  ║  BACKLOG (V2):                                                        ║
  ║   - Long-latency state (>30s) beyond beat 3                           ║
  ║   - Success-out transition to A6 (stone persistence / cross-fade)     ║
  ║   - Repeat-view treatment (compressed copy beats on retry)            ║
  ║   - Screen reader: aria-live on failed title, autofocus on primary    ║
  ╚═══════════════════════════════════════════════════════════════════════╝
-->

<style>
:root {
  --color-bg-neutral: #FBF8F4;
  --color-bg-warm-1: #F9F3E8;
  --color-bg-warm-2: #F6F0E5;
  --color-bg-warm-phase: #F2EDE4;
  --color-bg-gold: #F2E8D6;
  --color-bg-rich: #EDE3D0;
  --color-surface-card: #F6F0E5;
  --color-surface-warm: #EDE3D0;
  --color-surface-honey: #F2E8D6;
  --color-mineral: #7A8088;
  --color-mineral-dark: #656B73;
  --color-text-primary: #1C1A18;
  --color-text-secondary: #6B6B6B;
  --color-text-tertiary: #ADA9A5;
  --color-border: rgba(0, 0, 0, 0.06);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-mineral: 0 4px 12px rgba(74, 107, 126, 0.3);
  --shadow-focus-ring: 0 0 0 4px rgba(122, 128, 136, 0.18);

  --font-display: 'Spectral', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --text-h1: 36px;
  --text-title: 28px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  --line-height-title: 1.4;
  --line-height-hero: 1.25;

  /* Text sizing — 16px floor for 45-70 audience */
  --text-descriptor: var(--text-body);
  --text-meta: var(--text-body);

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 40px;
  --space-4xl: 48px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  --ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-press: cubic-bezier(0.2, 0.0, 0.0, 1);
  --duration-micro: 200ms;
  --duration-small: 400ms;
  --duration-medium: 800ms;
  --duration-large: 1200ms;
  --duration-breath: 3000ms;

  --size-avatar: 44px;
  --size-control-md: 52px;
  --stone-sm: 120px;
  --stone-md: 160px;
  --stone-lg: 180px;
  --stone-xl: 200px;
  --pip-w-rest: 6px;
  --pip-w-active: 20px;
  --scale-press: 0.98;
  --scale-press-subtle: 0.99;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: #1C1A18;
  background-image: radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 70%);
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 12px 60px; gap: 24px;
}
@media (prefers-reduced-motion: reduce) {
  /* Freeze looping atmospheric breath at mid-frame, keep composition */
  .phone::before,
  .stone::before,
  .stone::after,
  .stone__body {
    animation-play-state: paused !important;
  }
  /* Entrance animations collapse to instant (user already on screen) */
  .crumb-wrap,
  .stone,
  .gen-title,
  .gen-aside {
    animation-duration: 0.01ms !important;
  }
  /* Copy beat transitions stay, softened, so the screen doesn't freeze silent */
  .gen-title, .gen-aside {
    transition-duration: 800ms !important;
  }
}
button { font-family: inherit; }

.prototype-wrapper {
  width: 390px; height: 812px;
  border-radius: 48px; overflow: hidden;
  box-shadow: 0 0 0 10px #1A1715, 0 0 0 12px var(--color-mineral), 0 50px 100px rgba(0,0,0,0.45);
  position: relative; flex-shrink: 0;
  background: var(--color-bg-warm-phase);
}
@media (max-width: 440px) {
  .prototype-wrapper { transform: scale(0.88); transform-origin: top center; }
}

/* ════════════════════════════════════════════════
   ATMOSPHERE STACK (ceremonial mode)
   Layer 1: 3-stop background gradient with hue shift on .phone
   Layer 2: ambient radial glow ::before, 13s loop
   Layer 3: vignette ::after, static
   Layer 4 (stone halo + stone body) lives on .stone below
   ════════════════════════════════════════════════ */
.phone {
  width: 100%; height: 100%;
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  font-family: var(--font-body); color: var(--color-text-primary);
  background: linear-gradient(
    180deg,
    #EDE4D4 0%,
    var(--color-bg-warm-phase) 45%,
    #F5ECD8 100%
  );
}
/* Ambient warm glow — centered around stone focal point, slow breathing */
.phone::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 42%,
    rgba(232, 200, 140, 0.28) 0%,
    rgba(232, 200, 140, 0.10) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: 1;
  animation: ambientGlow 13s var(--ease-essence) infinite;
}
@keyframes ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}
/* Vignette — soft corner deepening, static */
.phone::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
  pointer-events: none;
  z-index: 2;
}
/* Keep screen content above atmosphere layers */
.phone__status, .phone__island, .phone__home-indicator { z-index: 10; }
.phone__status {
  position: absolute; inset: 0 0 auto 0; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px 0;
  font-weight: 600; font-size: var(--text-small);
  color: var(--color-text-primary); z-index: 10; pointer-events: none;
}
.phone__status-icons { display: flex; gap: 6px; align-items: center; }
.phone__island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 30px; border-radius: 999px; background: #0B0B0B; z-index: 11;
}
.phone__home-indicator {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px; border-radius: 3px;
  background: rgba(28,26,24,0.35); z-index: 10;
}
.phone__screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; z-index: 3; }

.crumb-wrap {
  position: absolute;
  top: var(--space-md);
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  z-index: 4;
  opacity: 0;
  animation: atmosphereFadeIn var(--duration-medium) var(--ease-essence) 100ms forwards;
}

.crumb-display {
  display: inline-flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--color-surface-honey);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.crumb-display__divider {
  width: 3px; height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
  opacity: 0.4;
}

.stage {
  position: absolute;
  inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: var(--space-xl);
  text-align: center;
}
.stage--hidden { display: none; }

/* STONE — working state */
.stone {
  position: relative; border-radius: var(--radius-full);
  width: var(--stone-lg); height: var(--stone-lg);
  margin-bottom: var(--space-3xl);
  opacity: 0;
  animation:
    stoneEntrance var(--duration-medium) var(--ease-essence) 300ms forwards;
}
/* Halo — 6s tempo (breathing body's companion) */
.stone::before {
  content: ''; position: absolute; inset: -28%; border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(160, 180, 200, 0.16), transparent 62%);
  animation: stoneHaloWorking 6s var(--ease-essence) infinite;
}
/* Specular highlight + third breathing tempo at 9s — subtle shimmer */
.stone::after {
  content: ''; position: absolute; top: 15%; left: 22%;
  width: 30%; height: 20%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.45), transparent 70%);
  border-radius: var(--radius-full); filter: blur(6px); pointer-events: none;
  animation: stoneShimmerWorking 9s var(--ease-essence) infinite;
}
.stone__body {
  width: 100%; height: 100%; border-radius: var(--radius-full);
  background: radial-gradient(circle at 30% 28%, #F0E8D5 0%, #DDC8A3 28%, #B89F70 60%, #80684A 90%);
  box-shadow:
    0 20px 40px rgba(120, 100, 70, 0.16),
    inset -16px -24px 50px rgba(80, 60, 30, 0.32),
    inset 16px 16px 36px rgba(255, 245, 220, 0.28);
  animation: stoneBreathWorking 6s var(--ease-essence) infinite;
}
@keyframes stoneEntrance {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes atmosphereFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes stoneBreathWorking {
  0%, 100% { transform: scale(1);     filter: brightness(1); }
  50%      { transform: scale(1.025); filter: brightness(1.04); }
}
@keyframes stoneHaloWorking {
  0%, 100% { transform: scale(1);    opacity: 0.12; }
  50%      { transform: scale(1.08); opacity: 0.20; }
}
@keyframes stoneShimmerWorking {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 0.70; }
}

/* Failed: smaller stone, revert to ready honey */
.stone--failed {
  width: var(--stone-md); height: var(--stone-md);
  margin-bottom: var(--space-xl);
}
.stone--failed .stone__body {
  background: radial-gradient(circle at 30% 28%, #FBF2DC 0%, #E8CF9A 28%, #C9A665 60%, #8A6F3E 90%);
  box-shadow:
    0 20px 40px rgba(139,111,62,0.18),
    inset -16px -24px 50px rgba(90,65,30,0.35),
    inset 16px 16px 36px rgba(255,245,220,0.35);
  animation: stoneBreathReady var(--duration-breath) var(--ease-essence) infinite;
}
.stone--failed::before {
  background: radial-gradient(circle, rgba(255,220,160,0.22), transparent 62%);
  animation: stoneHaloReady var(--duration-breath) var(--ease-essence) infinite;
}
.stone--failed::after {
  animation: none;
  opacity: 0.5;
}
@keyframes stoneBreathReady {
  0%, 100% { transform: scale(1);    filter: brightness(1); }
  50%      { transform: scale(1.05); filter: brightness(1.02); }
}
@keyframes stoneHaloReady {
  0%, 100% { transform: scale(1);   opacity: 0.15; }
  50%      { transform: scale(1.1); opacity: 0.22; }
}

.gen-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: var(--line-height-hero);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  max-width: 300px;
  margin-bottom: var(--space-md);
  text-wrap: pretty;
  opacity: 0;
  animation:
    stoneEntrance var(--duration-medium) var(--ease-essence) 500ms forwards;
  transition: opacity var(--duration-medium) var(--ease-essence);
}
.gen-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  text-wrap: pretty;
  opacity: 0;
  animation:
    stoneEntrance var(--duration-medium) var(--ease-essence) 700ms forwards;
  transition: opacity var(--duration-medium) var(--ease-essence);
}
/* Mid-stage copy swap (between beats) overrides animation */
.gen-title.is-fading, .gen-aside.is-fading {
  animation: none;
  opacity: 0.3;
}
.gen-title.is-settled, .gen-aside.is-settled {
  animation: none;
  opacity: 1;
}

.failed-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 300px;
  margin-bottom: var(--space-md);
  text-wrap: pretty;
}
.failed-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin-bottom: var(--space-sm);
  text-wrap: pretty;
}
.failed-reassurance {
  font-family: var(--font-body);
  font-size: var(--text-small);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2xl);
  letter-spacing: 0.01em;
}
.failed-actions {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-md);
  width: 100%; max-width: 280px;
}

/* Failed stage shifts to task mode: content pushed higher, actions above fold */
.stage--failed {
  justify-content: flex-start;
  padding-top: var(--space-4xl);
}

.btn {
  width: 100%; min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.btn:not(:disabled):active { transform: scale(var(--scale-press)); }

.btn--link {
  background: transparent;
  color: var(--color-text-secondary);
  box-shadow: none;
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
}
.btn--link:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}

/* DEV NAV */
.dev-rail { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 8px; }
.dev-rail__label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.dev-rail__nav, .dev-rail__row {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  max-width: 480px;
}
.dev-rail__nav button, .dev-rail__row button {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 6px 12px;
  font-family: var(--font-body); font-size: 11px;
  letter-spacing: 0.04em; cursor: pointer;
  transition: background var(--duration-micro) var(--ease-essence),
              color var(--duration-micro) var(--ease-essence),
              border-color var(--duration-micro) var(--ease-essence);
}
.dev-rail__nav button:hover, .dev-rail__row button:hover {
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.95);
}
.dev-rail__nav button.is-current, .dev-rail__row button.is-on {
  background: var(--color-mineral); color: #fff; border-color: var(--color-mineral);
}
.dev-row-label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  align-self: center; margin-right: 4px;
}
.variant-label {
  position: absolute; top: 12px; left: 14px;
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(28,26,24,0.45);
  z-index: 12; pointer-events: none;
}
</style>
</head>
<body>

<div class="dev-rail">
  <div class="dev-rail__label">A5 — Generation</div>
  <div class="dev-rail__nav" id="devNav">
    <button data-state="default" class="is-current">Default (with note)</button>
    <button data-state="failed-with-note">Failed · with note</button>
    <button data-state="failed-no-note">Failed · no note</button>
  </div>
  <div class="dev-rail__row" id="copyRow" style="margin-top: 4px;">
    <span class="dev-row-label">Copy beat:</span>
    <button data-beat="1" class="is-on">1 · Shaping</button>
    <button data-beat="2">2 · Listening</button>
    <button data-beat="3">3 · Almost there</button>
  </div>
</div>

<div class="prototype-wrapper">
  <div class="phone">

    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>

    <div class="variant-label" id="variantLabel">A5 · Default</div>

    <div class="phone__screen">

      <div class="crumb-wrap">
        <div class="crumb-display">
          <span>For Sarah</span>
          <span class="crumb-display__divider"></span>
          <span>Encouragement</span>
        </div>
      </div>

      <!-- Working stage -->
      <div class="stage" id="stageWorking">
        <div class="stone" id="workingStone">
          <div class="stone__body"></div>
        </div>
        <h1 class="gen-title" id="genTitle">Shaping your message.</h1>
        <p class="gen-aside" id="genAside">A minute, no more.</p>
      </div>

      <!-- Failed stage — smaller stone, content shifted higher, task-oriented -->
      <div class="stage stage--failed stage--hidden" id="stageFailed">
        <div class="stone stone--failed">
          <div class="stone__body"></div>
        </div>
        <h2 class="failed-title" id="failedTitle">Couldn&rsquo;t quite land it.</h2>
        <p class="failed-aside" id="failedAside">Something slipped on our end. Nothing is lost.</p>
        <p class="failed-reassurance" id="failedReassurance">Your note is kept.</p>
        <div class="failed-actions">
          <button class="btn" id="failedPrimary">Try again</button>
          <button class="btn btn--link" id="failedSecondary">Adjust your note</button>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
const COPY_BEATS = {
  1: { title: 'Shaping your message.',          aside: 'A minute, no more.' },
  2: { title: 'Listening for the right tone.',  aside: 'Choosing the words that fit.' },
  3: { title: 'Almost there.',                  aside: 'Nothing is lost.' },
};
const FAILED_COPY = {
  'failed-with-note': {
    title: 'Couldn\u2019t quite land it.',
    aside: 'Something slipped on our end.',
    reassurance: 'Your note is kept.',
    primary: 'Try again',
    secondary: 'Adjust your note',
  },
  'failed-no-note': {
    title: 'Couldn\u2019t quite land it.',
    aside: 'Something slipped on our end. Nothing is lost.',
    reassurance: null,
    primary: 'Try again',
    secondary: null,
  },
};
const VARIANT_LABELS = {
  'default':          'A5 · Default',
  'failed-with-note': 'A5 · Failed · w/ note',
  'failed-no-note':   'A5 · Failed · no note',
};
const state = { variant: 'default', beat: 1 };

function applyVariant(variant) {
  state.variant = variant;
  document.getElementById('variantLabel').textContent = VARIANT_LABELS[variant];
  const working = document.getElementById('stageWorking');
  const failed  = document.getElementById('stageFailed');

  if (variant === 'default') {
    working.classList.remove('stage--hidden');
    failed.classList.add('stage--hidden');
  } else {
    working.classList.add('stage--hidden');
    failed.classList.remove('stage--hidden');
    const c = FAILED_COPY[variant];
    document.getElementById('failedTitle').textContent = c.title;
    document.getElementById('failedAside').textContent = c.aside;
    document.getElementById('failedPrimary').textContent = c.primary;

    const reassurance = document.getElementById('failedReassurance');
    if (c.reassurance) {
      reassurance.style.display = '';
      reassurance.textContent = c.reassurance;
    } else {
      reassurance.style.display = 'none';
    }

    const sec = document.getElementById('failedSecondary');
    if (c.secondary) { sec.style.display = ''; sec.textContent = c.secondary; }
    else             { sec.style.display = 'none'; }
  }

  document.querySelectorAll('#devNav button').forEach(b => {
    b.classList.toggle('is-current', b.dataset.state === variant);
  });
}

function applyBeat(beat) {
  state.beat = beat;
  const title = document.getElementById('genTitle');
  const aside = document.getElementById('genAside');
  // On first boot, skip the fade cycle so entrance animation plays cleanly.
  // On subsequent beats, fade the old copy out, swap, fade back in.
  const hasEntered = title.classList.contains('is-settled');
  if (hasEntered) {
    title.classList.add('is-fading');
    aside.classList.add('is-fading');
    setTimeout(() => {
      title.textContent = COPY_BEATS[beat].title;
      aside.textContent = COPY_BEATS[beat].aside;
      title.classList.remove('is-fading');
      aside.classList.remove('is-fading');
    }, 400);
  } else {
    // First beat just sets text; entrance animation handles the reveal
    title.textContent = COPY_BEATS[beat].title;
    aside.textContent = COPY_BEATS[beat].aside;
    // Mark as settled after entrance would have completed (700ms + 800ms)
    setTimeout(() => {
      title.classList.add('is-settled');
      aside.classList.add('is-settled');
    }, 1600);
  }
  document.querySelectorAll('#copyRow button').forEach(b => {
    b.classList.toggle('is-on', b.dataset.beat === String(beat));
  });
}

document.querySelectorAll('#devNav button').forEach(b => b.addEventListener('click', () => applyVariant(b.dataset.state)));
document.querySelectorAll('#copyRow button').forEach(b => b.addEventListener('click', () => applyBeat(parseInt(b.dataset.beat, 10))));

applyVariant('default');
applyBeat(1);
</script>
</body>
</html>
```

---

# 7. Reference prototype: essence-step6-a7.html

Save Confirmation. Ceremonial close with Infused/Celebrate stone. Reference for the *quietly-emotional* register A6 also needs to hit — A7's tone is what A6 builds toward.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>ESSENCE · Step 6 · A7 Save Confirmation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<!--
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║  NOTE FOR CODE ARCHITECT — A7 Save Confirmation                       ║
  ║                                                                       ║
  ║  ─── VARIANTS ─────────────────────────────────────────────────────── ║
  ║  - default  (message 1 or 2 of 3) → standard ceremonial close         ║
  ║  - third    (message 3 of 3)      → triggers C1 Three Shaped after    ║
  ║                                                                       ║
  ║  The "third" variant does NOT replace A7. It runs A7 first, then      ║
  ║  the user taps a CTA which routes to C1 Three Shaped. A7 is the       ║
  ║  individual message confirmation; C1 is the ceiling moment.           ║
  ║  This separation matters: the user just preserved a real message,     ║
  ║  that act deserves its own moment, even on the third one.             ║
  ║                                                                       ║
  ║  ─── CTA HIERARCHY (locked) ───────────────────────────────────────── ║
  ║  Primary:        "View on Memory Shelf" — drives retention loop       ║
  ║  Secondary link: "Create another, when you're ready"  (default)       ║
  ║  Secondary link: "See what's coming"  (third → routes to C1 then C2)  ║
  ║                                                                       ║
  ║  ─── ATMOSPHERE ──────────────────────────────────────────────────── ║
  ║  Stone state: "infused" — warm amber tint, ceremonial.                ║
  ║  Background: 3-stop amber gradient + ambient warm glow + vignette.    ║
  ║  Base stop: var(--color-bg-gold) — warmest in the ramp.               ║
  ║                                                                       ║
  ║  Four breathing harmonics (none synchronized):                        ║
  ║   - Stone body       5s                                               ║
  ║   - Stone halo       7s                                               ║
  ║   - Stone shimmer    9s  (specular highlight on top-left face)        ║
  ║   - Ambient glow    13s  (radial behind everything)                   ║
  ║                                                                       ║
  ║  ─── ENTRANCE SEQUENCE ───────────────────────────────────────────── ║
  ║  0ms     stone starts fade + scale 0.92 → 1.0                         ║
  ║  1200ms  stone settled; halo, shimmer, body breath begin              ║
  ║  1500ms  title reveals                                                ║
  ║  1800ms  aside reveals                                                ║
  ║  2100ms  timestamp reveals (attestation below aside)                  ║
  ║  2400ms  primary CTA reveals                                          ║
  ║  2600ms  primary CTA receives focus (accessibility)                   ║
  ║  2800ms  secondary link reveals (two-tier, quieter side option)       ║
  ║                                                                       ║
  ║  Pure ceremony. Don't rush it.                                        ║
  ║                                                                       ║
  ║  ─── TIMESTAMP WIRING ────────────────────────────────────────────── ║
  ║  The timestamp renders from a formatTimestamp() helper using the      ║
  ║  current time at mount. In production, use the server's created_at    ║
  ║  from the save response. Keep the "Kept on {date} · {time}" format;   ║
  ║  format with user locale and timezone.                                ║
  ║                                                                       ║
  ║  ─── ACCESSIBILITY ──────────────────────────────────────────────── ║
  ║  - .confirm has role="status" + aria-live="polite" + aria-atomic      ║
  ║    so screen readers announce the full confirmation coherently.       ║
  ║  - .stone is aria-hidden="true"; decorative only.                     ║
  ║  - Primary button receives focus 2600ms after mount.                  ║
  ║  - Reduced motion: atmospheric loops pause at mid-frame; entrance     ║
  ║    animations collapse to instant. Screen arrives complete.           ║
  ║                                                                       ║
  ║  No backbar. The save is committed. The flow is over.                 ║
  ║                                                                       ║
  ║  ─── DO NOT ADD ────────────────────────────────────────────────── ║
  ║  Confetti, particle bursts, sparkle effects. Celebration in           ║
  ║  ceremonial mode is silence with weight, not spectacle. The warm      ║
  ║  light and stone breathing IS the celebration.                        ║
  ║                                                                       ║
  ║  ─── V2 BACKLOG ────────────────────────────────────────────────── ║
  ║  - Sound design hook: subtle chime synced to stone arrival at 1200ms. ║
  ║  - Repeat-view compression: detect prior saves, compress entrance to  ║
  ║    ~1200ms total. Ceremony respects the first time most.              ║
  ║  - Saving-state clarification: A7 presumes save succeeded. If the     ║
  ║    save can fail, upstream (A6 tap-save → A7) needs a D3 Saving       ║
  ║    screen with warm retry on failure. Verify upstream handles this.   ║
  ║  - Category-aware aside copy: currently generic. Workshop per-        ║
  ║    category asides (birthday, encouragement, comfort, etc.) that      ║
  ║    name the occasion the user just preserved for.                     ║
  ║  - Recipient name overflow: test title at 5, 10, 18, 30+ chars.       ║
  ║    text-wrap: balance holds short; 30+ may need truncation strategy.  ║
  ╚═══════════════════════════════════════════════════════════════════════╝
-->

<style>
:root {
  --color-bg-neutral: #FBF8F4;
  --color-bg-warm-1: #F9F3E8;
  --color-bg-warm-2: #F6F0E5;
  --color-bg-warm-phase: #F2EDE4;
  --color-bg-gold: #F2E8D6;
  --color-bg-rich: #EDE3D0;
  --color-surface-card: #F6F0E5;
  --color-surface-warm: #EDE3D0;
  --color-surface-honey: #F2E8D6;
  --color-mineral: #7A8088;
  --color-mineral-dark: #656B73;
  --color-text-primary: #1C1A18;
  --color-text-secondary: #6B6B6B;
  --color-text-tertiary: #ADA9A5;
  --color-border: rgba(0, 0, 0, 0.06);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-mineral: 0 4px 12px rgba(74, 107, 126, 0.3);
  --shadow-focus-ring: 0 0 0 4px rgba(122, 128, 136, 0.18);

  --font-display: 'Spectral', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --text-h1: 36px;
  --text-title: 28px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  --line-height-title: 1.4;
  --line-height-hero: 1.25;

  /* Text sizing — 16px floor for 45-70 audience */
  --text-descriptor: var(--text-body);
  --text-meta: var(--text-body);

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 40px;
  --space-4xl: 48px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  --ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-press: cubic-bezier(0.2, 0.0, 0.0, 1);
  --duration-micro: 200ms;
  --duration-small: 400ms;
  --duration-medium: 800ms;
  --duration-large: 1200ms;
  --duration-breath: 3000ms;

  --size-avatar: 44px;
  --size-control-md: 52px;
  --stone-sm: 120px;
  --stone-md: 160px;
  --stone-lg: 180px;
  --stone-xl: 200px;
  --pip-w-rest: 6px;
  --pip-w-active: 20px;
  --scale-press: 0.98;
  --scale-press-subtle: 0.99;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: #1C1A18;
  background-image: radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 70%);
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 12px 60px; gap: 24px;
}
@media (prefers-reduced-motion: reduce) {
  /* Freeze looping atmospheric breath at mid-frame, keep composition */
  .phone::before,
  .stone::before,
  .stone::after,
  .stone__body {
    animation-play-state: paused !important;
  }
  /* Entrance animations collapse to instant (user already on screen) */
  .stone,
  .confirm-title,
  .confirm-aside,
  .confirm-timestamp,
  .footer .btn,
  .footer .btn--link {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
button { font-family: inherit; }

.prototype-wrapper {
  width: 390px; height: 812px;
  border-radius: 48px; overflow: hidden;
  box-shadow: 0 0 0 10px #1A1715, 0 0 0 12px var(--color-mineral), 0 50px 100px rgba(0,0,0,0.45);
  position: relative; flex-shrink: 0;
  background: var(--color-bg-gold);
}
@media (max-width: 440px) {
  .prototype-wrapper { transform: scale(0.88); transform-origin: top center; }
}

/* ════════════════════════════════════════════════
   ATMOSPHERE STACK (ceremonial mode, amber family)
   Layer 1: 3-stop amber gradient with hue shift on .phone
   Layer 2: ambient warm radial glow ::before, 13s loop
   Layer 3: vignette ::after, static
   Layer 4 (stone halo + stone body + shimmer) on .stone below
   ════════════════════════════════════════════════ */
.phone {
  width: 100%; height: 100%;
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  font-family: var(--font-body); color: var(--color-text-primary);
  background: linear-gradient(
    180deg,
    #EDDCAB 0%,
    var(--color-bg-gold) 45%,
    #F4E5BC 100%
  );
}
/* Ambient warm glow — amber light source around stone focal point */
.phone::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 42%,
    rgba(214, 162, 92, 0.30) 0%,
    rgba(214, 162, 92, 0.12) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: 1;
  animation: ambientGlow 13s var(--ease-essence) infinite;
}
@keyframes ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}
/* Vignette — soft corner deepening, static */
.phone::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
  pointer-events: none;
  z-index: 2;
}
.phone__status {
  position: absolute; inset: 0 0 auto 0; height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px 0;
  font-weight: 600; font-size: var(--text-small);
  color: var(--color-text-primary); z-index: 10; pointer-events: none;
}
.phone__status-icons { display: flex; gap: 6px; align-items: center; }
.phone__island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 30px; border-radius: 999px; background: #0B0B0B; z-index: 11;
}
.phone__home-indicator {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 134px; height: 5px; border-radius: 3px;
  background: rgba(28,26,24,0.35); z-index: 10;
}
.phone__screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; z-index: 3; }

/* Content stage — vertical-centered ceremonial layout */
.confirm {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 0 var(--space-xl) var(--space-xl);
}

/* STONE — infused state (amber, ceremonial)
   Four breathing harmonics with the ambient glow: 5s body, 7s halo,
   9s shimmer, 13s ambient. No two synchronized; scene stays alive.
*/
.stone {
  position: relative; border-radius: var(--radius-full);
  width: var(--stone-xl); height: var(--stone-xl);
  margin-bottom: var(--space-3xl);
  /* Entry animation */
  opacity: 0;
  transform: scale(0.92);
  animation: stoneArrival var(--duration-large) var(--ease-essence) forwards;
}
/* Halo — 7s tempo, warmer amber bloom */
.stone::before {
  content: ''; position: absolute; inset: -32%; border-radius: var(--radius-full);
  background: radial-gradient(circle, rgba(232, 178, 96, 0.32), transparent 62%);
  animation: stoneHaloInfused 7s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
/* Specular shimmer — 9s tempo, subtle breath on the highlight */
.stone::after {
  content: ''; position: absolute; top: 15%; left: 22%;
  width: 30%; height: 20%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 70%);
  border-radius: var(--radius-full); filter: blur(6px); pointer-events: none;
  animation: stoneShimmerInfused 9s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}
.stone__body {
  width: 100%; height: 100%; border-radius: var(--radius-full);
  /* Warmer amber tint for infused */
  background: radial-gradient(circle at 30% 28%, #FCEEC9 0%, #ECCC83 28%, #C99A4D 60%, #856029 90%);
  box-shadow:
    0 24px 48px rgba(160, 110, 50, 0.24),
    inset -16px -24px 50px rgba(100, 65, 25, 0.40),
    inset 16px 16px 36px rgba(255, 245, 220, 0.40);
  animation: stoneBreathInfused 5s var(--ease-essence) infinite;
  animation-delay: var(--duration-large);
}

@keyframes stoneArrival {
  to { opacity: 1; transform: scale(1); }
}
@keyframes stoneBreathInfused {
  0%, 100% { transform: scale(1);    filter: brightness(1); }
  50%      { transform: scale(1.04); filter: brightness(1.06); }
}
@keyframes stoneHaloInfused {
  0%, 100% { transform: scale(1);    opacity: 0.18; }
  50%      { transform: scale(1.12); opacity: 0.32; }
}
@keyframes stoneShimmerInfused {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.80; }
}

/* COPY — staggered fade in
   Reveal order after stone settles (~1200ms entry):
     title      @ 1500ms
     aside      @ 1800ms
     timestamp  @ 2100ms  (attestation below the aside)
     primary    @ 2400ms  (CTA arrives with weight)
     secondary  @ 2800ms  (side option follows quietly)
*/
.confirm-title,
.confirm-aside,
.confirm-timestamp {
  opacity: 0;
  transform: translateY(8px);
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.confirm-title     { animation-delay: 1500ms; }
.confirm-aside     { animation-delay: 1800ms; }
.confirm-timestamp { animation-delay: 2100ms; }
@keyframes copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.confirm-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: var(--line-height-hero);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 340px;
  text-wrap: balance;
}

.confirm-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin-bottom: var(--space-lg);
  text-wrap: balance;
}

/* Timestamp attestation — museum label voice. Italic serif, tertiary color,
   quiet proof of when this was committed. */
.confirm-timestamp {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-small);
  color: var(--color-text-tertiary);
  letter-spacing: 0.01em;
  line-height: 1.5;
}

/* FOOTER — two-tier reveal: primary first, secondary follows */
.footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  background: transparent;
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.footer .btn,
.footer .btn--link {
  opacity: 0;
  animation: copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.footer .btn           { animation-delay: 2400ms; }
.footer .btn--link     { animation-delay: 2800ms; }

.btn {
  width: 100%; min-height: var(--size-control-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.btn:not(:disabled):active { transform: scale(var(--scale-press)); }

.btn--link {
  background: transparent;
  color: var(--color-text-secondary);
  box-shadow: none;
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  width: auto;
}
.btn--link:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}

/* DEV NAV */
.dev-rail { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 8px; }
.dev-rail__label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.dev-rail__nav, .dev-rail__row {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  max-width: 480px;
}
.dev-rail__nav button, .dev-rail__row button {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 6px 12px;
  font-family: var(--font-body); font-size: 11px;
  letter-spacing: 0.04em; cursor: pointer;
  transition: background var(--duration-micro) var(--ease-essence),
              color var(--duration-micro) var(--ease-essence),
              border-color var(--duration-micro) var(--ease-essence);
}
.dev-rail__nav button:hover, .dev-rail__row button:hover {
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.95);
}
.dev-rail__nav button.is-current, .dev-rail__row button.is-on {
  background: var(--color-mineral); color: #fff; border-color: var(--color-mineral);
}
.dev-row-label {
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  align-self: center; margin-right: 4px;
}
.variant-label {
  position: absolute; top: 12px; left: 14px;
  font-family: var(--font-body); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(28,26,24,0.45);
  z-index: 12; pointer-events: none;
}
.dev-rail__nav button.replay {
  background: transparent;
  color: rgba(255,255,255,0.55);
  border: 1px dashed rgba(255,255,255,0.2);
}
</style>
</head>
<body>

<div class="dev-rail">
  <div class="dev-rail__label">A7 — Save Confirmation</div>
  <div class="dev-rail__nav" id="devNav">
    <button data-variant="default" class="is-current">Default (msg 1 or 2)</button>
    <button data-variant="third">Third of three</button>
    <button data-action="replay" class="replay">↻ Replay animation</button>
  </div>
</div>

<div class="prototype-wrapper">
  <div class="phone" id="phone">

    <div class="phone__status">
      <span>9:41</span>
      <div class="phone__status-icons">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7l2-1 2 2 2-4 2 3 2-1v5H1z"/></svg>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="1" width="13" height="8" rx="2"/><rect x="2.5" y="2.5" width="10" height="5" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
    <div class="phone__island"></div>
    <div class="phone__home-indicator"></div>

    <div class="variant-label" id="variantLabel">A7 · Default</div>

    <div class="phone__screen">

      <div class="confirm" role="status" aria-live="polite" aria-atomic="true">
        <div class="stone" aria-hidden="true">
          <div class="stone__body"></div>
        </div>

        <h1 class="confirm-title" id="confirmTitle">Your voice is on the shelf for Sarah.</h1>
        <p class="confirm-aside" id="confirmAside">She won&rsquo;t know it&rsquo;s there until she needs to.</p>
        <p class="confirm-timestamp" id="confirmTimestamp">Kept on Apr 23, 2026 &middot; 9:41pm</p>
      </div>

      <div class="footer">
        <button class="btn" id="primaryBtn">View on Memory Shelf</button>
        <button class="btn btn--link" id="secondaryBtn">Create another, when you&rsquo;re ready</button>
      </div>

    </div>
  </div>
</div>

<script>
/**
 * NOTE FOR CODE ARCHITECT — timestamp wiring
 * The timestamp below is a rendered placeholder using the current date/time
 * on screen mount. In production, the save timestamp should come from the
 * server response (created_at) and be formatted client-side. Keep the
 * "Kept on {date} · {time}" pattern; format with user locale.
 */
function formatTimestamp(date) {
  const d = date || new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `Kept on ${month} ${day}, ${year} \u00B7 ${hours}:${minutes}${ampm}`;
}

const COPY = {
  default: {
    title: 'Your voice is on the shelf for Sarah.',
    aside: 'She won\u2019t know it\u2019s there until she needs to.',
    primary: 'View on Memory Shelf',
    secondary: 'Create another, when you\u2019re ready',
  },
  third: {
    title: 'Your voice is on the shelf for Sarah.',
    aside: 'She won\u2019t know it\u2019s there until she needs to.',
    primary: 'View on Memory Shelf',
    secondary: 'See what\u2019s coming',
  },
};
const VARIANT_LABELS = {
  'default': 'A7 · Default',
  'third':   'A7 · Third of three',
};

// Focus management: primary button receives focus after full entrance
// completes (stone 1200ms + primary delay 2400ms + reveal 800ms = ~3000ms,
// but we use 2600ms so focus lands as the button becomes visible, not after).
const FOCUS_DELAY_MS = 2600;
let focusTimeoutId = null;

function applyVariant(variant) {
  document.getElementById('variantLabel').textContent = VARIANT_LABELS[variant];
  const c = COPY[variant];
  document.getElementById('confirmTitle').textContent = c.title;
  document.getElementById('confirmAside').textContent = c.aside;
  document.getElementById('confirmTimestamp').textContent = formatTimestamp();
  document.getElementById('primaryBtn').textContent = c.primary;
  document.getElementById('secondaryBtn').textContent = c.secondary;

  document.querySelectorAll('#devNav button[data-variant]').forEach(b => {
    b.classList.toggle('is-current', b.dataset.variant === variant);
  });
}

function scheduleFocus() {
  if (focusTimeoutId) clearTimeout(focusTimeoutId);
  focusTimeoutId = setTimeout(() => {
    const primary = document.getElementById('primaryBtn');
    if (primary && document.activeElement !== primary) {
      primary.focus({ preventScroll: true });
    }
  }, FOCUS_DELAY_MS);
}

function replayAnimation() {
  // Re-mount the screen contents to restart all animations
  const phone = document.getElementById('phone');
  const screen = phone.querySelector('.phone__screen');
  const clone = screen.cloneNode(true);
  screen.replaceWith(clone);
  scheduleFocus();
}

document.querySelectorAll('#devNav button[data-variant]').forEach(b => {
  b.addEventListener('click', () => applyVariant(b.dataset.variant));
});
document.querySelectorAll('#devNav button[data-action="replay"]').forEach(b => {
  b.addEventListener('click', () => replayAnimation());
});

applyVariant('default');
scheduleFocus();
</script>
</body>
</html>
```

---

