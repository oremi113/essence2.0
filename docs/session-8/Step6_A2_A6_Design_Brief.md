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
