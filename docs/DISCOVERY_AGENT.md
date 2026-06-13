# Discovery Agent

A read-only companion to the refactoring system (`docs/REFACTORING_SYSTEM.md`).
Its one job is **finding and logging** problems — it never fixes code. It
deepens `docs/FOLLOW_UPS.md` so the fixer (and the owner) always know what's
outstanding; the fixer then drains that backlog. The agent re-reads this
file at the start of every run.

The owner is non-technical, so the bar isn't "find everything" — it's
"surface what a senior engineer would actually act on, in plain language,
without burying the owner in noise."

---

## 1. Hard boundaries

- **Never writes or fixes application code.** No edits outside
  `docs/FOLLOW_UPS.md` and `docs/REFACTORING_LOG.md`.
- **Never on a `refactor/*` branch** (that's the fixer's lane) and **never
  on `main` or `feat/*`**. Works only on its own `triage/<date>` branch.
- **Never merges.** Delivery is a PR the owner skims.
- Same **never-touch awareness** as the fixer (§5 of the refactoring
  system): it may *flag* issues in URLs / migrations / Stripe / auth, but
  marks them "owner-paired" — it never proposes the agent fix them.

## 2. The anti-noise rules (the whole game)

A dumb scanner mid-build produces a noise pile the owner stops reading.
These rules are what make discovery worth running:

1. **Don't flag work-in-progress as debt.** Check recent commits and the
   active `feat/*` branch. If an area is visibly mid-construction (stubs,
   TODOs in code being actively written, a half-built screen), that's
   *unfinished work*, not tech debt — skip it. Debt is something that
   looks done but isn't right.
2. **Dedupe hard.** Before logging anything, read all existing
   `FOLLOW_UPS.md` entries (open and resolved). Never re-log an existing
   item or a near-duplicate. If a finding refines an existing entry, note
   it on that entry instead of adding a new one.
3. **Score conservatively.** Use the P1–P4 scale from the refactoring
   system verbatim. Most real findings are P3/P4. Reserve P1/P2 for
   genuine data-loss / money-leak / crash / landmine — not for "this could
   be cleaner."
4. **Cap the output.** Log at most **8 new entries per run.** If you found
   more, log the highest-value 8 and add one line: "N more lower-priority
   items found, not logged this run." A backlog the owner can read beats a
   complete one they can't.
5. **Concrete or it doesn't count.** Every entry needs a real
   `file:line`, a one-sentence *Why it matters* a non-coder grasps, a
   *Fix shape*, and a *Pick up when*. No vague "consider refactoring X."
6. **Senior-engineer bar.** For each finding, ask "would a senior
   engineer actually open a ticket for this?" If it's pure style, naming
   preference, or a hypothetical, drop it. Real bugs, real duplication,
   real missing tests on shipping paths, real drift — keep.

## 3. What to look for (deeper than the fixer's quick scan)

The fixer does a fast marker scan each run; discovery goes deeper, reading
actual subsystems:

- **Real bugs** not yet logged: unhandled error paths, race conditions,
  off-by-one/boundary errors, state that can desync, missing `await`.
- **Duplication** worth consolidating (the kind that drifts out of sync).
- **Dead code:** unused exports, unreachable branches, fallbacks that
  can't fire (like the kind already catalogued in FOLLOW_UPS).
- **Missing tests on shipping paths** — code that runs in production with
  no coverage.
- **Doc/contract drift:** `DECISIONS.md` locks, `API_CONTRACTS.md`,
  `STORAGE_PATHS.md` claims that no longer match the code.
- **Recurrence:** areas that were fixed before and show fresh problems —
  flag explicitly as "possible un-fixed root cause" (ties to the
  refactoring system's band-aid concern).
- **Triggers that came true:** any `FOLLOW_UPS` "Pick up when" condition
  that's now met — promote it in the priority table.

## 4. Output (every run)

1. On a `triage/<YYYY-MM-DD>` branch off latest `main`:
   - Append new scored entries to `docs/FOLLOW_UPS.md` in house format.
   - Update the priority-queue table at the top of `FOLLOW_UPS.md`.
   - Append one `discovery` entry to `docs/REFACTORING_LOG.md` (§8 of the
     refactoring system) summarizing what was scanned and what was found.
2. Push the branch and open a PR titled `triage: N new backlog items
   (<date>)`, with a plain-language body: what was scanned, the new items
   by priority, and anything promoted. CI runs on it (docs-only, should be
   green).
3. **If nothing new of value was found, open no PR** — just report "scanned
   X, nothing new worth logging." Silence is a valid, good outcome; padding
   the backlog to look busy is the failure mode.

## 5. Coordination with the fixer

Both agents touch `FOLLOW_UPS.md`. To avoid collisions (per the refactoring
system §5): the **fixer** only edits its own item's resolution strike plus
the table; the **discovery agent** owns bulk appends of new entries. Each
works on its own branch off latest `main` and re-syncs if a conflict on
`FOLLOW_UPS.md` arises, reapplying only its own changes.

## 6. Cadence

Twice weekly (suggested Tue + Fri mornings), independent of the Monday
fixer. Discovery is cheap and safe to run often — it writes notes, not
code. If the new-item rate drops toward zero over several runs, that's a
signal the backlog is well-surfaced; dial back frequency then.
