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
