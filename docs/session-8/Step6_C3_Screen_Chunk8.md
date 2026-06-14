# Step 6 · C3 Vault Limit Reached — Chunk 8

**Date:** 2026-06-14
**Scope (agreed):** Build the first of the three boundary ("ceiling") screens,
C3 Vault Limit Reached — the screen a capped (3/3 saved) user lands on when
they try to create a 4th. Closes the live dead-route: until now the `/save`
race-403 and (absent) A2-entry gate routed capped users to Home with no
ceiling moment. Full design loop (prototype → architect review → wiring →
live-verify → commit), C3 first; C2 then C1 follow.

## Design source
`prototypes/message creation/essence-step6-pass2-c-screens.html`, the `c3`
frame. Tone: "the calmest of the three — a gentle fact, not an event."
Value-add stewardship, never scarcity (see the prototype's DO-NOT-ADD list:
no countdowns, no upgrade CTAs, no save-offer language).

## Decisions taken

1. **Markup over the stale NOTE header (CTA assignment).** The prototype's
   architect-note header says C3 primary = "See what's coming", but the
   actual `c3` markup has primary = **"Visit your Memory Shelf"** (→ shelf)
   and demotes "See what's coming" to the secondary link (→ C2). The markup
   is the more refined intent; the build mirrors it.
2. **Ported CSS-gradient archive stone, not the canvas BreathStone.** A7's
   precedent uses the shared canvas BreathStone because its stone *breathes*
   (the engine's whole value is live animation). C3's stone is "archive" —
   static, no motion. The canvas engine's `archive` target renders **cool**
   (`colorTemp: -0.1`), contradicting the prototype's explicit "warm amber
   family, dialed down, at rest." For a static stone the canvas buys nothing,
   so C3 ports the prototype's warm-amber gradient verbatim. Justified
   divergence from the A7 "use the canvas" precedent.
3. **"See what's coming" → Home interim.** C2 Waitlist isn't built yet;
   the link lands on Home, mirroring the A7 "See what's coming" precedent
   (FOLLOW_UPS #52). One-line repoint when C2 lands.
4. **Cap gate semantics.** A2-entry (`/messages/new`) redirects 3/3 users to
   `/messages/limit?from=a2_entry`; the `/save` race-403 pushes to
   `?from=save_race`. The limit page guards the complement — under-cap users
   are redirected to `/messages/new` — so the two pages can't loop (exact
   complements on the same count).

## What shipped

- **`VaultLimitScreen.tsx` / `.css.ts` / `.types.ts`** — pure, props-driven
  C3 screen. Cream field + static warm wash, archive stone, staggered copy
  reveals (eyebrow 700 / title 900 / aside 1100ms) + footer (primary 1300 /
  link 1500ms), primary-CTA auto-focus at 1400ms, full reduced-motion
  collapse. Two callback props (`onVisitShelf`, `onSeeWhatsComing`).
- **`/messages/limit/page.tsx` + `VaultLimitPageClient.tsx`** — thin
  data-shuttle (auth, cap-confirm guard, `surfaced_from` from `?from`) +
  client wrapper that owns nav and fires `step6.vault_limit_blocked` once on
  mount (StrictMode-guarded), then clears the flow.
- **`/dev/messages-limit`** — permanent dev sandbox (replay + mocked CTAs).
- **`/messages/new/page.tsx`** — Q4 cap gate now live: 3/3 → C3 before the
  flow starts (was a TODO note).
- **`PreviewRefinePageClient.tsx`** — `vault_limit_reached` save-403 now
  `router.push`es to C3 (`?from=save_race`) instead of `exitFlow(Home)`. Push
  (not exitFlow) preserves `flow_id` into C3 so the block correlates to the
  flow it ended; C3 clears it after emitting.
- **`routes.ts`** — `messagesLimit: "/messages/limit"`.
- **Docs** — FOLLOW_UPS #38 C3 sub-item resolved + #52 added (C2 interim);
  analytics note `2026-06-14-step6-vault-limit-blocked-live.md` (event #13
  goes live).

## Architect review (general-purpose design-architect pass)
Returned **no P1**. Confirmed fidelity (copy/timings/stone gradient byte-match
the `c3` frame), the no-loop proof on the gate↔guard seam, the push/flow_id
save-race handoff, and the StrictMode latch. Two P2 craft notes (aria-live +
auto-focus inherited from A7 may read "ceremonial" for a "state" screen) —
**both are explicitly prototype-specified** (NOTE header lines 88 & 91:
"C1/C3: role=status + aria-live=polite"; "Primary button receives focus after
entrance completes"), so kept per the prototype-is-truth rule. Two P3
comment-only items (stone-size token, btn-shadow divergence) applied.

## Verification

**Dev-page (390×844, live):**
- Visual: warm archive stone, "Your Vault" / "Three messages, kept." / aside,
  primary "Visit your Memory Shelf" + secondary "See what's coming" link —
  matches the `c3` frame. (Secondary sits just below the fold in the sandbox
  only — the dev rail's top padding; production renders full-bleed.)
- Entrance animates at real timing: `prefers-reduced-motion` confirmed
  **false** (screenshots are the true animated path), title opacity stepped
  `0.00 (t50) → 0.00 (t600) → 0.77 (t1300)` across its 900ms delay + fade.
- A11y tree: `status` region wrapping eyebrow/h1/aside (stone aria-hidden,
  correctly absent), `<h1>` level 1, both buttons, primary `[active]` (1400ms
  auto-focus landed).
- Console clean (0 errors / 0 warnings).

**Live seam walk (real backend, authenticated test user) — A2-entry path proven:**
- Seeded the test user to 3/3 saved (service-role, tagged rows; torn down
  after). Authenticated via `/dev/test-auth`, navigated to `/messages/new`
  → **server-redirected to `/messages/limit?from=a2_entry`**; C3 rendered
  full-bleed (both CTAs fit cleanly — the earlier below-fold was the dev rail
  only).
- Asserted `usage_events`: exactly one `step6.vault_limit_blocked`,
  `surfaced_from=a2_entry`, `flow_id=null` (correct — no active flow on the
  entry path), timestamped to the redirect. Console clean.

**Not done this chunk (honest gaps):**
- **Save-race path (`?from=save_race`)** — not live-walked (needs a mid-flow
  concurrent-save 403, a multi-tab race). Verified by code + architect review
  (correct push/flow_id handoff); it differs from the proven A2-entry path
  only in the `from` value and push-vs-redirect mechanism.
- **Reduced-motion live capture** — couldn't force the media query through
  the Playwright MCP (no exposed `emulateMedia`). Verified by inspection: the
  `@media (prefers-reduced-motion: reduce)` block zeroes animation/opacity/
  transform with the same pattern as the live-proven A7.
- **4× CPU throttle run** — no CDP CPU-throttle API exposed via the MCP. C3's
  entrance is pure CSS compositor-only motion (opacity/transform), GPU-cheap
  by construction and not CPU-bound, so the 4× bar (which stresses JS/layout
  motion) is low-risk here. Stated rather than claimed.

**Gates:** `tsc` ✅ · eslint ✅ · unit 181/181 ✅.

## Next on the spine
- **C2 Waitlist** (`/messages/waitlist`) — repoints C3's "See what's coming"
  (FOLLOW_UPS #52) and the C1 primary.
- **C1 Three Shaped** — the `?ceremony=three-shaped` overlay on A7; repoints
  A7's `third` "See what's coming" (FOLLOW_UPS #38, last open sub-item).
