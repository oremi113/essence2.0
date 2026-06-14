# Step 6 · C2 Waitlist — Chunk 9

**Date:** 2026-06-14
**Scope (agreed):** The second boundary screen — C2 Waitlist ("What we're
building next"), the "look ahead" a capped user reaches from C3. Email opt-in
+ optional V2-feature multi-select → durable join + success confirmation.
Repoints C3's "See what's coming" (FOLLOW_UPS #52). Full design loop.

## Design source
`prototypes/message creation/essence-step6-pass2-c-screens.html`, the `c2` +
`c2-success` frames. Tone: "quieter warm, an announcement not a ceremony.
Value-add stewardship, never scarcity — a look ahead, not a paywall."

## Decisions taken

1. **Feature picks are telemetry-only (owner decision).** The `legacy_waitlist`
   table has no features column and a migration is blocked (#30), so the
   durable row stores email + source; the picks ride
   `step6.waitlist_joined.features_selected`. The multi-select still renders.
   Matches the prototype's own V2 backlog (feature-demand counts in analytics).
2. **Reveal cadence COMPRESSED vs the prototype (architect pass).** The
   prototype reveals the submit button at 2900ms — confirmation-grade timing
   on the C-set's only *interactive* form. Pulled forward to make the CTA
   reachable in ~1.8s (eyebrow 600 / title 800 / subtitle 1000 / features 1300
   / email 1600; submit 1800 / link 1950), keeping the top-down settle order.
   Deliberate prototype divergence (this doc is the decision memo).
3. **Features are `<button aria-pressed>`, not the prototype's hidden
   checkbox + label** — an a11y upgrade (role/name/state announce correctly).
4. **Success stone = canvas BreathStone `shimmer`** (warm, breathes —
   colorTemp 0.2), not a ported gradient. Follows the A7 precedent (breathing
   stone → canvas); the state name matches the prototype's `stone--shimmer`.
   (Contrast C3, where the canvas `archive` renders cool, so it ported the
   gradient.)
5. **Durable `source` attribution.** The page threads `surfaced_from` into the
   POST → the `legacy_waitlist.source` column (was being dropped to the generic
   default; architect P1). Telemetry + DB now carry the same attribution.
6. **Append-only email on re-join.** The table has no client UPDATE policy
   (insert-only by design), so a re-join is idempotent (23505 → 200) and does
   NOT change a stored email even if edited. First email wins. Accepted V1
   tradeoff (changing it needs an UPDATE policy + migration — deferred).

## What shipped

- **`WaitlistScreen.tsx` / `.css.ts` / `.types.ts`** — pure, props-driven
  form (email + 5-feature multi-select) with a local form↔success phase
  machine; real `<form>` (Enter-to-submit), email validation affordance
  (blur hint + `aria-invalid`/`aria-describedby`), submit disabled/loading,
  shimmer-stone success state, full reduced-motion collapse. Feature registry
  is the single source of truth (stable `value` keys for telemetry).
- **`POST /api/messages/waitlist`** (`waitlistJoinSchema`) — inserts one
  `legacy_waitlist` row (email + optional source); idempotent on the
  unique(user_id) 23505 → 200; server client (RLS insert policy suffices, no
  service-role).
- **`/messages/waitlist` page + client** — auth, prefill email from the auth
  user, `surfaced_from` from `?from`; client owns the POST + `waitlist_joined`
  telemetry.
- **`/dev/messages-waitlist`** — sandbox (replay + Fail-submit toggle).
- **C3 repoint** — `VaultLimitPageClient` "See what's coming" → `/messages/
  waitlist?from=c3` (FOLLOW_UPS #52 resolved).
- **routes** — `messagesWaitlist`.
- **Docs** — analytics note (event #12 live), FOLLOW_UPS #52 resolved.

## Architect review (general-purpose design-architect pass)
Headline call: **compress the reveal** (done). Two P1s — make it a real
`<form>` (done) + write `source` to the durable row (done). P2s actioned:
email-validation affordance (done), append-only email-edit documented (route
comment). P3s: hit-targets verified ≥62px; EMAIL_RE duplication left (identical,
defense-in-depth). Architecture confirmed clean (pure screen, thin page,
telemetry in client, RLS reasoning correct, idempotency shape right).

## Verification

**Dev-page (390×844, live):**
- Form renders faithfully (warm field, feature card, prefilled email, footer).
- Multi-select: `aria-pressed` toggles, check fills (svg opacity 0→1), state
  persists across toggles.
- A11y tree: `form "What we're building next."` landmark, `group` for
  features, each feature a `button` with `[pressed]`, email `textbox` labeled.
- Submit → success (canvas shimmer stone + "You're on the list.").
- Email validation: invalid + blur → hint "That doesn't look like an email
  yet." with `aria-invalid=true` + `aria-describedby` wired; submit disabled.
- Fail path: stays on form, "Something slipped on our end. Please try again.",
  button re-enables.
- Console clean (0 errors / 0 warnings).

**Live (real backend, authenticated test user):**
- `/messages/waitlist?from=c3` rendered with the auth email prefilled
  (`playwright@essence-test.local`); selected 2 features; real POST → success.
- Asserted `legacy_waitlist`: one row, **`source=c3`** (attribution threaded).
- Asserted `usage_events`: `step6.waitlist_joined`, **`surfaced_from=c3`**,
  **`features_selected=["scheduling","reminders"]`** (registry order).
- Seed row torn down after.

**Not done this chunk (honest gaps):**
- **Reduced-motion / 4× CPU throttle** — no MCP API to force them; verified by
  inspection (reveals are compositor-only; the reduced-motion block zeroes
  every revealed element, same pattern as A7/C3).
- **Idempotent re-join path** (23505 → 200) — verified by code + architect
  review, not live-walked (would need a second submit by the same user).

**Gates:** `tsc` ✅ · eslint ✅ · unit 181/181 ✅.

## Next on the spine
- **C1 Three Shaped** — the last C-screen: a `?ceremony=three-shaped` overlay
  on A7 (one-time after the 3rd save). Repoints A7's `third` "See what's
  coming" → C1 (FOLLOW_UPS #38, last open sub-item); C1's own primary →
  `/messages/waitlist?from=c1`.
