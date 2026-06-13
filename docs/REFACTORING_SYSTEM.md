# Refactoring System

A standing system for continuously finding and fixing tech debt and bugs
alongside active feature work, run by a scheduled cloud agent and reviewed
by the owner (who is non-technical — every output of this system must be
readable without engineering background).

This document is both the **owner's guide** (how to read reports, what to
approve) and the **agent's operating manual** (what to scan, how to score,
what it may and may not touch). The agent re-reads this file at the start
of every run.

---

## 1. The one-paragraph version

`docs/FOLLOW_UPS.md` is the backlog. On a schedule, an agent **scans** the
codebase for new problems, **scores** everything open on a P1–P4 scale,
**fixes** the top item on an isolated `refactor/*` branch, and **reports**
in plain language: what it found, what it fixed, what needs a human
decision. Nothing merges into `main` without the owner's explicit
approval. The owner's job is a ~15-minute weekly review ritual (§7).

---

## 2. Priority scale (plain language)

Every open item gets exactly one priority. When in doubt, score one level
**higher** — it's cheaper to demote than to discover a P1 late.

| Priority | Means | Examples from this repo's history |
|---|---|---|
| **P1 — Fix now** | Can lose or corrupt user data, crash a live flow, leak money (uncontrolled Stripe/ElevenLabs spend), or a security hole. | The immutability trigger that crashed on every saved-message update (#39, since fixed). Unmetered ElevenLabs invocation (#22's cost-exposure half). |
| **P2 — Fix soon** | A user-visible bug in a main flow, OR a landmine: the next feature built on top of it will break or bake the bug in deeper. | Restore screen dead-ending for lapsed subscribers (#23). Two parallel message-creation routes where one is legacy (#34). |
| **P3 — Fix when near** | Debt that slows or endangers future work but harms no user today: missing tests on shipping paths, dead code, enum drift risk, broken tooling bookkeeping. | Migration history blocking `db push` (#30). Hand-written DB enum unions (#26). `cancel()` landing in `'failed'` (#5). |
| **P4 — Cosmetic** | Polish, style, copy, visual-token drift. Real, but never urgent. | Stone warmth on light grounds (#35). The teal-keyed `--shadow-mineral` token (#40). |

**Two scoring modifiers:**

- **Proximity bump.** If active work (check recent commits + the current
  branch name) is about to touch the same files, bump one level — fixing
  it first is cheaper than fixing it after new code lands on top.
- **Decision-needed flag.** If an item's fix depends on a product choice
  (e.g. "should voice creation require payment?" — #22), it is **not
  fixable by the agent at any priority**. It goes in the report's "Needs
  your decision" section with the options spelled out in plain language.
  The agent never makes product decisions by writing code.

---

## 3. The cycle: Scan → Score → Fix → Report

### Scan (find what's outstanding — including what nobody logged)

In order, cheapest first:

1. **Read the existing backlog.** `docs/FOLLOW_UPS.md` open items, and any
   "Pick up when" trigger that has since come true (e.g. "pick up when
   building A6" — has A6 been built?). Triggers coming true is the #1
   source of newly-urgent items.
2. **Run the health checks.** `npm run typecheck`, `npm run lint`,
   `npm run test:unit`. Any failure on `main` is automatically ≥ P2.
3. **Grep for marker debt.** `TODO`, `FIXME`, `HACK`, `eslint-disable`,
   `@ts-expect-error`, `@ts-ignore` in `src/`. Any in-code TODO without a
   FOLLOW_UPS entry violates house rules — log it as an entry.
4. **Review recent diffs.** Run `/code-review` (medium effort) over the
   last week of commits to `main` for correctness bugs that slipped
   through.
5. **Cross-check docs against reality.** Spot-check that `DECISIONS.md`
   locks and `API_CONTRACTS.md` claims still match the code (drift like
   #28 — audio bucket contract mismatch — is found this way).

New findings become numbered FOLLOW_UPS entries in the house format
(file:line, *Why it matters*, *Fix shape*, *Pick up when*) — discovery is
only real once it's written down.

### Score

Re-score **all** open items each run (priorities rot — proximity changes
weekly). Record the score inline in each FOLLOW_UPS entry heading, e.g.
`### 23. [P2] Customer Portal cannot resurrect…`. Maintain a ranked
summary table at the top of FOLLOW_UPS.md (item #, P-level, one-line
description, fixable-by-agent yes/no).

### Fix (the top fixable item, one per run)

- One item per run, smallest correct fix. No scope creep: if the fix
  reveals an adjacent problem, **log it** as a new entry, don't fix it in
  the same branch.
- Branch name: `refactor/fu-<number>-<slug>` (e.g.
  `refactor/fu-5-cancel-status`).
- Definition of done: typecheck + lint + unit tests pass; new behavior
  has a test where the house "extract, then test" pattern applies; the
  FOLLOW_UPS entry is updated with a `— ✅ RESOLVED <date>` strike
  matching the existing house style **in the same branch**.
- If the fix turns out to be larger than ~2 hours of agent work or
  touches anything in §5's never-touch list: stop, don't half-ship.
  Downgrade to a written plan in the report instead.

### Report

End every run with a report the owner can read in two minutes, in this
order:

1. **Fixed:** what was wrong, in one user-relevant sentence ("Cancelling
   an upload used to leave the app thinking the upload failed; now it
   resets cleanly"), branch name, proof it works (tests run + result).
2. **Needs your decision:** items blocked on product choices, each with
   2–3 options and a recommendation in plain language.
3. **Top 5 next:** the current ranked queue, one line each.
4. **New discoveries:** anything found this run, already logged to
   FOLLOW_UPS.

No jargon in sections 1–2. "The database trigger referenced a dropped
column" is fine in FOLLOW_UPS; the report says "saving-related updates
would have crashed once we built vault management."

---

## 4. Standing consent (what the agent may do without asking)

Granted by the owner on 2026-06-12, scoped **exclusively to this system**:

| Action | Allowed? |
|---|---|
| Edit files, run tests/lint/typecheck | ✅ Anywhere in a `refactor/*` worktree |
| `git commit` | ✅ Only on `refactor/*` branches |
| `git push` | ✅ Only `refactor/*` branches (cloud runs must push to deliver — a pushed branch merges nothing) |
| Update `docs/FOLLOW_UPS.md` priorities/entries | ✅ On the refactor branch |
| Open a PR | ❌ Ask first |
| Merge anything, touch `main` or `feat/*` branches | ❌ Never |
| `--amend`, `--no-verify`, force-push | ❌ Never (house rule) |
| New migrations, deps, or `.env` changes | ❌ Ask first |

This table **narrows** CLAUDE.md's "never commit without explicit
consent" rule for refactor branches only. Everything else in CLAUDE.md
still applies in full.

---

## 5. Safety rails (agent: re-read before every fix)

- **Work in an isolated worktree/checkout, never the owner's working
  copy.** The owner routinely has uncommitted feature work; it is
  untouchable.
- **Branch only from the latest `main`**, never from a feature branch.
- **Never-touch list** (these need an explicit owner conversation, not a
  refactor branch): URL paths (locked), `supabase/migrations/`, Stripe
  webhook logic, auth/middleware, `docs/DECISIONS.md` locks, deleting any
  `/dev/{name}` page, anything `prototypes/*.html` is authoritative for.
- **UI changes need visual verification** (Playwright, 4× CPU throttle
  for motion) per house rules. If the run environment can't do that, the
  fix is limited to non-visual work and the report says so — never claim
  visual verification that didn't happen.
- **Conflict avoidance:** before picking an item, check which files the
  active feature branch touches (`git diff main...<branch> --name-only`
  on the most recent `feat/*` branch). Skip items overlapping those files
  — proximity makes them *higher priority for later*, not safe to grab
  now.

---

## 6. The scheduled run

- **Cadence:** weekly to start (suggested: Monday 06:00, before the work
  week). Increase to 2–3×/week once the review ritual feels easy.
- **The routine's prompt:**

> Read `docs/REFACTORING_SYSTEM.md` and follow it exactly: scan, score,
> fix the single top fixable item on a `refactor/fu-<n>-<slug>` branch,
> push that branch, and produce the owner report in the format §3
> defines. Respect §4 consent limits and §5 safety rails without
> exception. If nothing is fixable this run (all top items need decisions
> or overlap active work), do the scan/score pass only and say so plainly.

- **On-demand runs:** the owner can also open any Claude Code session and
  say *"run the refactoring system"* — same document, same rules, with
  the addition that local runs use `git worktree` for isolation and skip
  the push (the branch is already local).

## 7. The owner's weekly ritual (~15 minutes)

1. Read the report (2 min).
2. For the **Fixed** item: skim the plain-language summary. If it sounds
   right, tell a session: *"review and merge refactor/fu-N"* — the
   session diffs it, re-runs tests, explains anything surprising, and
   merges only on your go-ahead. (You never need to read the diff
   yourself; you need to agree with what it *says it does*.)
3. Answer anything in **Needs your decision** — even "not now" is an
   answer; the agent records it and stops re-asking.
4. Optionally reorder **Top 5 next** ("do #34 before #5") — your call
   always beats the score.

If a fixed branch sits unreviewed for 3+ weeks, the next run flags it
rather than piling up more branches — maximum 3 unmerged refactor
branches at any time.
