# Essence 2.0 — Design tokens

Canonical token set, lifted verbatim from `src/app/globals.css` `@theme`.
Last synced 2026-04-17. If the source diverges, the source wins —
regenerate this file from it. The HTML prototype (`prototypes/voice-recording-flow.html`)
mirrors these values in its own `:root` block; keep the two in sync.

Reach for **semantic role tokens** (`--text-title`, `--color-surface-card`)
over raw scale values (`--text-h1`) so future tweaks propagate cleanly.

---

## Background ramp (5 steps)

Universal warm palette. Onboarding phases and Voice Training prompt cards
step through this ramp. Each jump is small so the progression reads as
richer/warmer, not as abrupt mode changes. Source: ESSENCE Session 4.

| Token                   | Hex       | Use                                                         |
| ----------------------- | --------- | ----------------------------------------------------------- |
| `--color-bg-neutral`    | `#FBF8F4` | Cream — base app background                                 |
| `--color-bg-warm-1`     | `#F9F3E8` | Voice Training · stage 1 screen                             |
| `--color-bg-warm-2`     | `#F6F0E5` | Voice Training · stage 2 screen · stage 1 card              |
| `--color-bg-warm-phase` | `#F2EDE4` | Onboarding phase 2 (screens 7–12) · stage intros · working  |
| `--color-bg-gold`       | `#F2E8D6` | Voice Training · stage 3 screen · stage 2 card              |
| `--color-bg-rich`       | `#EDE3D0` | Voice Training · stage 3 card · ready (ceremonial endpoint) |
| `--color-bg-primary`    | `#FBF8F4` | Alias → cream (legacy usages)                               |

### `--color-bg-warm-1` value history

- **2026-04-17** — `#F9F4ED` → `#F9F3E8`. Prior value was only 2–4 RGB units
  warmer than cream; the token read as perceptually identical to the base.
  Shifted the yellow/red channels to clear the "visibly warm" threshold
  while keeping the step to warm-2 small.

### Voice Training ramp rule

**Prompt screens step through the ramp; cards step one stop warmer than
their screen.** The card-one-stop-warmer rule preserves a consistent "the
thing you're reading" elevation across all three stages.

| Stage | Screen bg              | Card bg                |
| ----- | ---------------------- | ---------------------- |
| 1     | `warm-1` (`#F9F3E8`)   | `warm-2` (`#F6F0E5`)   |
| 2     | `warm-2` (`#F6F0E5`)   | `gold` (`#F2E8D6`)     |
| 3     | `gold` (`#F2E8D6`)     | `rich` (`#EDE3D0`)     |
| Ready | `rich` (`#EDE3D0`)     | — (no card; endpoint)  |

Ready closes the ramp by matching the Stage 3 card the user just left —
"voice preserved in the same warm tone that held the deepest prompts."

CSS mechanism differs between prototype and production for historical
reasons, but values are identical:

- **Prototype** — attribute selectors on the outer `.screen`
  (`.screen[data-view="prompt-1"]` etc.) so the page bg stays solid across
  the 6 px `.page-transition` slide-in.
- **Production** — classes on `.record-step` (`.record-step--prompt-stage-*`);
  React doesn't emit `data-view` attributes. Card backgrounds are
  class-based in both (`.record-prompt-card--stage-2` / `--stage-3`).

## Surfaces

Thin elements (tracks, lines, dots, card hovers). Re-pointed at the ramp so
the whole palette aligns without renaming usages across the codebase.

| Token                   | Hex       | Use                                       |
| ----------------------- | --------- | ----------------------------------------- |
| `--color-surface-card`  | `#F6F0E5` | Cards, elevated surfaces                  |
| `--color-surface-warm`  | `#EDE3D0` | Progress tracks, disabled states          |
| `--color-surface-honey` | `#F2E8D6` | Hover, celebration                        |

## Primary accent

| Token                 | Hex       | Use                                       |
| --------------------- | --------- | ----------------------------------------- |
| `--color-mineral`     | `#7A8088` | Primary buttons, active states, recording |
| `--color-mineral-dark`| `#656B73` | Hover on primary buttons                  |

### Record button — mineral-at-rest

