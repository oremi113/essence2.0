---
id: 2026-08-25-first-breath-completed-event-never-fires-reduced-motion
priority: P3
status: open
opened: 2026-08-25
resolved:
owner_paired: false
summary: `breath_stone_sequence_completed` never fires for reduced-motion users → the First-Breath funnel counts every RM user as started-but-abandoned *(triage 2026-08-25)*
---

# First-Breath completion event never fires under reduced motion

*(triage 2026-08-25)*
`src/components/screens/FirstBreathSequence.phases.ts:132-146` — `breath_stone_sequence_completed`
is emitted only from the `'revealed'` phase's `onEnter` (l.136). But the timeline is created with
`paused: prefersReducedMotion` (l.145), and a paused `useSequenceTimeline` never advances its phases,
so it never fires that `onEnter`. Reduced-motion users still *complete and continue* — the CTA is
force-shown via `ctaVisible = … || prefersReducedMotion` (l.157) and `phase` is forced to
`'preserved'` (l.154) — and they DO emit the start event (`breath_stone_sequence_started`, l.168,
tagged `reducedMotion: true`). So the funnel records their start but never their completion.

**Why it matters:** every reduced-motion user shows up in the First-Breath funnel as
started-but-never-completed, so completion/drop-off for that whole segment is silently wrong — the
kind of segment (accessibility settings on) product most wants an honest read on. Analytics
integrity only; no user-facing harm. Pre-existing (the phases file wasn't touched by the recent
S10-C work), surfaced this triage.

**Fix shape:** emit `breath_stone_sequence_completed` on the reduced-motion path too — e.g. fire it
from an effect when the RM branch reveals the CTA (mirroring the started event's effect-scoped,
Strict-Mode-safe emission at l.167-174), rather than relying on a timeline phase that never runs when
paused. Include `reducedMotion: true` in the payload so the two branches are distinguishable.

**Pick up when:** the next First-Breath or analytics-funnel pass — pairs with the other funnel-
integrity items (FU-16, FU-64, FU-100).
