# Step 6 · C1 Three Shaped — Chunk 10 (spine complete)

**Date:** 2026-06-14
**Scope (agreed):** The last C-screen — C1 Three Shaped, the one-time
ceremony after a user saves their 3rd (final) message. A `?ceremony=three-shaped`
overlay on the A7 saved route (not its own route — Open Contracts lock).
Closes the last open A6 exit path (FOLLOW_UPS #38). Full design loop.

## Design source
`prototypes/message creation/essence-step6-pass2-c-screens.html`, the `c1`
frame. Tone: "full ceremonial, inherits A7's amber atmosphere — the larger,
slower moment." No confetti, no scarcity — stewardship.

## Decisions taken (incl. two prototype-divergence memos)

1. **C1 inherits A7's atmosphere.** Same amber gradient, 13s ambient glow,
   vignette, and `infused` canvas BreathStone (size 200) as A7 — C1 is the
   ceremonial peak of the same moment, not a new visual language. The
   atmosphere CSS mirrors `SaveConfirmationScreen.css.ts` near-verbatim,
   including the gold-drift fix (middle gradient stop = `--color-surface-honey`,
   since prod `--color-bg-gold` is the darker #E8D8B3). **Verified A7-parity
   live:** the canvas `infused` stone renders the identical (subtle, warm)
   tone on both /dev/messages-saved and /dev/messages-three-shaped.
2. **DECISION MEMO — trigger model diverges from the prototype.** The prototype
   NOTE says C1 is "triggered from A7 when variant='third' + user taps See
   what's coming." Production instead makes C1 an **automatic one-time overlay
   on the 3rd save** (redirect appends `?ceremony=three-shaped`) and repoints
   A7's `third` "See what's coming" → C2. Rationale: the prototype model would
   never show the ceremony to a user who taps "View on Memory Shelf" instead —
   an automatic post-save overlay guarantees the moment lands once. This is a
   deliberate prototype-is-wrong-by-decision case (CLAUDE.md).
3. **DECISION MEMO — "once per lifetime" is a per-device localStorage latch
   (V1).** The contract says once per *lifetime*, but there's no profile flag
   and migrations are blocked (#30). V1 uses a `localStorage` latch
   (`step6.three_shaped_seen`); per-device, not per-lifetime (cleared store / 2nd
   device can replay — harmless). FOLLOW_UPS #54 tracks the durable profile-flag
   upgrade.
4. **Latch render model.** C1 renders unconditionally; the client `router.replace`s
   to the bare saved route only when the latch was already set (a stale-param
   revisit → normal A7, no replay). Avoids `set-state-in-effect`; SSR/hydration
   safe (localStorage read in effect, not render). Tradeoff: the already-seen
   revisit briefly paints the (slow) ceremony before the soft nav lands on A7 —
   accepted, since that path is rare and the common first-time path never flashes.
5. **No telemetry.** The event catalog has no ceremony event (C1 is silent like
   A7); the `from=c1` attribution surfaces when the user reaches C2.

## What shipped

- **`ThreeShapedScreen.tsx` / `.css.ts` / `.types.ts`** — pure, props-driven C1:
  A7-parity amber atmosphere + `infused` stone, ceremony copy ("Three are
  kept." / aside / reassurance), slow staggered reveals (title 1600 / aside
  2000 / reassurance 2400 / primary 2800 / link 3200ms), primary-CTA focus at
  2900ms, full reduced-motion collapse. `--text-hero` (40px) / `--line-height-hero`
  (1.2) literals (no prod token).
- **A7 page branch** — `/messages/saved/[messageId]/page.tsx` now reads
  `?ceremony`; when `=== "three-shaped"` AND the user is at the cap (`isThird`,
  so the param can't conjure the ceremony early) → renders `ThreeShapedPageClient`,
  else the normal `SaveConfirmationPageClient`.
- **`ThreeShapedPageClient.tsx`** — owns the one-time latch + nav (primary →
  `/messages/waitlist?from=c1`, link → Home).
- **Trigger** — `PreviewRefinePageClient.handleSaved` appends
  `?ceremony=three-shaped` on the 3rd save (`savedCountBefore === 2`; literal
  documented as cap−1, kept client-side because the cap reads a server-only env).
- **`messageSavedRoute(messageId, { ceremony })`** — one-place param construction.
- **A7 repoint** — `third` "See what's coming" → `/messages/waitlist?from=c1`
  (FOLLOW_UPS #38 fully resolved).
- **`/dev/messages-three-shaped`** — permanent sandbox; A7 dev mock copy updated.
- **Docs** — FOLLOW_UPS #38 fully resolved; #54 (durable flag) + #55 (flaky
  test) logged.

## Architect review (general-purpose design-architect pass)
**No P1.** Confirmed: trigger boundary correct (no common-path race — the save
inserts `status=saved` and awaits before the redirect, so A7's count sees the
3rd); latch/replace loop-safe + SSR/hydration-safe; atmosphere/cadence/copy
faithful; a11y complete. Actioned: softened the flash comment to be honest
about the brief ceremony paint on stale-param revisit (P2); documented why the
trigger boundary stays a literal `2` rather than a misleading client-side
`STEP6_LIMITS` import (P3). Noted: stale-`savedCountBefore` multi-tab edge fails
safe (concurrent 3rd save → 403 → C3, never the ceremony).

## Verification

**Dev-page (390×844, live):**
- Renders faithfully — amber field + glow, `infused` stone (A7-parity confirmed
  by side-by-side), "Three are kept." hero + aside + reassurance, both CTAs.
- A11y tree: `status` region wrapping h1 + both paragraphs (stone aria-hidden),
  `<h1>` level 1, primary `[active]` (2900ms focus landed).
- Console clean.

**Live (real backend, authenticated test user, 3/3 seeded):**
- `/messages/saved/[id]?ceremony=three-shaped` (latch clear) → **C1 rendered**
  (`.three-shaped`, "Three are kept."), latch set to `1`.
- Revisit same URL (latch set) → **fell back to normal A7** (`.save-confirm`,
  "third" variant), URL `router.replace`d to the bare route (param stripped).
  The one-time guard works end-to-end.
- Console clean. Seed rows torn down.

**Not done this chunk (honest gaps):**
- **Trigger live-walk** (a real 3rd save appending the param) — verified by code
  + architect review, not walked, because it needs a real generate+save (vendor
  cost, FOLLOW_UPS #53). The overlay/latch (everything after the param) is
  live-proven.
- **Reduced-motion / 4× throttle** — no MCP API to force them; verified by
  inspection (A7-parity reduced-motion block; compositor-only motion).
- **Flaky gate:** `useResource` keyed-refetch test fails intermittently under
  full-suite load (passes isolated; unrelated to C1 — FOLLOW_UPS #55). tsc +
  eslint clean; unit 181/181 on the majority of runs.

## Step 6 spine — COMPLETE
A2 → A3 → A4 → A5 → A6 → A7 + C1/C2/C3 all built, wired, and (except the
real-voice render, #53) verified. Remaining before ship:
- **FOLLOW_UPS #53** — one real-voice render pass (generate + commit), pre-merge.
- Merge the branch (4 chunks: A3, A4→A5, C3, C2, C1) to `main`.
