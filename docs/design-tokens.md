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
| `--text-display` | 48px |
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
