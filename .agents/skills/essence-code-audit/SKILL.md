---
name: essence-code-audit
description: >-
  Use when reviewing a diff, branch, PR, or recently-changed ESSENCE screens
  and routes before a commit or merge. Audits four things against this repo's
  own rules: design-token drift, three-layer spec adherence, the recurring
  Supabase / success-logging bug classes, and the DECISIONS / FOLLOW_UPS
  process locks. Trigger on "audit this", "review my changes", "did this
  follow spec", "check for token drift", "did I introduce bugs", or before
  closing a build pass.
---

# ESSENCE code audit

A guided audit for this repo. It does not invent a generic checklist. It
checks the changed code against the conventions ESSENCE already documents:
`CLAUDE.md` (architecture + collaboration), `docs/DECISIONS.md` (locks),
`src/app/globals.css` `@theme` (canonical tokens), and `docs/FOLLOW_UPS.md`
(the bug ledger). When a finding maps to one of those, cite the source.

The job is to **report**, not to fix. Surface findings with severity and a
fix shape, let the owner decide. Never auto-edit, never stage, never commit.

## How to run

1. **Scope the diff.** Ask what to audit if it is not obvious. Default to the
   working tree plus the current branch against `main`:

   ```bash
   git fetch origin main --quiet
   git diff --stat origin/main...HEAD          # what changed
   git diff origin/main...HEAD                  # the full diff
   git status --short                           # uncommitted work
   ```

   Narrow to the touched files. The audit is about *what this change did*, not
   a whole-repo sweep (the repo already has `docs/REFACTORING_SYSTEM.md` for
   that).

2. **Run the real gates first.** These are fast and catch the mechanical
   problems before you reason about anything:

   ```bash
   npm run typecheck      # tsc --noEmit
   npm run lint           # eslint (incl. no-unchecked-supabase-write) + em-dash guard
   npm run test:unit      # vitest
   ```

   A red gate is a finding. Capture the exact failure, do not paraphrase it.

3. **Walk the four lenses below** over the changed files. For each hit, record
   `file:line`, severity, the rule it breaks, and the fix shape.

4. **Write the report** in the format at the bottom. If the change is UI or
   motion, say explicitly whether you were able to validate it in a browser
   (the repo bar is Playwright at 390x844, 4x CPU throttle) or could not.

The exhaustive grep patterns and command snippets live in
`references/audit-checklist.md`. Pull them in when you need the precise
incantation; this file is the reasoning layer.

## Lens 1: Token drift

Canonical source is the `@theme` block in `src/app/globals.css`. The running
CSS is truth. `docs/design-tokens.md` only *mirrors* it and is allowed to be
stale; if they disagree, the source wins and the mirror is the bug. Inverting
that is the "Step 7 drift trap" called out in CLAUDE.md and the Step 3 build
handoff.

Check:

- **Raw hex or rgba in screen/UI components.** Layer 3 uses `var(--token)`
  only. A literal `#RRGGBB` or `rgba(...)` inside `src/components/screens/` or
  `src/components/ui/` is drift unless it sits under an explicit
  `/* prototype-local: effect values @theme does not define */` comment.
- **`var(--x)` references to tokens that do not exist in `@theme`.** A typo'd
  or invented token name renders as nothing. Cross-check every new `var()` ref
  against the canonical block.
- **New tokens added somewhere other than `@theme` first.** Per the Step 3
  contract, a new token (e.g. `--shimmer-intensity`) lands in the canonical
  `@theme` block before any use, even if it sits at `0` until later.
- **Mirror divergence.** If the change touched colors, diff `@theme` against
  `docs/design-tokens.md`. Known-stale at time of writing: the mirror's
  `--color-bg-warm-1` / `--color-bg-warm-2` hexes and "Last synced" date lag
  the source. Flag divergence; the fix is to regenerate the mirror, never to
  edit `@theme` to match it.
- **Banned motion primitives.** No `filter: brightness()`. `var(--ease-breath)`
  is Stone-only and must not touch the vault or shimmer.

There is precedent for a mechanical version of this in
`scripts/step6-token-sweep.mjs` (diffs prototype `:root` blocks vs `@theme`).
Reuse its approach when auditing a prototype-to-production port.

## Lens 2: Spec / three-layer adherence

From CLAUDE.md. These are load-bearing, not style preferences.

- **Screens never import Supabase, `fetch`, `redirect`, or a server action.**
  A `from "@/lib/supabase/..."` (or a fetch) inside `src/components/screens/`
  means data-fetching leaked out of the page. It belongs in the `page.tsx`.
- **`page.tsx` files stay thin.** Fetch, check auth, redirect, render one
  screen with props. No business branching inside JSX. Growing JSX branches in
  a page is a signal the logic belongs in the screen.
- **Screen actions bubble out via callback props.** The page owns side effects.
- **URLs never change during a redesign.** Renaming a route, or repointing one,
  is a backend change and a DECISIONS concern, not a UI tweak. Catch route
  renames in the diff specifically.
- **Every screen has a `/dev/{name}` page.** If the change adds a screen under
  `src/components/screens/`, there must be a matching `src/app/dev/{name}/`
  rendering it with mock data. These are permanent; deleting one is a finding.
