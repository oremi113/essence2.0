# Follow-ups — one file per item

This directory is the **collision-proof** home for follow-up items. Each item is
its own file, so two people filing triage the same week touch different files and
can never fight over a shared number (the failure mode that produced the
2026-07-12 ledger reconciliation).

`INDEX.md` is **generated** from these files — never hand-edit it.

## Adding a follow-up

1. Create `docs/follow-ups/<YYYY-MM-DD>-<slug>.md` — the date is when you found it,
   the slug is a few kebab-case words from the title. The `id` is that filename
   stem. **There is no shared counter to increment**, so this never collides.
2. Fill the front-matter (schema below) and write the body (the `What / Why it
   matters / Fix shape / Pick up when` prose — same shape as before).
3. Run `npm run followups:build` and commit both your file and the updated
   `INDEX.md`. CI (`followups-index`) fails if the index is stale.

## Front-matter schema

```yaml
---
id: 2026-07-10-retry-audio-no-cost-cap   # = filename stem; the stable identifier
legacy_id: 92                            # optional: old FU-NN, for back-references
priority: P1                             # P1 | P2 | P3 | P4
status: open                             # open | decision | resolved | dropped
opened: 2026-07-10                       # ISO date found
resolved:                                # ISO date when resolved, else blank
owner_paired: true                       # optional: needs an owner decision to fix
summary: one-line description shown in the index
---
```

- `status: open` — actionable. `decision` — blocked on an owner choice.
  `resolved` — fixed (kept for history; set `resolved:`). `dropped` — invalidated.
- Referencing an item elsewhere: use its `id` (or the `FU-<legacy_id>` alias for
  older cross-references).

## Relationship to `docs/FOLLOW_UPS.md`

`FOLLOW_UPS.md` remains the **historical archive** for items **1–84** (resolved
history + still-open older items). New items land here as files; older items
migrate here opportunistically when next touched. The full historical split is a
tracked post-launch follow-up (see `2026-07-12-migrate-legacy-followups-to-per-file.md`).
