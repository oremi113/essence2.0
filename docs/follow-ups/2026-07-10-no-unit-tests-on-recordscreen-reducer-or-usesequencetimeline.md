---
id: 2026-07-10-no-unit-tests-on-recordscreen-reducer-or-usesequencetimeline
legacy_id: 96
priority: P3
status: open
opened: 2026-07-10
resolved:
summary: No unit tests on `RecordScreen.reducer` + `useSequenceTimeline` *(triage 2026-07-10)*
---

# No unit tests on `RecordScreen.reducer` or `useSequenceTimeline`

*(triage 2026-07-10)*
`src/components/screens/RecordScreen.reducer.ts` (`recordReducer` / `deriveInitialView`) and
`src/lib/animation/useSequenceTimeline.ts` ship with no unit coverage. The reducer is a pure state
machine driving the entire record flow's stage / celebration / working→ready branching; the timeline
hook is a reusable timer primitive with non-trivial reset / skipTo / paused / strict-mode-guard
behavior (touched only incidentally by one e2e spec).
**Why it matters:** exactly the testable units the repo otherwise covers (cf.
`tests/unit/preview-refine-reducer.test.ts`), on a shipping path. A regression in a transition or a
timer-cleanup path would ship silently — the house "extract, then test" pattern was half-applied.
**Fix shape:** add `tests/unit/record-reducer.test.ts` covering each transition + the celebration
`next.kind` branches, and a fake-timer test for `useSequenceTimeline` (reset / skipTo / pause
cleanup, StrictMode double-invoke guard).
**Pick up when:** next time either file is touched, or a test-coverage pass. Agent-fixable.
