---
title: breath_stone_sequence_completed skip-path timing shift
date: 2026-04-19
event: breath_stone_sequence_completed
type: behavior-change
pr: 36
impact: On skipped sessions, event now fires ~7s earlier (aligned with reveal). Autoplay sessions unchanged.
---

## What changed

For sessions where the user taps the skip button during the First Breath sequence, `breath_stone_sequence_completed` now fires at **skip+1800ms** (aligned with the reveal beat). Previously it fired at the original ~9300ms mark of the autoplay timeline, ignoring the skip entirely.

Autoplay sessions (no skip tap) fire the event at the same time as before.

## Root cause

Pre-refactor, `skipToPreserved` set `autoPhase='preserved'` and scheduled a 1.8s reveal, but did **not** clear the outer effect's 5 setTimeouts. Those timers kept ticking, so the `breath_stone_sequence_completed` track call fired at its original scheduled time regardless of when the user skipped.

The refactor (PR #36) replaced scattered setTimeouts with a `useSequenceTimeline` hook that owns timer lifecycle. `skipTo('preserved')` now cancels pending timers and re-drives the timeline from the skip point, so event timing matches what's on screen.

## When

Landed on `main` with merge of PR #36 (2026-04-19 or later).

## What to watch

- **Funnel duration distributions** segmented by skip vs autoplay will show a discontinuity at merge time. The skip-path cohort's duration-to-completion event drops by roughly 7s.
- Any dashboard that aggregates `breath_stone_sequence_completed` durations without segmenting on `breath_stone_skip_tapped` will see a small overall drop in mean duration, weighted by the skip rate.
- The related event `breath_stone_skip_tapped` is unchanged.
- Total event counts are unchanged — only timing within a session.
