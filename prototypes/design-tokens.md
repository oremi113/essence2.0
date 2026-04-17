# Essence 2.0 — Design tokens

Canonical token set, lifted verbatim from `src/app/globals.css` `@theme`.
Snapshot taken 2026-04-17. If the source diverges, the source wins —
regenerate this file from it.

Reach for **semantic role tokens** (`--text-title`, `--color-surface-card`)
over raw scale values (`--text-h1`) so future tweaks propagate cleanly.

---

## Background ramp (5 steps)

Universal warm palette. Onboarding phases and Voice Training prompt cards
step through this ramp. Each jump is small so the progression reads as
richer/warmer, not as abrupt mode changes. Source: ESSENCE Session 4.

| Token                   | Hex       | Use                                          |
| ----------------------- | --------- | -------------------------------------------- |
| `--color-bg-neutral`    | `#FBF8F4` | Cream — base app background                  |
| `--color-bg-warm-phase` | `#F2EDE4` | Warmer oat — onboarding phase 2 (screens 7–12) |
| `--color-bg-warm-1`     | `#F9F4ED` | Very gentle warmth                           |
| `--color-bg-warm-2`     | `#F6F0E5` | Soft oat — stage 1 prompt card               |
| `--color-bg-gold`       | `#F2E8D6` | Honey — stage 2 prompt card                  |
| `--color-bg-rich`       | `#EDE3D0` | Richest / ceremonial — stage 3 prompt card   |
| `--color-bg-primary`    | `#FBF8F4` | Alias → cream (legacy usages)                |

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
| `--shadow-mineral` | `0 4px 12px rgba(122, 128, 136, 0.3)`    | Recording button (mineral)  |

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

| Token             | Value                          | Use                                           |
| ----------------- | ------------------------------ | --------------------------------------------- |
| `--ease-essence`  | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Universal transitions                       |
| `--ease-breath`   | `cubic-bezier(0.4, 0.0, 0.2, 1)` | BreathStone, record-button                  |
| `--ease-press`    | `cubic-bezier(0.2, 0.0, 0.0, 1)` | Button press / tactile feedback             |

## Duration

| Token               | Value  |
| ------------------- | ------ |
| `--duration-micro`  | 200ms  |
| `--duration-small`  | 400ms  |
| `--duration-medium` | 800ms  |
| `--duration-large`  | 1200ms |
| `--duration-breath` | 3000ms |

---

## Global base rules (`@layer base`)

- Minimum touch target `44px` on all buttons, anchors, `[role="button"]` —
  tuned for the 45–70 demographic.
- Font smoothing: `-webkit-font-smoothing: antialiased`.
- Body line-height: `1.6`.
- `@media (prefers-reduced-motion: reduce)` zeroes animation and
  transition durations globally.
