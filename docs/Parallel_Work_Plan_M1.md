# Parallel Work Plan — alongside M1 (Memory Shelf)

**Date:** 2026-06-16
**Purpose:** Run 3 coding agents in parallel with the M1 Memory Shelf build,
on **disjoint file scopes** so they speed things up instead of colliding.
Each agent section below is self-contained — paste it as that agent's brief.

## How to use this
- **One agent → one branch → one PR.** Branch names are given per section.
- The scopes are **non-overlapping by design.** Each brief lists "Owns" (its
  files) and "Do NOT touch" (other agents' territory). Hold those lines.
- Merge PRs independently as they land — no ordering dependency between them.
- **The one shared-file caveat:** `docs/FOLLOW_UPS.md` (and this doc) may be
  edited by more than one agent to mark its own item resolved. Tell each agent
  to edit **only its own entry/line** — git will auto-merge non-adjacent line
  changes; any conflict is trivial.

## Boundary map (who owns what)
| Stream | Owns (don't let others in) |
|---|---|
| **M1 Memory Shelf** (you) | `src/components/shelf/*` → `src/components/screens/`, `GET /api/messages`, `src/app/app/shelf/`, `src/app/dev/shelf/` |
| **Agent 1 — Analytics** | `src/lib/analytics/*`, `docs/analytics/*`, journey-event call sites at onboarding / subscribe-success / voice-ready / retention |
| **Agent 2 — Stripe hardening** | `src/lib/subscription/*`, `src/app/api/stripe/*`, `src/app/app/vault/restore*`, related tests |
| **Agent 3 — #54 ceremony flag** | new `supabase/migrations/*` file, `src/app/messages/saved/[messageId]/page.tsx` + `ThreeShapedPageClient.tsx`, optional stamp endpoint |

All three parallel agents are **design-free** (no prototype needed) — they can
start immediately.

---

## Agent 1 — Analytics & validation instrumentation ⭐

**Mission.** V1's whole job is to prove the bet: *people pay $12.99/mo and
retain.* Wire the cross-journey funnel so that's measurable end-to-end. Today
only the Step 6 (message-creation) events exist; the rest of the journey is
dark.

**Context (grounded).**
- Events flow through `src/lib/analytics/client.ts` `track()` → `POST
  /api/analytics` → `usage_events` table. Step 6 has a typed wrapper,
  `src/lib/analytics/step6.ts`, and a catalog at
  `docs/analytics/2026-06-01-step6-events.md` (the house format).
- The funnel that's missing: **signup/onboarding complete → subscribe (trial
  start / active) → voice ready → [message create→save: already instrumented]
  → return / retention.**

**Build.**
1. Define the journey-funnel events (mirror the Step 6 catalog's naming +
   schema discipline; no PII). Write a `docs/analytics/YYYY-MM-DD-*.md` note.
2. Fire them at the journey anchors: onboarding completion
   (`src/app/onboarding/OnboardingPageClient.tsx`), the subscribe-success
   landing (client-side, on the post-checkout redirect — **not** inside the
   Stripe API routes; those are Agent 2's), voice-profile-ready, and a
   return/retention signal.
3. A short "how to read the funnel" section in the note (the queries that
   answer "did they pay? did they come back?").

**Owns:** `src/lib/analytics/*`, `docs/analytics/*`, and event-fire lines at the
named client/page anchors.
**Do NOT touch:** the shelf, the Step 6 message-flow files (already
instrumented), `src/lib/subscription/*` or `src/app/api/stripe/*` (Agent 2), the
ceremony/saved files (Agent 3).
**Done when:** the funnel signup→pay→create→save→return is queryable in
`usage_events`, documented in an analytics note. `tsc`/eslint/tests green.
**Branch:** `feat/analytics-funnel`

---

## Agent 2 — Stripe subscription hardening

**Mission.** The revenue path must be bulletproof before launch. Harden the
full subscription lifecycle and its edge cases, with tests.

**Context (grounded).**
- Access is read through one abstraction: `src/lib/subscription/get-status.ts`
  (`getSubscriptionStatus()` over a `subscriptions` table) — gates across the
  app already use it. Keep that the single source of truth.
- Stripe surface: `src/app/api/stripe/webhook/route.ts` + `handlers.ts`,
  `create-checkout-session/route.ts`, `portal-session/route.ts`. Lapse/restore
  groundwork exists from session-7c (`docs/session-7c/`).

**Build.**
1. Verify + harden every transition: **trial → active → past_due/lapse →
   restore → cancel.** Make sure `subscriptions` (and thus access) lands in the
   right state for each Stripe webhook event.
2. Webhook **idempotency** + out-of-order/duplicate event safety; signature
   verification; failure logging.
3. Tests covering the transitions (extend the existing unit suite; mock Stripe
   webhooks). If feasible, a Stripe test-mode walk.

**Owns:** `src/lib/subscription/*`, `src/app/api/stripe/*`,
`src/app/app/vault/restore*`, the subscription tests.
**Do NOT touch:** the shelf, `src/lib/analytics/*` (Agent 1 — and do not add
analytics fires in the Stripe routes; Agent 1 fires subscription events
client-side), the ceremony/saved files (Agent 3).
**Done when:** the lifecycle is verified end-to-end with tests green; webhook
handling is idempotent and signature-checked.
**Branch:** `feat/stripe-hardening`

---

## Agent 3 — #54 durable C1 ceremony flag

**Mission.** Replace the C1 "Three Shaped" ceremony's per-device `localStorage`
latch with a **durable, server-side, once-per-lifetime** flag — now possible
because `db push` works again (#30 fixed).

**Context (grounded).**
- Today: `src/app/messages/saved/[messageId]/ThreeShapedPageClient.tsx` uses a
  `localStorage` key (`step6.three_shaped_seen`); the A7 page
  (`…/saved/[messageId]/page.tsx`) branches to the ceremony when
  `?ceremony=three-shaped` + the user is at the 3/3 cap. See FOLLOW_UPS #54 for
  the full rationale and why the latch was the V1 stopgap.
- `db push` is now clean ("Remote database is up to date") — this is also a
  good first real exercise of the repaired migration pipeline.

**Build.**
1. New tracked migration: add a nullable `profiles.three_shaped_ceremony_seen_at
   timestamptz` (additive, low-risk). Use a unique 14-digit version filename.
2. The A7 `page.tsx` reads that column server-side to decide the C1 branch
   (instead of relying on the client latch).
3. Stamp it server-side on first show — a small server action or endpoint that
   sets `seen_at` once; keep the localStorage latch only as an optional
   same-device fast-path (or remove it).
4. **Apply the migration carefully:** `supabase db push --dry-run` first, then
   confirm with the owner before the real `db push` (it writes to production —
   additive + nullable, so low-risk, but owner-gate the write).

**Owns:** the new `supabase/migrations/*` file, `src/app/messages/saved/
[messageId]/page.tsx` + `ThreeShapedPageClient.tsx`, an optional stamp endpoint.
**Do NOT touch:** the shelf, analytics, subscription/Stripe.
**Done when:** the ceremony shows exactly once per user, server-durable and
cross-device; migration applies cleanly; FOLLOW_UPS #54 marked resolved.
**Branch:** `feat/durable-ceremony-flag-54`

---

## Not in this batch (and why)
- **Design-gated screens** — Home B (8), Card Capture (3), Settings (9): need
  the design architect's prototypes first. Queue those designs now so there's
  build-ready work when these agents free up.
- **Cross-cutting polish** (mobile responsiveness, per-flow error states):
  touches every screen → would collide with everyone. Save for M4.

## Lower-risk swaps for Agent 3 (if you'd rather)
- **#56 — category-aware A4 note copy** (single file: `PersonalNoteScreen.tsx`;
  per-category example/question). Tiny, fully isolated.
- **Test-coverage hardening** (new test files only) — e.g. route-level tests
  for the message + stripe endpoints.
