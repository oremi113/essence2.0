---
id: 2026-08-07-first-breath-completed-event-never-fires-under-reduced-motion
priority: P3
status: open
opened: 2026-08-07
resolved:
owner_paired: false
summary: `breath_stone_sequence_completed` never fires for reduced-motion users → every RM user counts in `started` but never `completed`, biasing the First-Breath completion funnel *(triage 2026-08-07)*
---

# Reduced-motion users are counted in First-Breath `started` but never `completed`

*(triage 2026-08-07)*
`src/components/screens/FirstBreathSequence.phases.ts:132-146` → `src/lib/animation/useSequenceTimeline.ts:88-90`.

`useFirstBreathPhases` passes `{ paused: prefersReducedMotion }` into `useSequenceTimeline`. The timeline's schedule/`onEnter` effect early-returns on `if (paused) return;`, so the `revealed` phase's `onEnter` — the **only** emitter of `track('breath_stone_sequence_completed')` — never runs for reduced-motion users. Meanwhile the component still renders the completed state for those users (via the `prefersReducedMotion` overrides on `preservedReady`/`ctaVisible`), and `breath_stone_sequence_started` fires unconditionally on mount.

**Why it matters:** every reduced-motion user is booked into `started` but can never reach `completed`, silently deflating the First-Breath completion-rate funnel by the RM share of traffic (accessibility users, and anyone with OS reduce-motion on). The ceremony is a launch-critical moment, so a biased completion metric misinforms exactly the decision it exists to support. Distinct from the already-logged journey-funnel once-guard (FU-101) and the `voice_profile_id`-null (FU-100) items — this is the RM branch dropping a completion event.

**Fix shape:** emit `breath_stone_sequence_completed` from the reduced-motion branch of `useFirstBreathPhases` (e.g. a mount effect gated on `prefersReducedMotion`) rather than relying solely on the paused timeline's `onEnter`. Drop a `docs/analytics/` note since it changes the event's firing population.

**Pick up when:** next analytics/telemetry pass, or whenever the First-Breath completion rate is first read for a real decision (whichever comes first) — the number is wrong until then.
