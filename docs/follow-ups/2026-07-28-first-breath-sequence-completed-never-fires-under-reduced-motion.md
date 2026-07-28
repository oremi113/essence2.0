---
id: 2026-07-28-first-breath-sequence-completed-never-fires-under-reduced-motion
priority: P3
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: First Breath emits `sequence_started` on mount but only emits `sequence_completed` in the animation's `revealed` phase, which the paused reduced-motion timeline never reaches → the funnel shows a phantom 100% drop-off for every reduced-motion user *(triage 2026-07-28)*
---

# First Breath `sequence_completed` never fires under reduced motion — phantom funnel drop-off

*(triage 2026-07-28)*

`src/components/screens/FirstBreathSequence.phases.ts:167-174` fires
`breath_stone_sequence_started` unconditionally on mount (with a `reducedMotion` flag). The matching
`breath_stone_sequence_completed` fires **only** in the `revealed` phase's `onEnter` (`:132-138`, the
sole emit site). But the timeline is constructed with `{ paused: prefersReducedMotion }` (`:143-146`),
so under reduced motion it parks on `forming` and never advances to `revealed` — `preservedRevealed`
(`:155`) stays false, and `sequence_completed` never emits. The reduced-motion user still sees the CTA
(`ctaVisible` includes `prefersReducedMotion`, `:157`) and completes the flow normally; only the
telemetry is missing.

**Why it matters:** every user with "reduce motion" enabled — a meaningful slice of the 45–70 target
audience, many of whom set it OS-wide for comfort — registers a `started` but never a `completed`, so
the First Breath funnel reports that entire cohort as dropping off at 100% even though they finished.
The `reducedMotion: true` property on `started` makes the skew self-inflicted and easy to mistake for
a real reduced-motion UX problem when the numbers are read.

**Fix shape:** emit `sequence_completed` on the reduced-motion path too — e.g. fire it from the mount
effect when `prefersReducedMotion` is true, or gate the emit on `preservedRevealed || prefersReducedMotion`.
Drop a `docs/analytics/` note in the same change (telemetry-impacting, per house rules).

**Pick up when:** next analytics pass, or before anyone reads the First Breath funnel to make a
product call. Non-visual (event-only).
