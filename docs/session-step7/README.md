# Session · Step 7 — Memory Shelf build

**Status:** Chunk 1 (data) + Chunk 2 (screen) built and verified; Chunk 3
(formal verify) folded into Chunk 2's Playwright pass. This folder is the
authoritative entry point — a fresh context window should start here.
**Created:** 2026-06-16

**Build log (2026-06-16):**
- Chunk 1 — `GET /api/messages` widened (`played`, `durationSeconds`, `category`,
  plus full `body` for the transcript) via an extracted, unit-tested
  `serializeShelfMessage`. Analytics note dropped. Category enum reconciled (see
  Open decisions below).
- Chunk 2 — `src/components/shelf/*` relocated to
  `src/components/screens/shelf/*` (CLAUDE.md fix); skin rebuilt to mirror the
  prototype on `@theme` tokens (`.shelf-*` block appended to `globals.css`,
  prototype-local effect vars scoped to `.shelf`). Pure props-driven screen +
  `ShelfPageClient` (owns `useResource` + `usePlaybackController`) +
  `/dev/shelf` with an 8-state dev rail. Playback engine extended additively
  with a real `currentTime`/`duration`/`ended` (live element timer, not a faked
  interval). All 8 states verified via Playwright at **390×844 / 4× CPU**.
- **Decision (2026-06-16):** on the empty state the persistent "Memory Shelf"
  header is **suppressed** so it doesn't stack with the empty hero's "Your
  Memory Shelf" title. A deliberate divergence from the prototype (which kept
  the header); the header still shows in loading / error / loaded states.

---

## What this is

Build the Step 7 **Memory Shelf** (revisit saved voice messages) to match the
approved design. The screen exists today as plain placeholder scaffolding; we're
replacing the skin (and fixing its architecture) to mirror the prototype.

## Source of truth (read these first)

1. **Prototype (design SoT):** `prototypes/essence-step7-memory-shelf.html`
   — production mirrors its copy, timing, motion, layout. Its top `NOTE FOR CODE
   ARCHITECT` comment block summarizes every decision.
2. **Handoff + audit:** `docs/Step7_Memory_Shelf_Design_Handoff.md` (revision
   brief + **Appendix A** token/consistency audit, all findings applied to the
   prototype).
3. **Architecture rules:** `CLAUDE.md` (layering, dev pages, chunked work).

## The screen, in one line

Pure, props-driven screen: receives **≤3 message objects + a "currently playing"
state**, emits callbacks (`play(id)`, `pause`, `stop`, `replay`, `createNew`,
`retry`). Lifetime cap is **3** (`STEP6_MAX_SAVED_MESSAGES`). Three = the full,
complete state, not "page 1".

## States to cover (8)

empty(0) / 1 / 2 / 3-full / playing / just-saved / loading / error+retry.
The prototype's dev rail switches all eight.

---

## Build preconditions (dependency order)

### Chunk 1 — Data: widen `GET /api/messages`
- **File:** `src/app/api/messages/route.ts`. Today it returns only
  `id, status, title, bodyExcerpt, recipientName, createdAt`.
- **Add:** `duration` and a `played` boolean. The data is in the DB but not
  exposed — confirm exact column names (`duration`, and `played_count` /
  `last_played_at`); map `played = played_count > 0` (or `last_played_at != null`).
  Also surface `category` (already a column) for the woven caption.
- **Analytics:** exposing play-history is telemetry-adjacent → drop a
  `docs/analytics/YYYY-MM-DD-step7-message-fields.md` note in the same PR
  (schema in `docs/analytics/README.md`).
- **Commits:** extract/refactor first, tests second (separate commits).

### Chunk 2 — Screen
- **Relocate:** move `src/components/shelf/MemoryShelf.tsx` (+ `MessageList.tsx`,
  `usePlaybackController.ts`, `types.ts`) to `src/components/screens/`
  (a `screens/shelf/` subfolder is fine). **This is a CLAUDE.md fix** — screens
  must not live in `src/components/shelf/`. Route `/app/shelf` does not change.
- **Rebuild the skin** to mirror the prototype (tokens, BreathStone, ceremonial
  playback overlay, the 3/3 "Three, kept." state, empty/loading/error). Wire the
  prototype's `:root` to the real `@theme` — do not re-hardcode hex.
- **Keep the existing behavior:** the playback engine in
  `usePlaybackController.ts` (signed-URL fetch, play/pause/stop, audio-error
  retry) and `useResource` fetch/loading/error machinery. Redesign the skin, not
  the plumbing.
- **Add `src/app/dev/shelf/page.tsx`** with mock data (permanent scaffolding —
  CLAUDE.md requires it; it doesn't exist yet).
- **Routes (use the constants, already canonical):**
  - "Create another" → `ROUTES.messagesNew` (`/messages/new`).
  - "See what's coming" (C2) → `ROUTES.messagesWaitlist` (`/messages/waitlist`).

### Chunk 3 — Verify
- Playwright at **4× CPU throttle**, **390×844** sim, across all 8 states.
- Confirm against the prototype: motion timing, the BreathStone breathing on the
  pendulum curve, the warm CTA shadow, flat cards, 3/3 restraint.
- Screenshots to `.tmp/` (gitignored).

---

## Open decisions

- ~~**Category enum mapping.**~~ **Resolved (Chunk 1).** The DB enum and the
  prototype's `CATEGORY_LABEL` keys diverge on three values: DB
  `daily_reminder`/`future_message`/`checking_in` vs prototype
  `daily`/`future`/`checkin` (the other four — birthday, comfort,
  encouragement, holiday — already match). The API now exposes `category` as the
  **raw DB enum value** (no lossy transform in the data layer). **Chunk 2 action:**
  update the screen's `CATEGORY_LABEL` map to key off the DB enum values, i.e.
  `daily_reminder` / `future_message` / `checking_in`.

> Resolved (were open earlier, confirmed in `src/lib/routes.ts`):
> the "create another" route is canonically `/messages/new` (legacy
> `/app/messages/new` retired, FOLLOW_UPS #34); the C2 waitlist target
> `/messages/waitlist` exists.

## Deferred (do NOT expand scope into these)

- Fleet-wide warm-ramp vs `@theme` reconciliation (Appendix A.2c) — a separate
  cross-prototype cleanup, not this build.
- Phase-2 library features (grouping, most-replayed) — only if the 3-cap lifts.
- Optional: card kept-date in italic Spectral to mirror A7 (Appendix A.6).

## Working rules (CLAUDE.md)

One chunk → one review surface → one commit (or small stack). **No commits
without explicit consent.** Extract-then-test as separate commits. Visual
validation required before "done." Throwaway artifacts → `.tmp/`.
