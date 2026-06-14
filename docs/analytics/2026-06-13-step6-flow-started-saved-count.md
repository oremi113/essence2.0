---
title: Step 6 flow_started — saved_count_before now carries the real count
date: 2026-06-13
event: step6.flow_started
type: instrumentation-fix
impact: step6.flow_started.saved_count_before changes from a hardcoded 0 to the user's real saved-message count (0/1/2). No schema change; schema_version stays 1. Funnel/cohort splits on this prop were degenerate (all 0) before this; treat pre-2026-06-13 values as unset.
---

## What changed

The A4→A5 forward-wiring chunk (`Step6_A4A5_Wiring_Chunk7.md`) wired
`MessageCreationFlow`'s `flow_started` emit to a real
`savedCountBefore` prop. Previously the orchestrator hardcoded
`saved_count_before: 0` (a stub from when the flow rendered A2 only).

- `src/app/messages/new/page.tsx` now runs a `count(*)` on
  `messages` where `status = 'saved'` for the user and passes it as
  `savedCountBefore` to `MessagesNewPageClient` → `MessageCreationFlow`.
- `step6.flow_started` (catalog event #1) now emits the true
  `saved_count_before` (0, 1, or 2 on the Vault tier).
- The same value drives A3's "last of three" variant
  (`isFinalOfThree = savedCountBefore === 2`) — so the variant and the
  telemetry agree by construction.

## Analysis impact

- `saved_count_before` is now a usable cohort/funnel dimension. Before
  this it was constant 0 — any split on it pre-2026-06-13 is degenerate.
- Dev/`/dev/messages-flow` mounts still send `flow_started` with the
  mock count (the page-level fetch doesn't run there); the 401 in dev is
  swallowed by the `track()` client as before.

No schema change — `saved_count_before` was always in the #1 schema
(`2026-06-01-step6-events.md`); this fills it with the intended value.
