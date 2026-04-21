# Essence 2.0 — architectural ground rules

These are load-bearing. Read them before placing new files, proposing
refactors, or wiring imports. When in doubt, ask before violating.

## Three-layer separation — do not leak

The codebase has three layers. They do not import across the wrong
boundary:

1. **Backend** — Supabase, `src/app/api/*`, `middleware.ts`, DB schema,
   URL paths. URLs are backend. **Never rename them during redesign.**
2. **Page files** — `page.tsx` files under `src/app/`. Thin data-shuttles
   only: fetch, check auth, redirect, render the screen component with
   props. No JSX logic beyond the single screen render. No business
   branching inside JSX.
3. **UI** — `src/components/screens/`, `src/components/ui/`, `@theme`
   tokens. All visual iteration happens here.

### Rules that fall out of the layering

- **Screen components live in `src/components/screens/`.** Never in
  `src/app/<route>/`. A page.tsx imports its screen from
  `@/components/screens/…`, not from a sibling file.
- **Screens receive data via props. Screens never import Supabase.**
  Data-fetching belongs in the page.tsx.
- **Screen actions bubble out via callback props** to the page.tsx. The
  page owns server actions, router pushes, and side effects.
- **Every screen gets a `/dev/{name}` page** under `src/app/dev/` that
  renders it with mock data. These are permanent — never delete them,
  even if unused by any QA flow. They are the canonical way to iterate
  on a screen in isolation.

### Sidecar file convention (inside `src/components/screens/`)

Role-suffix sidecars, flat at the screens directory or inside a
subfolder for multi-screen flows:

- `RecordScreen.tsx` + `RecordScreen.reducer.ts` + `RecordScreen.types.ts`
- `FirstBreathSequence.tsx` + `FirstBreathSequence.phases.ts`
- `onboarding/Screen2.tsx` … `onboarding/Screen11.tsx` + `onboarding/chrome.tsx`

Generic primitives (hooks, utilities usable by multiple screens) belong
in `src/lib/animation/`, `src/lib/config/`, etc. — not in
`src/components/screens/`.

## Mechanical check before creating or moving a file

When creating or moving a component, ask:

- Does this file import Supabase, `redirect`, or a server action? → it
  belongs in a page.tsx, not a screen.
- Is this a screen (full-route UI)? → `src/components/screens/`.
- Is this a primitive reusable across screens? → `src/lib/<domain>/`.
- Is this page-local glue (auth check, redirect, data fetch)? →
  page.tsx, and keep it thin.

If a page.tsx starts growing JSX branches, that's a signal the logic
belongs in the screen component. If a screen grows an `import
"@/lib/supabase/..."`, that's a signal the fetch belongs in the page.

## Writing new screens

1. Create `src/components/screens/NewScreen.tsx` (pure, props-driven).
2. Create `src/app/<route>/page.tsx` — fetch, render `<NewScreen … />`.
3. Create `src/app/dev/<name>/page.tsx` — render `<NewScreen … />` with
   mock data. Do this even if the screen is trivial.

## Non-negotiables

- URL paths never change during a redesign. Rename components and
  screens all you want; the route stays.
- `/dev/{name}` pages are permanent scaffolding. If a screen exists,
  its dev page exists.

## How we work together

These are process rules — how to collaborate inside this repo, not
where to put files. They're as load-bearing as the architectural
rules. Re-read them whenever a chunk is about to ship.

### Commits and remote state

- **Never commit without explicit consent.** Staging, linting,
  type-checking, running tests — all fine to do unprompted. `git commit`
  waits for a go-ahead every time. Same for `git push`,
  `gh pr create`, and any action that changes state outside the working
  tree. Consent is scoped to that one action; "yes, commit" does not
  mean "yes, push."
- **Never `--amend`, `--no-verify`, or force-push** without an explicit
  ask. If a pre-commit hook fails, fix the underlying issue and create
  a new commit — don't amend to paper over it.

### Chunked work

- **Non-trivial features ship in named chunks** (e.g. onboarding
  `Bucket B1/B2/B3`, session `Chunk 1/2/3`). One chunk → one review
  surface → one commit (or a small stack). Don't silently widen scope
  mid-chunk; if the scope needs to grow, call it out and re-agree.
- **Session docs live alongside the work.** Non-trivial sessions get a
  `docs/session-<id>/` folder with the brief, decision memos, and a
  manual test plan. Created *during* the work, not retroactively.

### Verification before "done"

- **Visual validation is required for UI/motion work.** Before
  declaring any UI change complete, open it in a real browser via
  Playwright MCP, interact with the flow, and confirm it matches
  intent. If verification isn't possible in the current environment,
  say so explicitly rather than claiming success.
- **4× CPU throttle on mobile sim is the shippability bar for motion.**
  Use `scripts/throttle-dev.mjs` or Playwright CDP throttling. If
  motion feels off at 4× on a simulated mobile viewport, it will feel
  off on a real mid-range Android at 1×.
- **Senior-designer bar on UI/motion.** Propose the polished version
  proactively — don't ship a competent draft and wait for the audit.
  When pushback arrives asking for simplification, argue for what the
  simplification costs before caving; if caving is still wrong, restore
  the craft via a non-compromising path (sibling overlay, GPU-only
  animation) rather than leaving craft on the table.

### Prototypes are the design source of truth

- For onboarding, voice-recording, vault, and first-breath,
  `prototypes/*.html` is authoritative. Production implementations
  mirror prototype timings, cadence, copy, and motion — don't invent
  new motion grammar in production code. When a prototype and
  production diverge, the prototype is wrong only by explicit decision
  memo.

### Deferred work and external docs

- **`docs/FOLLOW_UPS.md` over silent TODOs.** Tech debt surfaced
  incidentally gets a numbered entry with file:line, *Why it matters*,
  *Fix shape*, and *Pick up when*. In-code `// TODO` without a
  corresponding FOLLOW_UPS entry isn't acceptable.
- **Telemetry-impacting changes drop a
  `docs/analytics/YYYY-MM-DD-slug.md` note in the same PR.** See
  `docs/analytics/README.md` for the frontmatter schema. Don't defer —
  analytics decisions are cheap during design, expensive after ship.
- **`docs/DECISIONS.md` locks are ask-before-violating.** URL
  stability, server-only secrets, no ORM, synchronous MVP, message
  immutability, and the rest. If a task seems to require crossing a
  lock, stop and ask — don't code around it.

### Code hygiene

- **Extract, then test, as separate commits.** Pattern across
  `useUploadPipeline`, `useSequenceTimeline`, `RecordScreen.reducer`:
  refactor into a testable unit in one commit, add coverage in the
  next. Don't bundle a large refactor with its tests — the review loop
  suffers.

## Debug / scratch artifacts

Throwaway artifacts — Playwright screenshots, accessibility snapshots,
ad-hoc JSON dumps, anything produced while debugging — go in `/.tmp/`
at the repo root. That path is gitignored. **Never** drop PNGs,
snapshots, or scratch logs at the repo root or under `src/` — they'll
clutter `git status` and leak into commits if anyone stages with
`git add .`.

When calling tools that take a `filename` argument (Playwright MCP,
etc.), always prefix with `.tmp/`:

```
mcp__playwright__browser_take_screenshot({ filename: ".tmp/vault-reveal.png", ... })
```

Clean `.tmp/` whenever it starts feeling noisy — nothing there should
be load-bearing.