- **Sidecar convention.** Reducers/types/phases sit beside the screen with the
  role suffix (`RecordScreen.reducer.ts`, `FirstBreathSequence.phases.ts`).
  Reusable primitives go in `src/lib/<domain>/`, not in `screens/`.
- **Prototype is the design source of truth** for onboarding, voice-recording,
  vault, first-breath, and Step 3. Production motion mirrors prototype timing,
  cadence, copy, and curves. New motion grammar invented in production, when a
  prototype exists, is a finding (the prototype is wrong only by an explicit
  decision memo).

## Lens 3: Bug classes this repo actually hits

These are the recurring failures from `docs/FOLLOW_UPS.md`. They are subtle
because the code looks like it succeeded.

- **Unchecked Supabase write (the big one).** A `.insert/.update/.upsert/
  .delete` on a `.from(...)` chain whose result is discarded. Supabase reports
  failure through the returned `{ error }`, it does not throw, so a bare
  awaited write silently swallows the failure and the route reports success
  while the row never changed. This is FOLLOW_UPS #42/#43/#44/#45/#46/#61/#62/
  #63/#64. The ESLint rule `no-unchecked-supabase-write` catches the discard
  shape, but confirm intent: every write should either destructure and check
  `{ error }`, route through `checkedWrite(...)` (throws on failure), or route
  through `bestEffortWrite(...)` (deliberately logs and swallows). All three
  live in `src/lib/supabase/checked-write.ts`.
- **Success logged before the fallible work.** Usage/analytics/"ready" recorded
  *above* the operation that can still fail (sign a URL, write a row, render a
  voice). FOLLOW_UPS #45/#43. The record must sit below the work it claims.
- **Reported "ready" without verifying the DB write.** A voice/generation
  marked ready while the profile row stays `processing` because the persist was
  never confirmed. FOLLOW_UPS #43/#66. Confirm the status write is checked.
- **Per-device state masquerading as per-lifetime.** A `localStorage` latch
  used for a "once ever" ceremony is per-device, not per-account. FOLLOW_UPS
  #54 replaced one with a durable profiles column. Flag new localStorage used
  for anything that should be server-durable.
- **Silent save failure on a user-entered form.** Onboarding/profile completion
  that swallows a failed save loses the user's data with no retry surface.
  FOLLOW_UPS #42/#57.
- **Orphaned route still spending money.** A creation route left unreachable by
  a refactor but still callable, still hitting ElevenLabs with no cost cap.
  FOLLOW_UPS #59/#60. Flag dead `/api/*` POSTs introduced or left behind.

## Lens 4: Process locks and ledger hygiene

- **DECISIONS locks are ask-before-violating.** From `docs/DECISIONS.md`:
  ElevenLabs/service-role keys are server-only (files touching them begin with
  `import "server-only"`, client never calls third parties directly), SQL
  direct with no ORM, synchronous processing for MVP, audio never stored in the
  DB (paths only), messages immutable, URL stability, MVP scope holds. If the
  change appears to cross a lock, stop and call it out as a blocker, do not
  rationalize around it.
- **No silent TODOs.** An in-code `// TODO` without a numbered `FOLLOW_UPS.md`
  entry (file:line, *Why it matters*, *Fix shape*, *Pick up when*) is a finding.
- **Telemetry changes need a note.** A change to analytics events should drop a
  `docs/analytics/YYYY-MM-DD-slug.md` in the same change. Flag a missing one.
- **No em dashes in prompt copy.** Banned in `line:` strings (the
  `check-em-dashes.mjs` guard covers `src/lib/voice-training/script.ts`). If new
  copy lives elsewhere, eyeball it for the same rule.

## Output format

Group findings by lens. Lead with a one-line verdict and the gate results.

```
## Audit: <branch or diff range>

Verdict: <clean | N findings, M blocking>
Gates: typecheck <pass/fail> · lint <pass/fail> · unit <pass/fail>
UI validated in browser: <yes @ 390x844 4x | no, reason>

### Blockers (do not merge)
- [Lens N] <file>:<line>, <what's wrong>. Rule: <CLAUDE.md / DECISIONS / FU #>.
  Fix: <shape of the fix>.

### Findings
- [Lens N] <file>:<line>, <finding>. Fix: <shape>. (FOLLOW_UPS entry? yes/no)

### Notes / nits
- <minor, non-blocking>
```

Severity guide: a crossed DECISIONS lock or an unchecked write on a real user
path is **blocking**. Token drift, a missing `/dev` page, or a missing
FOLLOW_UPS entry is a **finding**. Cosmetic or stylistic items are **nits**.

## Rules of engagement

- Report only. Do not edit, stage, or commit. Proposing the fix in words is the
  deliverable; the owner applies it.
- Quote real failures verbatim (gate output, the offending line). Do not assert
  a file is clean you did not open.
- For any UI/motion finding, state plainly whether you verified in a browser or
  could not in this environment. Do not claim visual success you did not see.
- When a finding is genuine tech debt rather than a fix-now item, draft the
  `FOLLOW_UPS.md` entry in the report so it can be pasted in.
