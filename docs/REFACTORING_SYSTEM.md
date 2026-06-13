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

- One item per run, smallest **correct** fix. "Smallest" qualifies
  *correct* — it means the least code that addresses the **cause**, never
  the least code that hides the **symptom**. No scope creep: if the fix
  reveals an adjacent problem, **log it** as a new entry, don't fix it in
  the same branch.
- **Skip in-flight work.** Before picking an item, list existing
  `refactor/*` branches (`git branch -r --list 'origin/refactor/*'`). If
  the top item already has an unmerged branch, it is "done pending the
  owner's review" — skip it and take the next fixable item. Never re-fix
  an item that already has an open branch.
- Branch name: `refactor/fu-<number>-<slug>` (e.g.
  `refactor/fu-5-cancel-status`).
- Definition of done: typecheck + lint + unit tests pass; new behavior
  has a test where the house "extract, then test" pattern applies; the
  FOLLOW_UPS entry is updated with a `— ✅ RESOLVED <date>` strike
  matching the existing house style **in the same branch**; the run log
  (§8) gets its entry.
- If the cause can't be named, the fix is larger than ~2 hours of agent
  work, or it touches anything in §5's never-touch list: stop, don't
  half-ship. Downgrade to a written investigation/plan in the report
  instead.

#### Root-cause discipline (no band-aids)

The owner is non-technical and cannot read a diff to tell a real fix from
a patch that merely hides the symptom — so the agent must make its
reasoning visible and must not paper over causes. Non-negotiable:

1. **Name the cause before fixing.** Every fix records, in plain
   language: *symptom → underlying cause → why this change fixes the
   cause, not the symptom.* This goes in the report **and** the run log.
   If the cause cannot be named, the agent may not "fix" it — it writes
   an investigation instead.
2. **Banned moves** (unless explicitly justified in the report as the
   genuine root-cause fix): swallowing or silencing an error;
   adding a guard that hides a `null`/`undefined` without explaining why
   it occurs; loosening or widening a type to make an error disappear;
   adding `eslint-disable` / `@ts-expect-error` / `@ts-ignore` to mute
   rather than fix; adding a retry or timeout to mask a race; and — most
   important — **weakening, skipping, or deleting an existing test to make
   it pass.** Tests assert correct behavior; they are not the obstacle.
3. **Fix the cause or escalate — never a partial patch.** If the true
   cause sits outside safe scope (never-touch list, too large, or needs a
   product decision), STOP and write it up. Shipping a cosmetic patch to
   close the item is the failure mode this rule exists to prevent.
4. **"Fixed" and "worked around" are different words.** If the change is a
   genuine root-cause fix, say "fixed." If it is a deliberate stopgap, say
   "worked around" — loudly — and log a new FOLLOW_UPS entry for the real
   fix. Never call a workaround a fix.
5. **Recurrence is a red flag.** If the item being fixed was previously
   resolved and reopened, or the area has had a prior fix, treat that as a
   sign the earlier attempt band-aided the symptom — find the deeper cause
   this time, and say so in the report.

### Report

End every run with a report the owner can read in two minutes, in this
order:

1. **Fixed (or worked around):** what was wrong in one user-relevant
   sentence ("Cancelling an upload used to leave the app thinking the
   upload failed; now it resets cleanly"), the plain-language root-cause
   line (§3 Root-cause discipline), the branch name and commit ID, and
   proof it works (which checks ran + result). Use the word "fixed" only
   for genuine root-cause fixes; say "worked around" otherwise.
2. **Needs your decision:** items blocked on product choices, each with
   2–3 options and a recommendation in plain language.
3. **Top 5 next:** the current ranked queue, one line each.
4. **New discoveries:** anything found this run, already logged to
   FOLLOW_UPS.

If the run **failed or did nothing** (couldn't install dependencies,
couldn't run the checks, nothing fixable), say so plainly as the first
line — a silent or ambiguous report is worse than "this run accomplished
nothing because X." Never imply coverage that didn't happen.

No jargon in sections 1–2. "The database trigger referenced a dropped
column" is fine in FOLLOW_UPS; the report says "saving-related updates
would have crashed once we built vault management."

The same content is appended to the run log (§8) on the branch, so the
report is durable and not just a transient session message.

---

## 4. Standing consent (what the agent may do without asking)

Granted by the owner on 2026-06-12, scoped **exclusively to this system**:

| Action | Allowed? |
|---|---|
| Edit files, run tests/lint/typecheck | ✅ Anywhere in a `refactor/*` worktree |
| `git commit` | ✅ Only on `refactor/*` branches |
| `git push` | ✅ Only `refactor/*` branches (cloud runs must push to deliver — a pushed branch merges nothing) |
| Update `docs/FOLLOW_UPS.md` priorities/entries | ✅ On the refactor branch |
| Append to `docs/REFACTORING_LOG.md` (the run journal, §8) | ✅ On the refactor branch |
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
- **Honest verification.** Run the checks (`typecheck`, `lint`,
  `test:unit`) and report their *actual* output. If the environment can't
  install dependencies or run them, the fix is **not** done — say the run
  was blocked; never claim a check passed that didn't run. (CI on GitHub
  re-runs these independently on every branch — see §9 — so a false
  "passed" claim gets caught, but don't make it in the first place.)
- **Backlog-file coordination** (matters once the discovery agent also
  runs): the fixer only edits its **own** item's entry in
  `docs/FOLLOW_UPS.md` (the resolution strike) plus the priority table.
  Bulk discovery/append of new entries is the discovery agent's job on its
  own `triage/*` branch. This keeps the two from colliding on the same
  file. If a merge conflict on `FOLLOW_UPS.md` arises anyway, the agent
  re-syncs from latest `main` and reapplies only its own change.

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

---

## 8. The run log (`docs/REFACTORING_LOG.md`)

The backward-looking journal — the answer to *"what did the agent do, and
when?"* when something feels off. `FOLLOW_UPS.md` says what's still
*outstanding*; the run log says what was *done*. Every run appends one
dated entry (newest first) **on its branch**, so the log travels with the
work and lands on `main` when the branch merges.

Each entry carries:

- **Date + run type** (scheduled / on-demand / discovery).
- **Fixed (or worked around):** the item, the plain-language root-cause
  line, the **branch name and commit ID** — this is the
  pickle-recovery line: it ties a change to an exact, revertible commit.
- **Health checks:** what ran (`typecheck` / `lint` / `test:unit`) and the
  result at that moment.
- **Scanned / discovered:** one line each.
- **Merged:** stamped in later, when the owner merges the branch, so the
  log records what actually entered the app and when.

**In a pickle:** find the suspect change in the log, then tell a session
*"revert the change from log entry <date>"* — it reverts that exact
commit cleanly. Because every change is an isolated commit that never
auto-merges, nothing the agent does is unrecoverable; the log just makes
sure you can always *find* the right one.

---

## 9. Independent verification (CI)

GitHub Actions (`.github/workflows/ci.yml`) re-runs `lint`, `typecheck`,
`test:unit`, and `build` on every branch and pull request — independently
of the agent. This is the referee: the agent's "checks pass" claim in its
report is **verified by GitHub**, not taken on trust, which is the
structural backstop against a self-reported false "done" (and against
band-aids that quietly break something else).

- A red ❌ on a `refactor/*` branch means **do not merge** — the fix is
  incomplete regardless of what the report says.
- Recommended (owner, one-time): in GitHub branch-protection for `main`,
  require the CI check to pass before merging. Then even a hurried review
  cannot land broken code on `main`.