`mineral → terracotta` on tap is a meaningful attention-to-recording shift,
not just a value change. 3-stop warm-mineral radial gradient at rest
(`#6B8A9B → --color-mineral → #334B5A`), swapping to terracotta during the
recording pulse. Resting, hover, and ground-shadow all live in the
`rgba(74, 107, 126, *)` family; alphas vary by state (0.28 resting, 0.3
ground, 0.38 hover) so they're kept inline on `.record-button` rather than
tokenized — see `--shadow-mineral` for the canonical "mineral shadow" value
if you need one standalone.

## Text

Inactive text/nodes use `--color-text-secondary`. **Never** use
`--color-text-tertiary` for small elements — it fails contrast (large text
only: labels, disabled-large, ghost state).

| Token                    | Hex       | Contrast on `bg-primary` | Use                                   |
| ------------------------ | --------- | ------------------------ | ------------------------------------- |
| `--color-text-primary`   | `#1C1A18` | 17.8:1                   | Headlines, body                       |
| `--color-text-secondary` | `#6B6B6B` | 5.8:1                    | Supporting text, inactive nodes       |
| `--color-text-tertiary`  | `#ADA9A5` | (large text only)        | Disabled, ghost state, subtle eyebrow |

## Status

Red is **always** `--color-status-error` (#9C3528 terracotta). Never raw
`#C84545` or other reds.

| Token                   | Hex       | Contrast | Use             |
| ----------------------- | --------- | -------- | --------------- |
| `--color-status-error`  | `#9C3528` | 6.72:1   | Terracotta      |
| `--color-status-warning`| `#8A5A1E` | 5.57:1   | Amber-umber     |
| `--color-status-success`| `#4A7A68` | 4.64:1   | Sage            |

## Borders & shadows

| Token              | Value                                    | Use                         |
| ------------------ | ---------------------------------------- | --------------------------- |
| `--color-border`   | `rgba(0, 0, 0, 0.06)`                    | Hairlines                   |
| `--shadow-sm`      | `0 2px 4px rgba(0, 0, 0, 0.04)`          | Subtle lift                 |
| `--shadow-md`      | `0 4px 12px rgba(0, 0, 0, 0.08)`         | Cards                       |
| `--shadow-lg`      | `0 8px 24px rgba(0, 0, 0, 0.12)`         | Floating panels             |
| `--shadow-mineral` | `0 4px 12px rgba(74, 107, 126, 0.3)`     | Recording button (mineral-tinted) |

---

## Typography

### Fonts

Self-hosted via `next/font/google` in `src/app/layout.tsx`. Variable
declarations `--font-display` / `--font-body` are written onto `<html>`.

| Token            | Value                              | Use                                           |
| ---------------- | ---------------------------------- | --------------------------------------------- |
| `--font-display` | `'Spectral', Georgia, serif`       | Headlines, prompt copy, italic asides         |
| `--font-body`    | `'Inter', system-ui, sans-serif`   | Body, UI labels, buttons                      |

### Raw scale

Prefer the semantic roles below. Raw scale is retained for edge cases.

| Token            | Size |
| ---------------- | ---- |
| `--text-scale-display` | 48px | *(renamed from `--text-display` — the semantic ceremonial role now owns that name)* |
| `--text-h1`      | 36px |
| `--text-h2`      | 28px |
| `--text-h3`      | 20px |

### Semantic roles (canonical)

| Token                  | Size | Notes                                                 |
| ---------------------- | ---- | ----------------------------------------------------- |
| `--text-title`         | 28px | Screen headlines — Spectral 600, line 1.4             |
| `--line-height-title`  | 1.4  | Pair with `--text-title`                              |
| `--text-body-lg`       | 18px | Larger body                                           |
| `--text-body`          | 16px | Default body                                          |
| `--text-ui`            | 15px | Semibold UI labels — between body and small          |
| `--text-small`         | 14px | Small body                                            |
| `--text-caption`       | 12px | Eyebrow, meta, captions                               |
| `--text-display`       | 34px | **Ceremonial payoff line** — Spectral 400, line 1.34, -0.015em |
| `--line-height-display`| 1.34 | Pair with `--text-display`                            |
| `--tracking-display`   | -0.015em | Pair with `--text-display`                        |
| `--text-ceremonial`    | 23px | Ceremonial strong — Spectral 600, -0.01em             |
| `--tracking-ceremonial`| -0.01em | Pair with `--text-ceremonial`                      |

> **Ceremonial display text takes a px measure, never `ch`.** `ch` scales with
> the font, so a line rags *identically* at 34px and at 26px — a size clamp can
> never buy a line back and a fit loop over `font-size` is a no-op against a `ch`
> measure. Size in container units rather than `vw`
> (`clamp(26px, 10.3cqw, 34px)`), so the type stays correct when a 390px frame
> sits inside a desktop review page. Reserve the block and prove *all* candidate
> lines fit it — the layout must not belong to one sentence. Re-fit on
> `document.fonts.ready`, or you have measured the fallback face.

---

## Spacing (8px base)

| Token         | Value |
| ------------- | ----- |
| `--space-xs`  | 4px   |
| `--space-sm`  | 8px   |
| `--space-md`  | 12px  |
| `--space-lg`  | 16px  |
| `--space-xl`  | 24px  |
| `--space-2xl` | 32px  |
| `--space-3xl` | 40px  |
| `--space-4xl` | 48px  |

## Border radius

| Token           | Value  | Use                |
| --------------- | ------ | ------------------ |
| `--radius-sm`   | 4px    |                    |
| `--radius-md`   | 8px    |                    |
| `--radius-lg`   | 10px   | Buttons            |
| `--radius-xl`   | 12px   |                    |
| `--radius-2xl`  | 16px   | Cards              |
| `--radius-pill` | 20px   | Pill badges        |
| `--radius-full` | 9999px | Circular elements  |

## Easing

> Mirrors `src/app/globals.css @theme` (the running CSS is canonical; this table only
> reflects it, never the reverse — the Step-7 drift trap). If they disagree, globals wins.

| Token             | Value                          | Use                                           |
| ----------------- | ------------------------------ | --------------------------------------------- |
| `--ease-essence`  | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Universal state-transition curve            |
| `--ease-breath`   | `cubic-bezier(0.37, 0, 0.63, 1)` | Symmetric pendulum — BreathStone / record-button rest. **Stone-only; never the vault or shimmer.** |
| `--ease-press`    | `cubic-bezier(0.2, 0.0, 0.0, 1)` | Button press / tactile feedback             |
| `--ease-page`     | `cubic-bezier(0.22, 1, 0.36, 1)` | Cinematic screen entrance — every page + staggered child |

## Duration

| Token               | Value  |
| ------------------- | ------ |
| `--duration-micro`  | 200ms  |
| `--duration-small`  | 400ms  |
| `--duration-medium` | 800ms  |
| `--duration-large`  | 1200ms |
| `--duration-breath` | 3000ms |

---

## Dark ceremonial stage

Essence has **no dark mode**. It has one dark surface, used where the product
goes quiet and a single object carries the beat: the *crystallize*, *preserved*,
*detail* and *playback* phases of First Breath.

Promoted verbatim from the Step 5 First Playback build via the design system's
`ds/dark-stage.html` card — measured, shipped, argued-over values, not redrawn.
Local mirror: `prototypes/ds/dark-stage.html`. Source of truth is `@theme` in
`globals.css`; this table mirrors it.

The six atmosphere layers (`l-base` … `l-grain`) keep their literals inside the
card's spec. They are a composition, not a palette — tokenising
`opacity: .32 + lum × .55` would name the arithmetic without making it reusable.

### Ground

| Token              | Hex       | Use                              |
| ------------------ | --------- | -------------------------------- |
| `--color-ink`      | `#1E1B18` | The one dark surface             |
| `--color-ink-lift` | `#2A2621` | `l-base` ramp — warm centre      |
| `--color-ink-deep` | `#121110` | `l-base` ramp — cold corner      |

### Cream on ink — the opacity ramp

Type on the stage is **one colour at four amounts**. Hierarchy on ink is opacity
and *family*; it is never a second hue. The whole ramp clears AA against the
unlit ground and stays clear when `l-cast` brightens it.

| Token               | Value                     | Use                                       |
| ------------------- | ------------------------- | ----------------------------------------- |
| `--color-on-dark`   | `#F7F1E4`                 | The payoff line — full opacity, `--text-display` |
| `--on-dark-strong`  | `rgba(247,241,228,0.92)`  | `--text-ceremonial`, Spectral 600         |
| `--on-dark-body`    | `rgba(247,241,228,0.62)`  | 15px Inter — the product speaking         |
| `--on-dark-muted`   | `rgba(247,241,228,0.58)`  | Eyebrows; Spectral italic asides          |
| `--on-dark-recede`  | `rgba(247,241,228,0.50)`  | Spectral italic lede                      |

**The spoken word** (Step 5 First Playback only). Not a fifth and sixth level of
the ramp above — a transient *state*, not a hierarchy. A word is lit while the
voice is on it and cools a beat later, so the line settles in the order it was
spoken. These two carry warmth, which the ramp deliberately does not; that is
why they are named separately rather than folded into it.

| Token            | Value     | Use                                        |
| ---------------- | --------- | ------------------------------------------ |
| `--on-dark-lit`  | `#FFF6E4` | A word while the voice is speaking it      |
| `--on-dark-rest` | `#EFE7D6` | The same word once it has settled          |

- **Family, not colour.** The aside is Spectral italic; a notice is Inter. They
  share a slot and nearly the same opacity, and the family is the only signal
  separating them. Never distinguish them by colour or size alone.
- **No third step.** If a design needs a fifth level of cream, it has too much on
  the stage. Cut an element instead of inventing an opacity.

### Warmth, primary, and focus

| Token                        | Value                              | Notes                                   |
| ---------------------------- | ---------------------------------- | --------------------------------------- |
| `--stone-halo`               | `rgba(255,230,180,0.18)`           | Origin of every warm value on the stage |
| `--color-primary-dark`       | `#F2E6CE`                          | Honey fill — 17px Inter 600, radius 10, min-height 52 |
| `--color-primary-dark-hover` | `#FBF3E2`                          |                                         |
| `--color-on-primary-dark`    | `#1B1610`                          |                                         |
| `--shadow-honey`             | `0 10px 30px rgba(255,230,180,.12)` | Derived from the halo. **Static — never animated per frame.** |
| `--focus-dark`               | `#F2E6CE`                          | 2px outline at 3px offset, on both the primary and the quiet button |

**Mineral (`#7A8088`) appears nowhere on a dark stage** — it is near-invisible on
warm ink. `--focus-dark` is the one warm value permitted to sit outside
`--stone-halo`, precisely because it must *not* track luminance: a focus ring
that dims when the voice goes quiet is not a focus ring.

**The primary stays full width** (`max-width: 330px`). The dark stage gives the
button no container to sit inside — no card edge, no gutter, no surface boundary
— so width is the only property left that reads as authority. A centred
auto-width button on ink reads as a link that gained a background.

### Breath Stone geometry

See `prototypes/ds/breath-stone.html`.

| Token                      | Value              | Notes                                     |
| -------------------------- | ------------------ | ----------------------------------------- |
| `--stone-size-hero`        | `min(320px, 56vw)` | 218px at 390px; full 320px from 560px up  |
| `--stone-clearance`        | `120px`            | At 420px viewport width and above         |
| `--stone-clearance-narrow` | `48px`             | Below 420px viewport width                |

**Clearance is viewport-conditional.** The docs' unconditional "≥ 120px on every
side" was unsatisfiable at 390px (390 − 240 = 150px maximum) and no build ever
met it — the builds were right and the docs were wrong. Other canonical sizes are
fixed: 160px in-card, 220px default, 120px minimum rendered (below that it reads
as a dot, not a sphere).

### Status on ink — there is none, by ruling

Status on a ceremonial dark stage is carried by **language and position, never
colour**. The system gets no dark-stage terracotta, sage, or amber-umber.

1. The warm status hues are tuned for cream and only for cream. `#9C3528` reads
   6.72:1 on `#FBF8F4` and roughly **1.9:1** on `#1E1B18` — a hole in the screen,
   not a warning.
2. Lightening them leaves the palette. Raising terracotta to AA on ink produces a
   salmon that belongs to no other Essence surface.
3. The stage exists to hold one thing at a time. A coloured notice competes with
   the stone at the moment the stone *is* the message.

**So write it instead.** A notice on ink is 15px Inter at `--on-dark-body`, in
the aside slot — mutually exclusive with the aside, so no state is taller than
the happy path. No fill, no border, no icon, no colour. It carries
`role="status" aria-live="polite"` and follows the house error pattern: what
happened, what to do next.

**The one escape hatch is a surface change, not a colour.** A genuinely
destructive confirmation (deleting a voice, not a playback that failed) sits on a
`--color-surface-card` laid over the stage, and inside that card the normal warm
status colours apply unchanged.

*Corollary for reviewers:* "this error needs to be red" is, on a dark stage, a
note about the sentence. Rewrite the sentence.

### Four rules the medium enforces

Each bit the Step 5 build once, silently — nothing threw, nothing looked broken
in a screenshot. They are properties of the medium, not of that screen.

1. **`will-change` is a state, not a declaration.** Declare it only under the
   class that means "this is actually animating right now" — zero promoted layers
   at rest, eight for the ~5s utterance. The exposure is GPU layer memory, not
   the main thread. Keep blend-mode layers at `inset: 0`: `.l-grain` at
   `inset: -50%` was 1.32M overlay-blended pixels on a layer that never animates,
   and cost more than every promoted layer put together.
2. **Unmount, don't just fade.** An element at `opacity: 0` still occupies its
   row and silently sets the spacing of everything below it. Opacity is for the
   transition, not for the absence.
3. **Reveal with an animation, not a transition — on anything interactive.** A
   1400ms `transform` transition for a CTA's rise also governs `:active`, and the
   press stops being tactile. Use `@keyframes` for the entrance so the transition
   stays free for `:active` at `--duration-small`.
4. **A flex column child does not inherit its parent's width.** `.actions` needs
   `align-self: stretch` before `width: 100%; max-width: 330px` will bind. When a
   percentage width doesn't take, the parent's cross-axis size is the suspect.

### Not settled — do not treat as promoted

- A real device at 4× CPU throttle. Every performance number above is desktop,
  one of them synthetic.
- Autoplay verified on a real iPhone, and the silent-switch state that looks
  identical to blocked autoplay.
- The inbound crossfade from `detail` — the stone must not re-enter.
- The skip affordance and the playback-failure screen exist as agreed direction
  and copy only; neither is prototyped.

---

## Step 3 — Vault, seal, shimmer

Reconciled drop-in from the Bronze Vault palette deck (FU #65) ↔ Motion Spec ↔
Pass 3 processing prototype. Source of truth is `@theme` in `globals.css`; this
table mirrors it. Per-state shimmer **values** (faint 0.05, active 0.12, neutral
0.025, RM 0.05) live in the screen, not as tokens — only `--shimmer-intensity`
is a token, landing at `0` in Pass 1 and driven by the loop in Pass 3.

| Token                    | Value                          | Use                                                        |
| ------------------------ | ------------------------------ | ---------------------------------------------------------- |
| `--color-vault-bronze`   | `#888278`                      | Cool/dormant base · greige (name historical; == cool-1)    |
| `--color-vault-ember`    | `#f3d9a4`                      | Ignited ember core                                         |
| `--color-glow-warm-rgb`  | `214, 162, 92`                 | Shimmer ground · comma form · `rgba(var(--…), <a>)`         |
| `--vault-case-cool-0/1/2`| `#a39c8e` / `#888278` / `#635d54` | caseMetal · cool vessel case (unsealed), linear         |
| `--vault-case-warm-0/1/2`| `#b6ab97` / `#8c8174` / `#5f574c` | caseMetalWarm · ignited/sealed case, linear             |
| `--vault-interior-0/1/2` | `#d2c9b9` / `#bdb29d` / `#968b75` | Open vault interior (cool), radial                      |
| `--vault-ember-cool-0/1` | `#b8b3a8` / `#847d70`          | Dormant ember socket, radial                               |
| `--vault-ember-halo-0..3`| `#fbe6c0` / `#eecb84` / `#d9a85a` / `rgb(217 168 90 / 0)` | Caught ember halo, radial to 0     |
| `--vault-lit-core`       | `#f3d9a4`                      | Solid lit center of sealed boss (= `--color-vault-ember`)  |
| `--shimmer-intensity`    | `0`                            | Single opacity-driven shimmer ground primitive (Pass 1 = 0)|
| `--ease-seal-iris`       | `cubic-bezier(0.4,0,0.2,1)`    | Iris close · **placeholder** = `--ease-essence` (vault thread tunes) |
| `--ease-seal-ember`      | `cubic-bezier(0.2,0,0.5,1)`    | Ember catch + shimmer onset (Pass 2)                       |
| `--ease-seal-exit`       | `cubic-bezier(0.4,0,0.2,1)`    | Processing exit ease-down (Pass 3); tail tunes to (0.4,0,0.15,1) on oat |

---

## Global base rules (`@layer base`)

- Minimum touch target `44px` on all buttons, anchors, `[role="button"]` —
  tuned for the 45–70 demographic.
- Font smoothing: `-webkit-font-smoothing: antialiased`.
- Body line-height: `1.6`.
- `@media (prefers-reduced-motion: reduce)` zeroes animation and
  transition durations globally.
