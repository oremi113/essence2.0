# Follow-ups

Tech-debt and deferred items surfaced during other work. Revisit when touching the related area.

## Priority queue (seed scan 2026-06-12 — see docs/REFACTORING_SYSTEM.md)

Health at scan time: typecheck ✅ · lint ✅ · unit tests 176/176 ✅.
Re-scored every run. "Decision" = blocked on an owner choice, not code.

| # | P | One-liner | Agent-fixable now? |
|---|---|---|---|
| 22 | P2 | Voice creation has zero payment gating — ElevenLabs cost exposure | ❌ decision (gate or not, before launch) |
| 34 | P2 | Two parallel message-creation routes; one is legacy | ✅ RESOLVED 2026-06-16 (M0 — legacy retired) |
| 25 | P2 | First Breath exits to a stub screen — destination undecided | ❌ decision (design choice) |
| 23 | P2 | Lapsed subscribers dead-end on the restore screen | ⚠️ fix is spec'd; needs 2 product confirmations first |
| 24 | P2 | Voice-creation success skips the First Breath ceremony | ⚠️ one-line fix, but hold: overlaps active Step 6 flow work |
| 42 | P2 | Onboarding completion swallows a failed save → user's profile silently lost *(new 2026-06-13)* | ✅ RESOLVED 2026-06-17 (error check + throw shipped; retry-in-place error UI now landed — the deferred sibling) |
| 5 | P3 | Cancelling an upload reads as a failure internally | ✅ RESOLVED (commit 35d7372 — distinct `cancelled` status + AbortError detection; unit-tested) |
| 1 | P3 | Prompt auto-advance lint workaround (ref-during-render) | ✅ |
| 2 | P3 | Failed upload leaves stale internal state between retries | ✅ RESOLVED (commit 35d7372 — catch path calls `resetPipeline()`; unit-tested) |
| 26 | P3 | Generated DB types: only the CI drift-check remains | ✅ |
| 16 | P3 | B2/B3 motion surfaces shipped with no analytics events | ⚠️ needs event-naming input |
| 6 | P3 | Non-square photos will render wrong in the circle | ✅ when photo upload goes fully live |
| 7 | P3 | Photo success is silent for screen-reader users | ✅ (batch with a11y pass) |
| 8 | P3 | Reduced-motion fallback for stone beat + upload ring | ✅ (in B3 scope) |
| 9 | P3 | Going "back" to the photo screen wrongly resets it | ✅ when Screen 10 production build lands |
| 12 | P3 | No way to remove a photo after upload | ❌ decision (settings roadmap) |
| 28 | P3 | Pending-audio bucket differs from the documented contract | ❌ decision (ratify or provision) |
| 30 | P3 | Migration bookkeeping blocks `db push` (schema itself is fine) | ✅ RESOLVED 2026-06-16 (M0 — history reconciled, db push clean) |
| 38 | P3 | A6 exit paths land short (checklist tied to unbuilt screens) | ✅ FULLY RESOLVED (Chunk 10 — C1 + repoint) |
| 53 | P2 | Real ElevenLabs voice render unverified — generate + commit happy path (pre-merge gate) | ✅ VERIFIED 2026-06-14 (both arms, real audio) |
| 54 | P4 | C1 ceremony "once per lifetime" is a localStorage latch (per-device, not per-lifetime) | ✅ RESOLVED 2026-06-16 (durable profiles column; migration applied + verified on remote) |
| 55 | P3 | `useResource` keyed-refetch test is flaky under full-suite load (passes isolated) | ✅ RESOLVED 2026-06-14 (waitFor) |
| 56 | P4 | A4 example placeholder is birthday-flavoured but copy is category-agnostic | ⏳ per-category examples (+ question/subtitle) |
| 52 | P4 | C3 "See what's coming" → Home interim until C2 Waitlist lands | ✅ resolved (Chunk 9 — → C2) |
| 43 | P3 | Voice-creation success doesn't verify its DB write → "ready" reported while profile stays "processing" *(new 2026-06-13)* | ✅ add error check |
| 44 | P3 | Checkout customer-id save unchecked → duplicate Stripe customers on retry *(new 2026-06-13)* | ✅ owner-paired (Stripe) |
| 46 | P3 | init-upload storage_path write unchecked → breaks commit; + dead extension ternary *(new 2026-06-13)* | ✅ add error check |
| 4 | P4 | Dead fallback import in audio/commit route | ✅ |
| 40 | P4 | Button shadows keyed to a retired teal color | ✅ (needs visual verify) |
| 41 | P4 | First Breath audio spec'd only in code TODOs | ⏳ asset work |
| 45 | P4 | Signed-URL routes log usage as "success" before the work that can fail *(new 2026-06-13)* | ✅ reorder record/update |
| 10, 11, 15, 17, 18, 32, 33, 35 | P4 | Cosmetic / observation-driven / library-adoption deferrals | ⏳ wait for their trigger |

**Next-up fixable queue:** ~~#5~~ → ~~#1~~ → ~~#2~~ (all resolved in commit 35d7372) → #26 (CI check) → ~~#4~~. Remaining agent-fixable: #26 (CI drift-check), #43, #46.

## RecordingUpload / useUploadPipeline (from PR #33, 2026-04-19)

### 1. [P3] Prompt auto-advance uses ref-during-render
`src/components/audio/RecordingUpload.tsx` — the prompt auto-advance block reads/writes a ref during render. It was previously masked by the component's size; after extracting `useUploadPipeline`, the shrunken component now trips `react-hooks/refs`. Worked around with targeted `eslint-disable-next-line` comments.

**Fix:** restructure the auto-advance into a `useEffect` that keys off `promptIndex` and reset-equivalent state.

### 2. [P3] ✅ RESOLVED (commit 35d7372) — Upload failure leaves hook status stuck at `'failed'`
**Resolution:** `RecordingUpload.tsx`'s `stopAndUpload` catch path now calls `resetPipeline()` after setting its own error state (`RecordingUpload.tsx:238`), so the hook's terminal `'failed'`/`'cancelled'` status no longer lingers between attempts for a future status consumer. Original entry below.

`src/components/audio/RecordingUpload.tsx` — on upload error the component surfaces its own error state but never calls `uploadPipeline.reset()`. The hook's internal `status` stays `'failed'` until a new `upload()` call is initiated.

**Why it's harmless today:** nothing outside `onStageChange` reads hook status.
**Why it could bite:** any future consumer that renders off `status` (retry UI, analytics, progress bar) will see stale `'failed'` state between attempts.
**Fix:** call `uploadPipeline.reset()` in the catch path, or replace local error state with the hook's.

## audio/commit route (from PR #31, 2026-04-19)

### 4. [P4] `AUDIO_BUCKET` import is only a fallback
`src/app/api/audio/commit/route.ts:7` — imports `AUDIO_BUCKET` but uses it only as a fallback (`row.storage_bucket || AUDIO_BUCKET`). The `storage_bucket` column is set on insert in `audio/init-upload` and is non-null in practice, so the fallback is dead weight.

**Fix:** drop the fallback and the import, or confirm the column can legitimately be null and document why.

## useUploadPipeline cancel (from PR #38, 2026-04-19)

### 5. [P3] ✅ RESOLVED (commit 35d7372) — `cancel()` lands the hook in `'failed'`, not a cancelled/idle state
**Resolution:** `useUploadPipeline.ts` now has a dedicated `'cancelled'` terminal status and an `isAbortError()` check in the catch block — a `cancel()`-triggered `AbortError` lands in `'cancelled'` (no error message, `onStageChange?.('cancelled')`) while real failures still land in `'failed'`. The rejection is still re-thrown so awaiting callers can branch. Covered by `tests/unit/useUploadPipeline.test.tsx` (cancel-mid-init/mid-PUT lands `cancelled`; `onStageChange` fires `cancelled` not `failed`). Original entry below.

`src/lib/upload/useUploadPipeline.ts` — the hook's `try/catch` wraps the whole pipeline, so when `cancel()` triggers an `AbortError`, it hits the catch block like any other error and sets `status: 'failed'`. Consumers calling `cancel()` will observe a failed state with an abort-error message.

**Why it matters:** most cancel-aware hook APIs distinguish abort-caused rejections (typically → `'idle'` or `'cancelled'`) from real failures. Dashboards or retry UIs that key off `status: 'failed'` will falsely fire on user-initiated cancels.
**Fix:** detect `AbortError` in the catch block and either transition to `'idle'` (most common) or introduce a `'cancelled'` status. Update the PR #38 test that currently asserts current behavior.

## Onboarding Screen 10 (from Bucket B1 review, 2026-04-19)

Omissions surfaced during the Screen 10 photo control review. Named as follow-ups rather than folded into the B1 Terminal doc because they're production-layer, adjacent-flow, or accessibility-layer concerns that deserve their own treatment.

### 6. [P3] Photo fit inside circle (object-fit + aspect handling)
Real uploads are rarely square. Portrait 9:16 photos, landscape DSLR exports, and panorama captures all hit Supabase Storage at native aspect ratio. The prototype pretends the photo is already square.

**Where it surfaces:** the `<img>` that replaces the empty circle state. Needs `object-fit: cover` + `object-position: center` at minimum. Server-side thumbnail generation (Supabase Storage transform or a separate render step) is the real fix.
**Pick up when:** Screen 10 moves from prototype to first real Supabase Storage integration. Probably during the B1 Terminal pass, but treated here because thumbnail strategy spans onboarding + Screen 9 + Home B + all downstream message cards. One decision, many consumers.

### 7. [P3] Screen reader announcement on photo success
When the photo lands, nothing is announced to assistive tech. The stone beating to `ready` is `aria-hidden="true"` by design. "Looking good" is visible text but not in a live region. VoiceOver/TalkBack users get silence on what is supposed to be a small positive moment.

**Fix shape:** add `role="status"` + `aria-live="polite"` to the "Looking good" paragraph, OR use a dedicated `<p class="sr-only" role="status" aria-live="polite">Photo added.</p>` that announces independently of visible copy.
**Pick up when:** accessibility pass on onboarding (not yet scheduled). Deferred out of B1 because it's a pattern decision that should cover all onboarding success beats, not just Screen 10.

### 8. [P3] Reduced-motion fallback for stone beat + upload ring
The in-flight breathing ring and the success-state stone beat (idle → ready → idle) both depend on motion. Under `prefers-reduced-motion: reduce`, the ring should be a static mineral-tinted border, and the stone state change should still occur (the color/glow endpoint is semantically meaningful) but without the 1200ms lerp.

**Pick up when:** Bucket B3 (Reduced-motion fallbacks). Already in scope there — cross-reference this entry so it doesn't get missed.

### 9. [P3] Re-entry state for previously-uploaded photo
If a user navigates forward past Screen 10 and then navigates back via Screen 9's "Change" link or browser back, Screen 10 currently resets (`prototypes/voice-recording-flow.html:1890`, `if (n === 10) resetPhoto()`). That's wrong for production. The circle should show the previously-uploaded photo with the "Replace" link visible and the CTA showing "Continue."

**Pick up when:** B1 Terminal doc lands and moves into Session 4 onboarding build. This is a state-persistence concern that lives in the parent `useOnboardingForm` hook, not the Screen 10 component spec.

### 10. [P4] File name surfacing on error copy
Current error copy ("That photo didn't come through. Try another, or continue without one.") is file-name-agnostic. For a user picking from multiple similar files, knowing *which* file failed helps recovery. But long file names have layout problems.

**Fix shape (when picked up):** if the file name is under ~24 chars, surface it inline (*"`IMG_4392.heic` didn't come through."*); if over 24, omit. Needs an error-card layout that accommodates a monospace file name without breaking the warm register.
**Pick up when:** low priority. Only matters if telemetry shows repeated errors during photo upload. Not an onboarding-polish concern.

### 11. [P4] Network offline state
If the user is fully offline when they tap the circle and pick a file, the upload fails differently than a rate-limited or size-rejected upload. Current error copy covers all three cases generically, which is probably fine, but a dedicated offline message ("You're offline. Try again when you're back online, or continue without a photo.") would be warmer and more accurate.

**Pick up when:** production QA reveals the generic copy doesn't guide users well enough through the offline path. Might never matter — flagged only.

### 12. [P3 · decision] Photo deletion path
Current spec has "Add photo" and "Replace" but no "Remove." If a user uploads a photo, moves through onboarding, and later decides they want no photo at all, the only path today is upload then delete account. Settings page needs a "Remove photo" control downstream.

**Pick up when:** Settings page Bucket work. Not an onboarding concern — flagged here so it doesn't fall through the cracks between onboarding and settings design passes.

## Onboarding 6 → 7 act transition + Reduced motion (from Bucket B2 / B3 review, 2026-04-20)

Omissions surfaced during review of the act-transition shimmer (B2) and reduced-motion fallbacks (B3) Terminal docs. Neither doc addresses these, and both touch the 6 → 7 handoff or the reduced-motion surface area. Flagged as follow-ups rather than folded back in because they're decision-level (not implementation-level) and deserve a separate pass.

### 13. ~~Screen 7 stone-leads-title choreography vs. act-transition wash timing~~ — RESOLVED 2026-04-20
Declared deferred with explicit pairing constraint in the B2 Terminal doc's "Out of scope" section: when the stone-leads-title choreography is implemented, the stone's leading beat must be pinned at ≤180ms so the wash peak (180–450ms) lands *after* the stone has asserted itself. Preserves the "stone leads, wash confirms, screen settles" ordering. Choreography not implemented in this pass.

### 14. ~~Act-transition wash while an earlier wash is still playing~~ — RESOLVED 2026-04-20
`chrome.tsx` now uses an `actTransitionActive` boolean state that sets `false` only on `onAnimationEnd`. While the wash is playing, rapid re-entries into the 6 → 7 transition are no-ops (`setActTransitionActive(true)` on an already-true state is a no-op setState). Behavior is: one wash at a time, second qualifying arrival within the 900ms window is ignored. Documented in the component comment above the state hooks.

### 15. [P4] Act-transition wash on Screen 7 re-entry
If the user goes 7 → back → 6 → 7 again via the back button or `←` key, does the wash replay? With the #14 fix, the answer is now: yes, if the previous wash has finished (≥900ms elapsed since the last 6 → 7 arrival). If the user re-enters within the 900ms window, the in-flight wash continues without restart. This resolves the rapid-back-and-forth case; the "fresh wash on every *completed* re-entry" case remains — which is the defensible design: the user deliberately chose to re-experience the act transition, so the wash accompanies it.

If telemetry later shows users find the re-play distracting, revisit with a `hasPlayedThisSession` ref scoped to the OnboardingScreen mount.
**Pick up when:** observation-driven, not scheduled.

### 16. [P3 · needs event-naming input] Analytics instrumentation for B2 / B3 surfaces
Neither doc specifies events. The act-transition wash is a named gesture and may warrant a `screen_act_transition_viewed` or similar; reduced-motion activation rate is useful for product understanding (how many users hit the RM code paths, which screens, how often does it toggle mid-session). Without guidance, Terminal will either invent events or ship nothing.

**Why flag it now:** telemetry decisions are cheap during design, expensive after a feature ships and retroactive events have to be added.
**Pick up when:** whoever owns the onboarding analytics contract next touches `docs/analytics/`. Not blocking; capture a single line in B2/B3 Terminal docs saying "analytics: see docs/analytics/ — not in scope here."

### 17. [P4] Dark mode behavior for act transition + reduced motion
B2 declares dark mode out of scope explicitly. B3 does not — and reduced-motion + dark mode is a plausible user combination (e.g., vestibular issues + night-mode OS-wide). The warm-ceramic BreathStone gradient, the mineral wash color, and the `mix-blend-mode: multiply` layer all read entirely differently against a dark surface.

**Where it surfaces:** `globals.css` palette tokens, `breathStoneEngine.ts` body gradient (locked per design rules), wash overlay color.
**Pick up when:** Bucket C4 dark-mode token map lands. Cross-reference both B2 (wash color/blend) and B3 (ensure RM rules don't assume light surfaces) so the dark-mode pass covers the act-transition surface area.

### 18. [P4] BreathStone initialization / lerp-interrupt state during 6 → 7
If the canvas is still initializing (first-paint not yet rendered) or the state lerp is mid-flight when the 6 → 7 trigger fires on a slow device, what does the wash land on top of? On older Android at 4× throttle, the stone may still be lerping idle → guidance when the wash plays, producing a half-warmed body under a peak wash — potentially a muddy mineral-on-cool composite.

**Why flag it now:** low probability, not zero. The 4× throttle verification in B3 exercised RM but not the default-motion slow-device path.
**Pick up when:** next device-QA cycle on real older hardware. Could warrant a settle-wait pattern (`requestIdleCallback` or a timestamp guard) before firing the wash, or it might be a non-issue in practice.

### 19. ~~`prefers-reduced-transparency` for B2's `mix-blend-mode` layer~~ — PARTIAL 2026-04-20
Flagged explicitly in the B2 Terminal doc's "Out of scope" section with a solution shape (solid-color tint fallback that approximates the blended mineral wash). Not implemented; tracked for a future accessibility pass beyond RM.

### 20. ~~Stone state-change timing during the 400ms screen crossfade (6 → 7)~~ — RESOLVED 2026-04-20
Declared explicitly in the B3 Terminal doc's new §8: **t=0 of the crossfade** (synchronous with `setCurrentScreen(n)`), then `settleDelay` (500ms default, 600ms on Screen 11) before the engine begins lerping. Sequence table and rationale recorded in-doc. Same trigger moment under reduced motion; engine snaps instead of lerps. Applies to all cross-screen stone-state flips, not just 6 → 7.

## Supabase migrations (from Session 7b, 2026-04-20)

### 21. [folded into #30] Duplicate migration version IDs block CLI `db push`
`supabase/migrations/` contains multiple files sharing the same date-only version: three with `20260214_*` and two with `20260412_*`. Supabase's `supabase_migrations.schema_migrations` table uses `version` as the primary key, so only one row per version can exist. Running `npx supabase migration repair --status applied <version>` marks one file per version as applied; the remaining files with the same version show an empty Remote column in `migration list`. On the next `db push`, the CLI tries to re-apply those "unmatched" files, whose DDL has already been run against the remote DB — a collision. Worked around in 7b by running the new `20260420_add_subscriptions.sql` via Dashboard SQL Editor and then repairing it as applied.

**Affected files:**
- `20260214_allow_failed_to_collecting_retry.sql`
- `20260214_phase8_hardening.sql`
- `20260214_phase8b_duration_ms.sql`
- `20260412_01_add_name_and_state.sql`
- `20260412_add_date_of_birth.sql`

**Fix:** rename each duplicated file to a unique 14-digit timestamp (e.g., `20260214000000_...`, `20260214000001_...`, `20260214000002_...`), then `migration repair --status applied <new_version>` for each. Use `git mv` so history survives. Also consider renaming `RUN_IN_DASHBOARD_voice_profiles_attempt_tracking.sql` to match the `<timestamp>_name.sql` pattern so the CLI stops skipping it.
**Pick up when:** next session that otherwise touches `supabase/migrations/` (e.g., Session 7c, or any schema-change session). Not blocking 7b, 7c, or deploy — the DB is in the correct state; only the CLI's bookkeeping is out of sync.

## Voice-creation payment gate (from Session 7c Chunk 1, 2026-04-21)

### 22. [P2 · decision] Should `/api/voice-profiles/[id]/start` gate on paid status?
Session 7c's spec called for a "voice processing trigger" on `checkout.session.completed` (Site A) and on the `created → collecting` transition (Site B), so that paid users would land in `voice_profiles.status = 'processing'`. Both sites were **dropped from 7c** because the repo's `'processing'` status semantically means "ElevenLabs is currently running," and flipping to it without invoking ElevenLabs would leave profiles stuck (the `/start` route's 3-minute staleness check would eventually treat them as timed out).

The real underlying question is a product one: **should voice creation require a paid subscription before ElevenLabs is invoked?**

**Current state:** `/api/voice-profiles/[id]/start` has zero payment gating. Any authenticated user with enough clips can trigger ElevenLabs on their voice profile. Voice creation and payment are entirely decoupled.

**Options if this gets addressed:**
- **(a)** Add a payment check inside `/start`; 401/402 if the user isn't on `trial`/`active`. Simple, but forecloses any "free preview" product decisions.
- **(b)** Keep `/start` open; rely on storage/retention gates downstream (e.g., voice profiles for unpaid users are deleted after N days). More product work, more leeway.
- **(c)** Keep status quo — voice creation is free, only vault storage/delivery gates on payment.

**Pick up when:** product decides how strongly payment should gate voice creation. Not blocking 7c, 7d, or deploy — vault surfaces already gate on subscription state. This is about ElevenLabs cost exposure, not user-facing flow integrity.

## Stripe / restore surface (from Session 7c, 2026-04-21)

### 23. [P2 · 2 confirmations needed] Customer Portal cannot resurrect a deleted subscription — restore screen dead-ends for lapsed users
After Smart Retries exhausts its attempts, Stripe fires `customer.subscription.deleted` with `cancellation_details.reason = 'payment_failed'`, and our webhook writes `status = 'lapsed'`. A lapsed user who lands on `/app/vault/restore` and taps "Bring my vault back" opens the Customer Portal. The Portal lets them update their card — but Stripe does **not** automatically recreate a deleted subscription. Card update has no effect on a fully-lapsed user. They land back on `/app/vault/restore` still in `status = 'lapsed'`, confused about why nothing changed.

`past_due` users (subscription still exists, retry cycle still active) are fine — Portal → update card → next retry succeeds → webhook flips status back to `active`. The gap is specifically the lapsed/cancelled case.

**Affected file:** `src/app/app/vault/restore/actions.tsx` — always opens Portal; no branch on status.

**Recommended fix (for a future session):**
- Branch CTA on `sub.status`:
  - `past_due` → Portal (existing behavior)
  - `lapsed` or `cancelled` → `/api/stripe/create-checkout-session` — create a new subscription on the existing customer
- **Do NOT silently force monthly** on re-checkout. Query the previous (lapsed) `subscriptions.billing_period` and default to what the user had before. Fall back to monthly only if no prior row found. A user who paid for annual, lapsed, and comes back should not silently find themselves on monthly — that's a financial decision masquerading as a UX default.

**Why deferred rather than in-7c patch:** pre-launch lapse volume is ~0. Building the wrong fix under time pressure and living with it later is worse than designing it properly later. Shipping 7c without the fix is acceptable because no lapsed users exist yet.

**Pick up when:** a) before public launch, or b) first real lapsed user surfaces in dashboards, whichever comes first. Requires the following questions resolved:
- Confirm the "preserve previous billing_period" rule is product-correct.
- Decide whether the restore screen's CTA label should change when the action is "start a new subscription" vs "update your card" — may read more appropriately as "Restart your vault" for lapsed vs "Update my card" for past_due.
- Confirm the new subscription inherits any trial remnants or starts fresh (fresh is the simpler, likely-correct default).

## Voice-creation → First Breath handoff (from Session 8 planning, 2026-04-21)

These two entries capture the orphaned-First-Breath gap discovered while scoping Session 8. The polling infra, success state, First Breath screen, and guards all exist — what's undecided is routing. Both are explicit "connection pass" work, deliberately deferred so Sessions 8/9/10 can build surfaces in isolation.

### 24. [P2 · hold: overlaps active Step 6 work] `VoiceCreationView` success state routes to `/app/messages/new` instead of First Breath
`src/components/voice/VoiceCreationView.tsx:243` — on `status === 'ready'`, the success screen's primary CTA pushes to `/app/messages/new`, skipping the ceremonial First Breath Stone moment at `/app/record/complete` entirely.

**Affected file:** `src/components/voice/VoiceCreationView.tsx` — the `onClick={() => router.push("/app/messages/new")}` in the success branch (~line 243–246).

**Fix shape:** one-line change — swap the push target to `/app/record/complete`. First Breath's server-side guards at `src/app/app/record/complete/page.tsx:14–36` already admit `ready`/`processing`/`queued` profiles, so routing there on success is safe.

**Open question tied to FU-25:** if VoiceCreationView success routes *into* First Breath, FU-25's exit destination question becomes load-bearing.

**Pick up when:** connection pass after Sessions 8/9/10 land the surfaces. Grep-verify that nothing else routes to `/app/messages/new` directly from the voice-creation flow at that time.

### 25. [P2 · decision] `FirstBreathSequence` exits to `/app/record/complete/stub` — decide final destination
`src/components/screens/FirstBreathSequence.tsx:100` — the CTA handler pushes to `/app/record/complete/stub` with an inline TODO (`// TODO: replace with router.push('/app/checkout') when Session 7 is complete`). Session 7 is complete (7a/7b/7c shipped), but the stub hasn't been replaced because the destination is still a design decision.

**Candidates:**
- `/app/messages/new` — the Session 8 surface. First Breath → immediate message creation.
- Dedicated "vault sealed" screen — ceremonial closure before returning to app surfaces. Fits the arc but adds a screen to build.
- `/home` / `/app` — neutral return. Simplest, but discards the narrative momentum First Breath builds.

**Why deferred:** depends on how Session 8's message-creation flow feels in context. A user who just witnessed the First Breath ceremony may or may not want to immediately type a message — the right next step isn't obvious until Session 8 ships.

**Pick up when:** connection pass, after Session 8 (`/app/messages/new`) is testable end-to-end.

## Supabase generated types not wired up (from Session 8 micro-pass, 2026-04-21)

### 26. [P3 — mostly resolved; CI check remains] DB enum types are hand-written unions; no generated types file

**Update (seed scan, 2026-06-12):** steps 1–3 of the fix shape have landed — `src/lib/supabase/types.ts` exists (generated), and `MessageCategory` in `src/lib/messageTemplates.ts:32` now derives from `Database['public']['Enums']['message_category']`. Remaining: step 4 only — a CI/pre-commit drift check that regenerates types and fails on diff. Original entry below.
This repo does not have a `src/lib/supabase/types.ts` (or equivalent) produced by `supabase gen types typescript`. TS files that need DB enum types currently hand-write string-literal unions that mirror the Postgres enums.

**Current instance:** `src/lib/messageTemplates.ts:26` defines `MessageCategory` as an inline union with a comment pinning it to `supabase/migrations/20260421120000_messages_category.sql`. Same pattern will repeat for future DB-typed work unless the generation workflow lands.

**Risk:** enum drift. If someone adds a value to a DB enum via migration but forgets to update the matching TS union, `tsc` won't catch it — the mismatch surfaces only at runtime when the server tries to insert an enum value the DB accepts but the TS narrower rejects (or vice versa).

**Blocker:** the Supabase CLI auth is currently broken — `npx supabase login` fails with `permission denied to alter role "cli_login_postgres"` (encountered during Session 8 Pass 0's migration repair step). That blocks both `supabase gen types` and `supabase db push` / `migration repair` from running. Worked around by running migrations directly via the Dashboard SQL Editor and inserting bookkeeping rows into `supabase_migrations.schema_migrations` by hand.

**Fix shape:**
1. Restore CLI auth. Likely paths: `supabase logout` + fresh `supabase login`; if that still fails, regenerate the access token in Dashboard → Settings → Access Tokens; if *that* still fails, the project owner may need to re-grant CLI access.
2. Once CLI works: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts` (or `--local` if a local Supabase is running).
3. Swap hand-written enum unions to `Database['public']['Enums']['<name>']`. Start with `MessageCategory` in `src/lib/messageTemplates.ts`.
4. Add a CI check (or a pre-commit hook) that regenerates types and fails if `src/lib/supabase/types.ts` would change — catches drift before merge.

**Pick up when:** next time the CLI auth needs to work for a separate reason (migration repair, local Supabase spin-up), or when a second DB enum union is about to be hand-written — whichever comes first. Not blocking Session 8; the hand-written `MessageCategory` is type-safe within the codebase, it just can't catch schema-drift.

## Step 6 message generation endpoints (from Session 8 Step 6 build)

### 27. Per-category voice settings not wired into TTS — ✅ RESOLVED 2026-06-10
**Resolved by** commit `e16cda1` (feat(messages): apply per-category voice settings to TTS). `GenerateSpeechParams` now takes an optional `voiceSettings` and forwards it as `voice_settings` (stability / similarity_boost / style / use_speaker_boost) in the ElevenLabs request body, omitted-defaults preserved for callers that don't pass it. All three render paths forward `getCategoryVoiceSettings(category)`: `/api/messages/generate`, `/api/messages/regenerate` (both the `retry_audio` and control arms), and `/api/messages/commit` — the latter two via `generateAndStoreAudio` in `src/lib/messages/audio.ts`. Verified 2026-06-11 during the safe-refactor batch. Original entry below.

`src/lib/elevenlabs.ts` `generateSpeech()` accepts only `{ voiceId, text }` — it does not send ElevenLabs voice settings. `src/lib/messageTemplates.ts` defines tuned `voiceSettings` per category (stability/similarity/style/speakerBoost, e.g. comfort is steadier, birthday more expressive), but `/api/messages/generate` and `/regenerate` call `generateSpeech` without them, so every category renders with ElevenLabs defaults.

**Why it matters:** the emotional register tuning (MASTER_SPEC Ch. 8) is the point of per-category voice settings — losing it flattens comfort/birthday/etc. to one delivery.
**Fix shape:** extend `GenerateSpeechParams` with an optional `voiceSettings` and forward it in the TTS request body (`voice_settings`); pass `getCategoryVoiceSettings(category)` from both generation routes. Keep defaults when omitted so existing callers (`/api/messages` POST) are unaffected.
**Pick up when:** first voice-quality pass on Step 6 audio, or when tuning ElevenLabs output.

### 28. [P3 · decision] Pending audio lives in `essence-audio`, not the contract's `messages` bucket
`src/lib/audio/storage-paths.ts` `pendingGenerationAudioPath()` writes pending Step 6 audio to `essence-audio` under a `users/{userId}/pending/` prefix. The API contract (`docs/API_CONTRACTS.md`) and the `pending_generations` migration comment describe the path as `messages/{userId}/pending/{generationId}.mp3` — implying a separate `messages` bucket.

**Why the deviation:** provisioning a second storage bucket is infra (Supabase dashboard) with its own RLS; reusing the existing `essence-audio` bucket keeps one RLS surface and one set of path helpers. The copy-then-delete Save promotion (Q5) is unchanged — pending and permanent paths are still distinct and deterministic.
**Fix shape:** either (a) ratify the `essence-audio` + `pending/` prefix as the real contract via a one-line decision memo and update `docs/API_CONTRACTS.md` wording, or (b) provision a dedicated `messages` bucket with matching RLS and repoint `pendingGenerationAudioPath` + `messageAudioObjectPath`.
**Pick up when:** the API contract doc gets its next pass, or before Step 6 ships to production storage.

### 29. Step 6 endpoints have no route-level integration tests — ✅ RESOLVED 2026-06-10
**Resolved by** `tests/smoke/messages.spec.ts` + `tests/smoke/fixtures/step6.ts`: 18 smoke tests against the real server + real database (no mocks) covering every gate, all three cost caps, save 404/409/403 paths, the full happy-save pipeline (recipient promotion + audio copy + immutable message insert), idempotency, and discard — zero vendor spend (paths return before the render, or copy a seeded fake audio object). The full `/generate` → real-ElevenLabs render remains a separate manual check (noted in `Step6_Status.md`). The two initial red tests turned out to be test-expectation bugs, not route bugs, and surfaced two correct behaviors worth recording: `defineRoute` validates the body before auth (so an unauth call with an invalid body returns 400, not 401), and the `dedup` gate 429s a rapid double-`/save` while the DB-level unique `source_generation_id` handles delayed retries. Original entry below.

`/api/messages/{generate,regenerate,save,discard}` are covered only at the pure-logic layer (`tests/unit/step6-generation.test.ts`) and the telemetry wrapper (`tests/unit/step6-analytics.test.ts`). The handlers themselves — recipient-branch validation, edit-note lineage + supersede, cost-control 429s, Save idempotency (unique `source_generation_id`), recipient promotion, audio copy-then-delete — are untested.

**Why deferred:** route tests need Supabase + ElevenLabs + Anthropic mocking harnesses that don't exist in this repo yet.
**Fix shape:** add a route-handler test harness (mock `createSupabaseServerClient`/`service`, `generateSpeech`, `generateInsert`) and cover: dual-recipient-branch rejection, edit_note_depth/regenerate_cap/pending_max/hourly_max 429s, Save idempotency double-tap, vault_limit_reached at cap, discard of an already-saved row (409).
**Pick up when:** before Step 6 production ship, or when the first route bug surfaces.

## Supabase migration history reconciliation (from Session 8, 2026-06-10)

### 30. `db push` blocked by version-collision in early migration history — ✅ RESOLVED 2026-06-16 (M0)
**Resolution:** reconciled the migration history exactly as the fix shape below describes. Renamed the 6 colliding short-stub files to unique 14-digit versions (`20260214_*` → `20260214000000/000100/000200`, `20260412_*` → `20260412000000/000100`, `20260421_add_failed_attempt_count` → `20260421000000`), then `supabase migration repair --status applied <new versions>` (records them applied, runs **no** SQL — schema was already correct) followed by `--status reverted 20260214 20260412 20260421` (drops the stale duplicate rows). Also removed the redundant `RUN_IN_DASHBOARD_voice_profiles_attempt_tracking.sql` (all its changes are in tracked migrations: `phase5_voice_profile_lifecycle`, `voice_profiles_attempt_tracking`). **`supabase db push --dry-run` now reports "Remote database is up to date"** with no skips — `db push` is usable again. The remote `schema_migrations` ledger was edited live; the file renames are in this branch.

---
*Original entry (for reference):*

After fixing the CLI's database connection (added `SUPABASE_DB_PASSWORD` to `.env.local`, which cleared the `cli_login_postgres` permission error), `supabase db push --dry-run` reports: *"Remote migration versions not found in local migrations directory"* and suggests `supabase migration repair --status reverted 20260421` / `supabase db pull`.

**Root cause:** several early migration files use short, non-unique version stubs — e.g. three `20260214*` files all parse to version `20260214`, two `20260412*` files to `20260412`, and `20260421_add_failed_attempt_count.sql` to `20260421`. The remote `supabase_migrations.schema_migrations` table (whose `version` is a primary key) can't hold one row per file when versions collide, so the CLI sees the same version as both "local-only" and "remote-only" and refuses to push. The *schema itself is correct* (verified via `gen types` — all expected tables/columns/enums exist); this is purely a bookkeeping mismatch in the migration-history table.

**Why not fix reactively:** the CLI's suggested `migration repair --status reverted <version>` marks a version as un-applied, which would make `db push` try to RE-RUN an already-applied migration (e.g. re-add `failed_attempt_count`) and error (`column already exists`). Reconciliation needs care, not a one-liner.

**Impact:** low. New migrations are applied reliably via the Dashboard SQL Editor bundle (the method used to apply the 4 Step-6 migrations on 2026-06-10). `db push` is just not usable until history is reconciled. Type generation (`--project-id`) and direct-DB reads work fine.

**Fix shape (do in a dedicated, calm pass — not mid-feature):**
1. Inspect `supabase_migrations.schema_migrations` contents on remote (Dashboard SQL Editor: `select version, name from supabase_migrations.schema_migrations order by version;`).
2. Decide a strategy: either (a) rename the colliding local migration files to unique full timestamps and re-record matching history rows, or (b) `migration repair --status applied <version>` for each version that's actually applied but recorded inconsistently — verifying against the live schema before each repair so nothing gets marked for re-run.
3. Confirm with `db push --dry-run` showing a clean "up to date" before trusting `db push`.

**Pick up when:** before relying on `db push` in CI/automation, or the next time migration history needs to be authoritative. Until then, Dashboard bundle is the path. Supersedes the CLI-auth half of #26 (auth itself is fixed).

**Bundle log:** 2026-06-11 bundle (`20260611233000` trigger fix, `20260611234000` profiles.ui_flags, `20260611235000` pending audio duration) applied 2026-06-12 via direct `pg` connection (same effect as the Dashboard SQL Editor), with full-timestamp history rows recorded in `supabase_migrations.schema_migrations` — consistent with the 2026-06-10 bundle, so this bundle adds no reconciliation debt.

## Deferred Audio — "Keep the current one" candidate clear (from Session 8, 2026-06-10)

### 31. "Keep the current one" doesn't clear the candidate server-side — ✅ RESOLVED 2026-06-11
**Resolved by** a `mode: "keep"` on `POST /api/messages/regenerate` that nulls `candidate_text` / `candidate_template_variant` for the generation (no LLM, no TTS, no voice-profile dependency — runs before the profile check). Idempotent: a no-op when no candidate is present, so a redundant call or a refresh-then-keep is safe. Emits a `step6_candidate_kept` server log (see `docs/analytics/2026-06-11-step6-candidate-kept.md`). Covered by two smoke tests in `tests/smoke/messages.spec.ts` (clears a present candidate while leaving the committed take + counts untouched; idempotent no-op with no candidate). The A6 client still needs to call `mode: "keep"` when wiring the "Keep the current one" button — the server half is now in place so the client wiring and durable clear can land together. Original entry below.

Under `DEFERRED_AUDIO_ENABLED`, `/regenerate` writes a candidate into `pending_generations.candidate_text` / `candidate_template_variant`. The A6 "Keep the current one" action (discard the un-heard candidate, return to the committed take) is currently client-only — it stops showing the candidate, but the row's `candidate_*` columns linger until the next `/regenerate` overwrites them, `/commit` promotes them, or `/discard` deletes the row.

**Impact:** low and not user-visible in the happy path. The lingering candidate is never saved (`/save` reads the committed fields only) and never auto-committed. The one rough edge is **resumability**: if the user taps "Keep the current one" and then refreshes, a server-side rehydrate would surface the stale candidate again, contradicting their choice.

**Fix shape:** a tiny server action to null out `candidate_text` / `candidate_template_variant` for the generation — either a `mode: "keep"` on `/regenerate`, or fold it into A6's page hydrate. Cheap; pair it with the A6 build so the client wiring and the server clear land together.

**Pick up when:** building A6 (the screen that owns the candidate-vs-committed UI), since that's where "Keep the current one" is wired.

## RecordingUpload clips-list fetch (from FU-1 refactor, 2026-06-11)

### 32. [remaining half: P4] Clips-list effect uses synchronous-setState-in-effect (eslint-disabled) — ✅ MOSTLY RESOLVED 2026-06-11
`src/components/audio/RecordingUpload.tsx` — the `voiceProfileId`-keyed clips-list data fetch reset list/loading/error state synchronously in the effect body (the conventional pre-fetch pattern), tripping `react-hooks/set-state-in-effect` and carrying a block-level disable. The same hand-rolled `fetch`-in-effect triad also lived in `MemoryShelf`.

**Resolved (the consolidation half):** extracted `src/lib/data/useResource.ts` — a generic `fetch`-in-effect-with-loading/error hook (status machine, AbortController-per-fetch stale-response guard, imperative `refetch`, `setData` for optimistic/silent patches, falsy-`key` disabled state). Both `RecordingUpload`'s clips list (keyed on `voiceProfileId`) and `MemoryShelf` (fetch-once + retry) now consume it; neither component carries the `set-state-in-effect` disable anymore. The disable now lives in exactly ONE documented place — the hook's fetch effect. Unit-tested in `tests/unit/useResource.test.tsx` (11 cases: status transitions, keyed/imperative refetch, disabled key, setData, abort/stale-response guard). MemoryShelf verified in-browser (loading → success → empty). RecordingUpload's clips list is mic-gated headless so not browser-verified, but runs the identical hook logic.

**Remaining (the true zero-disable half):** the hook still carries one `eslint-disable react-hooks/set-state-in-effect` for the pre-fetch `loading` reset — the rule flags the *first* synchronous setState in any effect regardless of a following async call, so deriving the disabled branch didn't remove it. A genuinely disable-free version needs a cache-backed library (SWR / TanStack Query) that derives loading from request/response identity rather than syncing it via effect.
**Pick up when:** a data-fetching-library adoption pass. New `fetch`-in-effect lists should consume `useResource` rather than re-rolling the pattern.

## Step 6 message routes — error-response convention (from shared-helpers refactor, 2026-06-11)

### 33. [remaining half: P4] Step 6 error responses — `retryable` consistency — ✅ RESOLVED 2026-06-11
**Resolved (the retryable-consistency half):** every Step 6 error body that carries an `error` message now also carries a `retryable` boolean. Added `retryable: false` to the 7 inline validation/precondition returns (generate recipient-not-found; save not-found/not-ready/subscription-lapsed; commit no-candidate; discard already-saved; regenerate no-cached-text) plus the two shared helpers (`pendingNotFoundResponse`, `loadReadyVoiceProfile` in `route-helpers.ts`). The partial-success responses (carrying `generationId`/`textStatus`/`audioStatus`/`committed`) already carried `retryable: true`. Test-enforced: smoke assertions in `tests/smoke/messages.spec.ts` now check `retryable === false` on the 404/409/403 paths.

**Deliberately left as-is:** the code-only business-outcome responses — `cost_limit_blocked` (429, carries `limit_kind`) and `vault_limit_reached` (403, code-only) — have no `error` message and their `code` drives client behavior, so `retryable` is redundant there. The rule applied is: *a body with an `error` field has a `retryable` field.*

**Remaining (optional, lower priority now):** the routes still build these error bodies inline rather than via the documented `throw new AppError(...)` convention (`src/lib/errors.ts:3`). With `retryable` now consistent, the main concrete benefit of an AppError migration is gone — what's left is stylistic alignment + future-drift protection (inline returns can still omit `retryable` again; AppError can't). Not worth the throw/return split and the awkward fit for the string-coded responses (`subscription_lapsed`) and the no-message `vault_limit_reached` unless a broader API-envelope pass happens.
**Pick up when:** an API-envelope/AppError-convention consolidation pass, if ever.

## Route map — two routing inconsistencies surfaced (from route-centralization, 2026-06-11)

### 34. [P2 · decision] `/messages/new` vs `/app/messages/new` — two live message-creation routes
Centralizing routes into `src/lib/routes.ts` surfaced two anomalies:

**(a) `/app/home` bug — FIXED.** `src/app/app/vault/seal/actions.tsx` dismiss handler pushed to `/app/home`, which is not a route (the home route is `/home`) — it would 404. Fixed to `ROUTES.home` during centralization. No follow-up needed; recorded here for traceability.

**(b) Two parallel message-creation routes — NEEDS A DECISION.** Both `/messages/new` (`src/app/messages/new/`) and `/app/messages/new` (`src/app/app/messages/new/`) exist and render. App surfaces (TabNav, MemoryShelf, VaultSealed, VoiceCreationView) push to `/app/messages/new`; the doc-described Step 6 entry is `/messages/new`. The route map keeps both (`ROUTES.messagesNew`, `ROUTES.appMessagesNew`) and preserved each caller's current target — no behavior change — but one is almost certainly canonical and the other dead/legacy.

**Resolved (M0, 2026-06-16):** `/messages/new` (the Step 6 spine) is canonical. All callers (TabNav, MemoryShelf, VaultSealed, VoiceCreationView, record page) repointed to `ROUTES.messagesNew`; `ROUTES.appMessagesNew` removed. The legacy `/app/messages/new` is now a **permanent redirect** to `/messages/new`, and its old `NewMessageView` component (orphaned) was deleted. Redirect + 404 boundary verified live.

## A6 Preview & Refine — screen build (from Step 6 A6 wiring chunk 1, 2026-06-11)

### 35. [P4 · user-deferred] Canvas BreathStone reads softer/duller than the prototypes' golden CSS stones (A6 + A7, any light ground)
**Files:** `src/components/screens/messages/PreviewRefineScreen.tsx` and `src/components/screens/messages/SaveConfirmationScreen.tsx` (the `<BreathStone …>` renders); `src/components/breath-stone/breathStoneEngine.ts` (the palette that would change).
**What:** the Step 6 prototypes draw rich honey-gold CSS-gradient stones (A6: Ready/Playback/Working; A7: the `infused` ceremonial amber, `essence-step6-a7.html`). Production reuses the shared canvas `BreathStone` — the architecturally correct call (one stone grammar across onboarding + Voice Training + vault + Step 6), and the state mapping is clean. But on light grounds the canvas stone renders pale-taupe, noticeably less ceremonial than the prototypes' gold orbs. Confirmed against the reference sandbox (`/dev/breath-stone`): this is the settled engine look, not a usage bug. **2026-06-12, A7 design pass:** user agrees it reads "quite dull"; revisit deliberately deferred because warming the engine touches every stone usage (VaultSeal, FirstBreath, RecordScreen, A6, A7) — a lift of its own. A7 partially compensates with the prototype's 7s amber halo as a CSS layer behind the canvas (`SaveConfirmationScreen.css.ts`, `.stone-wrap::before`).
**Why it matters:** the stone is the emotional anchor of the preview and save-confirmation moments; a washed-out stone undersells "here it is, in your voice" and the ceremonial close. Cosmetic, not functional — states are correct and motion holds at 4× CPU.
**Fix shape:** a dedicated stone-warmth pass: tune `breathStoneEngine`'s palette/contrast for light grounds (helps every usage), with the prototypes' gold stones as the reference, then re-verify each stone screen. Do NOT fork bespoke CSS stones into individual screens — that re-splits the stone grammar.
**Pick up when:** its own chunk after the Step 6 spine lands (user-deferred 2026-06-12), or whenever BreathStone-on-light contrast is addressed for RecordScreen.

## A6 live wiring (from Step 6 A6 wiring chunk 2, 2026-06-11)

### 36. A6 per-user latches ride a cookie, not the profile — ✅ RESOLVED 2026-06-12
**Resolution:** `profiles.ui_flags jsonb` added (migration `20260611234000`, applied in the 2026-06-11 bundle). The A6 page reads the flags; a page-owned server action latches them; `a6-prefs.ts` (cookies) deleted. Verified live: latches persist server-side, old cookies ignored.

**File:** `src/app/messages/new/g/[generationId]/a6-prefs.ts` (+ `page.tsx` cookie reads).
**What:** the screen contract (`PreviewRefineScreen.types.ts`) wants `playHintLearned` / `isFirstArrival` as per-USER profile flags. There's no `profiles` column for UI latches, and new migrations currently go through the Dashboard bundle (#30), so Chunk 2 persists both as 1-year cookies (`essence_a6_play_hint`, `essence_a6_visited`).
**Why it matters:** cookies are per-device — a user on a second device re-sees the tap-to-play hint and the first-arrival education line. Mild repetition, no data loss.
**Fix shape:** add a `profiles.ui_flags jsonb` (or two booleans) via the next migration bundle, read it in the A6 page.tsx, persist via a small server action; drop the cookies.
**Pick up when:** the next batch of remote migrations (after #30 unblocks), or the Step 6 polish pass.

### 37. Audio duration is estimated, never measured — ✅ RESOLVED 2026-06-12
**Resolution:** `pending_generations.audio_duration_ms` added (migration `20260611235000`, applied). ElevenLabs returns CBR mp3, so `src/lib/audio/mp3-duration.ts` derives duration exactly from byte length; `generateAndStoreAudio` and `/commit` store it, `/commit` returns `audioDurationMs`, `/save` copies it to `messages.audio_duration_ms` (previously never populated — verified live). The wpm estimate remains only as the fallback for pre-migration rows; `loadedmetadata` adoption stays as the last corrector.

**Files:** `src/lib/messages/speech-duration.ts`, `PreviewRefinePageClient.tsx` (commit normalization), `PreviewRefineScreen.tsx` (`loadedmetadata` adoption).
**What:** nothing in the pipeline measures the rendered clip's real duration — `pending_generations` has no duration column and the TTS call doesn't report one. A6 paints the scrubber from a ~150 wpm estimate, then adopts the real duration from the audio element's `loadedmetadata` once the clip loads.
**Why it matters:** before the clip loads (and on the beat right after a commit), the scrubber's end-time can be off by a few seconds. Self-corrects on load; purely cosmetic. The saved-messages table already has `audio_duration_ms` but the Step 6 save path doesn't populate it either.
**Fix shape:** measure duration server-side when the render lands (parse the mp3 or take it from the vendor response), store it on `pending_generations` (needs a column → migration bundle, #30) and return it from `/commit`; populate `messages.audio_duration_ms` on save while there.
**Pick up when:** with the #36 migration bundle, or if the estimate visibly misleads during QA.

### 38. A6 exit-path stop-gaps: C3, the reshape return, and A7's ceiling CTA — ✅ FULLY RESOLVED 2026-06-14 (Chunk 10)
**Files:** `src/app/messages/new/g/[generationId]/PreviewRefinePageClient.tsx`, `src/app/messages/saved/[messageId]/SaveConfirmationPageClient.tsx`.
**Resolved (Chunk 3, 2026-06-12):** Save success now routes to A7 Saved at `/messages/saved/[messageId]`, and the already-saved redirect in the A6 `page.tsx` replays the same A7 — both verified live.
**Resolved (Chunk 4, 2026-06-12):** Reshape ("What it says") and the A6 back chevron now route to A4 at `/messages/new/g/[generationId]/reshape`; the deferred reshape writes a candidate back onto the same row and returns to its A6 in the candidate state — verified live (real LLM reshape, depth cap + 404 guards).
**Resolved (Chunk 8, 2026-06-14):** `vault_limit_reached` on save now routes to C3 Vault Limit at `/messages/limit?from=save_race` (push, not exitFlow, so flow_id survives for correlation); C3's mount fires `step6.vault_limit_blocked` with `surfaced_from` and clears the flow. The A2-entry cap gate (`/messages/new` → `/messages/limit?from=a2_entry`) is also live. See `docs/session-8/Step6_C3_Screen_Chunk8.md`.
**Resolved (Chunk 10, 2026-06-14):** C1 Three Shaped shipped as the one-time `?ceremony=three-shaped` overlay on the 3rd save; the A7 `third` "See what's coming" now routes to C2 (`/messages/waitlist?from=c1`) — on a revisit it skips straight to the waitlist (the ceremony is the one-time auto-overlay, not a revisit CTA). `subscription_lapsed` correctly routes to `/app/vault/restore`. **All A6 exit paths now land on their real screens — entry closed.**

### 54. C1 "once per lifetime" durable flag — ✅ RESOLVED 2026-06-16
**Resolution:** the per-device `localStorage` latch is replaced by a durable, cross-device, server-side flag, now that #30 has unblocked the migration pipeline. Exactly the fix shape below:
- **Migration** `20260616120000_profiles_three_shaped_ceremony_seen_at.sql` — additive, nullable `profiles.three_shaped_ceremony_seen_at timestamptz` (NULL = not yet seen). `timestamptz` over a boolean so the moment is timestamped for later funnel/retention use; a dedicated column over `profiles.ui_flags` because this is a lifetime milestone, not a UI hint latch. **Applied to production 2026-06-16** (owner-approved `db push`); `db push --dry-run` now reports "Remote database is up to date" and a fresh `gen types --linked` confirms the column matches the committed `types.ts`.
- **Page** `src/app/messages/saved/[messageId]/page.tsx` reads the column server-side inside the C1 branch and shows the ceremony only when it's NULL; an already-seen user (any device, or a stale `?ceremony` deep-link) falls through to the normal A7 third-variant confirmation — so the server never sends C1 HTML to a seen user, eliminating the old flash-then-`router.replace` path entirely.
- **Stamp** a page-owned `"use server"` action stamps `seen_at = now()` with a `.is(... null)` guard (DB-level idempotent — preserves the first-show timestamp). `ThreeShapedPageClient` calls it once on mount (ref-guarded against StrictMode double-invoke); fire-and-forget, the failure mode is the same harmless replay as before.
- **localStorage removed** (`SEEN_KEY` / the `router.replace` fallback are gone) — the durable flag fully supersedes it, no same-device fast-path kept.
- Generated `src/lib/supabase/types.ts` updated to include the new column (Row/Insert/Update). `tsc` ✅ · eslint ✅ · 181/181 unit ✅.
**Pick up when:** nothing outstanding — code merged + migration applied. Optional: a live first-show→stamp→revisit-skips-C1 walk against a seeded 3/3-cap user (now possible since the column exists).

---
*Original entry (for reference):*

**File:** `src/app/messages/saved/[messageId]/ThreeShapedPageClient.tsx` (`SEEN_KEY`).
**What:** The contract says the C1 Three Shaped ceremony fires "once per user lifetime." With no profile flag and `db push` blocked (#30), V1 uses a `localStorage` latch — per-device, not per-lifetime. A cleared store or a second device can replay the ceremony.
**Why it matters:** low (replaying a warm, no-cost moment is harmless), but it's a spec divergence: "per lifetime" isn't actually guaranteed.
**Fix shape:** add a `profiles.three_shaped_ceremony_seen_at timestamptz` (or similar) column; the A7 page reads it server-side to decide the C1 branch and stamps it on first show. One column + one read/write; replaces the latch. Needs the Dashboard migration bundle (#30).
**Revisited 2026-06-14 — deferred, intentionally.** Considered two migration-free durable alternatives and rejected both for a P4: (a) a `usage_events` marker via the analytics path — `usage_events` is never pruned, but the write is best-effort (204-on-failure), so it can't *guarantee* once-per-lifetime; (b) a dedicated awaited write endpoint + an A7-render query — reliable, but disproportionate surface area for a harmless-replay edge. The localStorage latch is proportionate to the failure mode (a user who clears storage / switches device re-sees a warm, no-cost ceremony). The clean fix (the column above) waits on #30 — don't hand-apply a migration onto the broken history just for this.
**Pick up when:** #30 is resolved (migration pipeline fixed), or any other profiles-column work ships and this can ride along.

### 56. [P4] A4 example placeholder is birthday-flavoured but the copy is category-agnostic
**File:** `src/components/screens/messages/PersonalNoteScreen.tsx` (`NOTE_PLACEHOLDER`).
**What:** The 2026-06-15 clarity pass put an example in the note box — *"Example: Happy birthday, sweetheart. I'm so proud of the woman you've become."* It's the strongest clarity lever (shows what a note looks like), but it's birthday-specific while A4's copy is currently the same for all seven categories. On a comfort / holiday / future / checking-in message the birthday example is a mild mismatch.
**Why it matters:** small, but a "Happy birthday" example under a *Comfort* crumb reads slightly off for the exact audience we simplified this for.
**Fix shape:** make the example (and ideally the question + subtitle) category-aware — the `QUESTION_BY_CATEGORY` table already establishes the per-category pattern; add parallel `EXAMPLE_BY_CATEGORY` (and optionally `SUBTITLE_BY_CATEGORY`). Pairs naturally with the long-standing "category-aware question copy" placeholder the A4 prototype header already calls for.
**Pick up when:** the category-aware-copy workshop lands (it's the same single-table change A4 has always wanted), or any A4 copy revisit.

### 55. `useResource` keyed-refetch test flaky under full-suite load — ✅ RESOLVED 2026-06-14
**File:** `tests/unit/useResource.test.tsx` (`keyed refetch > refetches when the key changes`).
**Was:** after the key change, the test `waitFor`'d the fetcher to be called twice, then *synchronously* asserted `status === 'success'` — but status flushes a tick after the fetcher fires, so it raced and failed ~30-40% under full `vitest run` (passed in isolation). Surfaced during Chunk 10 gates; not caused by it.
**Resolution:** wrapped the status assertion in `waitFor` so it polls instead of sampling once. Verified 5/5 clean full-suite runs after the change.

### 53. Real ElevenLabs voice render — ✅ VERIFIED 2026-06-14 (both arms, real audio)
**What it was:** Every Step 6 path was proven against the real server + DB *except the one that spends vendor money* — real audio rendering. The fake-vendor voice 502s, which made all the failure/caps/routing/telemetry testing free; the render itself had never run for real.
**How it was verified (no clone needed):** reused an existing real cloned voice already in the ElevenLabs account (`vendor_voice_id 0t4EwPRMYoEXgdXWO9ul`, confirmed live via `GET /voices`). Temporarily pointed the test user's `voice_profile` at it (restored the fake id after), then ran both arms against the live backend as the authenticated test user:
- **Control arm** (`DEFERRED_AUDIO_ENABLED` off): `POST /generate` rendered inline → `audio_status=succeeded`, `audio_duration_ms=6142`, object in `essence-audio` storage (HEAD 200, 98,264 bytes, `audio/mpeg`), signed-URL playback OK. Real on-tone text generated.
- **Deferred arm** (flag on, server restarted inline): `/generate` first-listen rendered; `/regenerate` returned a **text-only** candidate (free re-roll — the cost model holds); **`/commit` rendered the candidate** → `committed=true`, `audio_status=succeeded`, `audioRenderCount=1`, `audioDurationMs=6612`, object in storage (HEAD 200, 105,787 bytes, `audio/mpeg`).
**Result:** the render plumbing (TTS call, storage write, duration measure, signed-URL playback) works for real on both arms, and the deferred cost model (render only on commit, free text re-rolls, render-count tracking) is confirmed. Cleanup: fake voice id restored, test pending rows deleted, dev server returned to flag-off default.
**Residual (minor):** `pending_generations.audio_bytes` reads null on the row (the real file is correctly sized in storage); bytes are stamped on the `messages` row at save, not the pending row — confirm that's intended vs a small gap if byte-accounting on pending rows is ever needed.

### 52. [P4] C3 "See what's coming" routes to Home until C2 Waitlist exists — ✅ RESOLVED 2026-06-14 (Chunk 9)
**File:** `src/app/messages/limit/VaultLimitPageClient.tsx` (`handleSeeWhatsComing`).
**Resolution:** C2 Waitlist shipped (`/messages/waitlist`); C3's "See what's coming" now routes to `/messages/waitlist?from=c3` (attribution threaded into the durable `legacy_waitlist.source` + `step6.waitlist_joined.surfaced_from`). Live-verified end-to-end. The only remaining "See what's coming" interim is A7's `third` variant → C1 (FOLLOW_UPS #38).

### 39. Saved-message immutability trigger crashes on every saved-row update (dangling `kind` reference) — ✅ RESOLVED 2026-06-12
**Resolution:** `20260611233000_fix_messages_immutability_trigger.sql` applied in the 2026-06-11 bundle. Probed live post-apply: mutable updates on saved rows pass, immutable mutations raise the intended "Message is immutable after saved", and the `source_generation_id` SET NULL cascade (promoted-pending-row deletes) works.

**Files:** `supabase/migrations/20260213133000_phase3_primitives_state_machines.sql:401` (the broken function), `supabase/migrations/20260421120000_messages_category.sql:16` (the column drop that broke it), fix: `supabase/migrations/20260611233000_fix_messages_immutability_trigger.sql`.
**What:** `prevent_message_mutation_after_saved()` (trigger `trg_messages_immutable`, BEFORE UPDATE on `messages`) compares `new.kind` — a column dropped when `category` replaced it. plpgsql resolves record fields at runtime, so since that drop **every UPDATE to a saved message raises `record "new" has no field "kind"`**: updates the guard should allow (non-artifact fields), legitimate status transitions, and the `on delete set null` cascade onto `messages.source_generation_id` when a promoted `pending_generations` row is deleted. Reproduced live during the A6 Chunk-2 smoke pass (any saved-row update errors; deleting a promoted pending row errors through the cascade).
**Why it matters:** today's flows survive because nothing updates a saved message yet (save is insert-only, discard refuses saved rows, the expiry sweep targets unsaved rows). The first feature that touches a saved row — soft delete, playback bookkeeping, vault management, or cleanup of promoted pending rows — hits a hard DB error. It also means the immutability guard "works" only by crashing, with the wrong error.
**Fix shape:** apply `20260611233000_fix_messages_immutability_trigger.sql` (recreates the function with `category` in place of `kind`). One `create or replace function`, no data change.
**Pick up when:** the next Dashboard migration bundle (#30) — apply it with whatever migration ships next; don't let it ride long.

## A7 design-architect pass (Step 6 spine, Chunk 3, 2026-06-12)

### 40. `--shadow-mineral` keyed to a retired teal — ✅ RESOLVED 2026-06-12 (Chunk 4)
**Resolution:** re-keyed warm in `globals.css` to `0 4px 14px rgba(110, 80, 40, 0.20)`. Verified live that all consumers now render the warm value: A4 CTA, A7, A6 (Save + "Hear this in your voice"), and the two globals consumers (`.vault-cta`, `.vault-restore-screen__cta`). A7's interim local override (set during Chunk 3) graduated into the token. Every consumer sits on a warm ground, so one warm value holds app-wide — no cool/warm split needed.
**Original:** `--shadow-mineral` was `rgba(74, 107, 126, 0.3)`, a teal-blue from an earlier mineral, while the live `--color-mineral` is `#7A8088`. Every mineral button cast a shadow bluer than itself; on warm grounds the cool cast read off-temperature. Flagged on two consecutive screens (A7, A4) by the design architect.
**Pick up when:** any tokens/visual-polish pass — pairs naturally with the stone-warmth pass (#35), same screens get re-verified.

## First Breath audio layer (from refactoring-system seed scan, 2026-06-12)

### 41. [P4] First Breath audio is spec'd only in code TODOs, untracked here

**Files:** `src/components/screens/FirstBreathSequence.tsx:65–75`, `src/components/screens/FirstBreathSequence.phases.ts:95,104`.
**What:** five in-code TODOs spec the First Breath audio design (soft pad 4:30 seamless loop at −24 LUFS, harmonic-cluster one-shot, low resonant bell on the bloom peak) with no corresponding FOLLOW_UPS entry — the only marker debt in `src/` not already tracked (house rule: no in-code TODO without an entry). This entry adopts them.
**Why it matters:** the ceremony currently plays silent; the audio layer is a designed-but-unbuilt half of the First Breath moment. No functional risk.
**Fix shape:** source/produce the three assets per the in-code spec and wire them in the consumer (the phases file deliberately leaves wiring to the consumer), or explicitly descope audio and convert the TODOs into a pointer at this entry.
**Pick up when:** a First Breath polish pass, or whenever audio-asset work is scheduled. Pairs with the #25 exit-destination decision since both touch the same sequence.

## Discovery pass (triage 2026-06-13)

Read-only discovery run per `docs/DISCOVERY_AGENT.md`. Health at scan time: typecheck ✅ · lint ✅ · unit tests 154/154 ✅ (all green on `main`). Active feature branch `feat/step6-a6-screen` (last commit 2026-06-13) is mid-construction across the whole Step 6 message-creation flow — those files were treated as work-in-progress and excluded from this pass. A recurring pattern surfaced across stable subsystems: a Supabase write whose `{ error }` is not checked, so a failed save resolves as if it succeeded. The five below are the distinct, real instances; the Stripe webhook handlers and `upsertSubscription` were reviewed and found correctly guarded (errors throw, upserts are idempotent) — no entry warranted there.

### 42. [P2] ✅ RESOLVED (2026-06-17) — Onboarding completion swallows a failed save — the user's profile is silently discarded
**Resolution (two halves):**
1. *Loud failure (shipped earlier):* `completeOnboarding` throws on a lost session (`page.tsx:113`) and delegates the write to `persistOnboardingCompletion`, which throws on a write error. `OnboardingPageClient.handleComplete` lets that rejection bubble (navigation is skipped on failure — only a confirmed save reaches `router.push`).
2. *Retry-in-place error UI (the deferred sibling, 2026-06-17):* `OnboardingScreen.handleComplete`'s catch now maps the error to user-facing copy in `submitError` state instead of only `console.error`-ing. Two variants — transient ("Something kept us from saving just now. Your answers are safe — tap Begin to try again.") vs. session loss ("Your session timed out. Please refresh and sign in again — your answers are saved on this device."). `Screen12Ready` renders it as a `role="alert"` above the still-enabled Begin button (`.onboarding-ready-error`, warm register mirroring the photo-error style + reduced-motion rule). The draft is never cleared on failure, so every answer survives the retry. `/dev/onboarding` gained a "simulate save failure" toggle (transient/session) to exercise both copy variants without a real DB/session error; both verified in-browser. Unit-tested in `tests/unit/onboarding-screen12.test.tsx`. Original entry below.

`src/app/onboarding/page.tsx:121-133` — the `completeOnboarding` server action runs the final `profiles` UPDATE (first/last name, DOB, city, state, `onboarding_completed_at`) but never inspects the returned `error`. The `uploadAvatar` action directly below it (`page.tsx:179-186`) *does* check and throw, so this is an asymmetry, not a house pattern. `OnboardingPageClient.handleComplete` (`OnboardingPageClient.tsx:38-39`) awaits the action then unconditionally `router.push(ROUTES.record)`. A second swallow sits at `page.tsx:109` (`if (!user) return;` — a silent no-op on an expired session).

**Why it matters:** if that UPDATE fails (RLS, transient DB error, constraint), the action resolves as though it saved, the wizard navigates the user into the app, and everything they typed during onboarding is lost — `onboarding_completed_at` stays null, so they're treated as not-onboarded next visit. This is the first flow every new user hits, so a misconfiguration here loses data for *all* new users, invisibly.
**Fix shape:** capture `{ error }` on the update and `throw` on failure (mirror `uploadAvatar`); throw rather than silently return on the expired-session branch; have `handleComplete` surface the error instead of navigating. The smallest correct fix is to make the failure loud so the user can retry rather than lose input.
**Pick up when:** soon — shipping-path data integrity. Agent-fixable (error check + throw); the only product touch is the eventual error-UI copy, which can be a separate follow-up.

### 43. [P3] Voice-creation success doesn't verify its DB write — user can be told "ready" while the profile stays "processing"
`src/app/api/voice-profiles/[id]/start/route.ts:302-315` — on a successful ElevenLabs result the route updates `voice_profiles` to `status='ready'` (+ `vendor_voice_id`) but doesn't check the returned error, then returns `{ status: "ready" }`. Both *failure*-path updates in the same route (≈lines 131 and 177) are error-checked — again an asymmetry within one file.

**Why it matters:** if that write fails (or the `.eq("status","processing")` monotonic guard matches zero rows), the client is told the voice is ready while the row is still `processing` / has no `vendor_voice_id`. The ElevenLabs voice was created and billed, but the result isn't persisted — the profile then drifts into the 3-minute staleness window and reads as timed-out/failed, so the user sees failure after a successful, paid creation.
**Fix shape:** destructure `{ error }` on the success update; on error, log and return 500 (the voice exists at the vendor but local state is lost — surface it rather than 200-ing). Consider logging when the monotonic guard updates zero rows.
**Pick up when:** next time the voice-creation pipeline is touched. Agent-fixable.

### 44. [P3 · owner-paired (Stripe)] Checkout doesn't check the customer-id save — a failed write spawns duplicate Stripe customers
`src/lib/stripe/create-checkout-session.ts:85-88` — after creating a new Stripe customer the code writes `stripe_customer_id` back to `profiles` without checking the error. The profile *lookup* a few lines up (`:40`) is checked and throws loudly; the write isn't.

**Why it matters:** if that write fails the current checkout still works (the id is held in memory), but the profile keeps `stripe_customer_id = null`. The next checkout attempt finds no stored id (`:63`) and creates *another* Stripe customer — so a user accumulates duplicate customer records in Stripe, splintering their billing/subscription history across customers. Money-path hygiene.
**Fix shape:** capture `{ error }` on the update and throw (matching the lookup's pattern) so a failed persist aborts before checkout rather than silently leaking a duplicate-customer path. Owner-paired because it sits in the Stripe surface.
**Pick up when:** before public launch, or the next Stripe-surface pass.

### 45. [P4] Signed-URL routes log usage as "success" before the work that can fail
`src/app/api/audio/init-upload/route.ts:74-80` and `src/app/api/audio/playback-url/route.ts:38-44` — both call `recordUsageEvent(..., outcome: "success")` *before* the operations that can still fail (the DB insert + `createSignedUploadUrl` in init-upload; the clip fetch, ownership/status checks, and `createSignedUrl` in playback-url). The established pattern — `recordUsageEvent` defaults to `outcome: "started"`, then `updateUsageEventOutcome` finalizes, used correctly by `/voice-profiles/[id]/start` — is bypassed here.

**Why it matters:** the usage ledger records failed attempts as "success" (telemetry is wrong), and because the row is written before the work, a failed sign still consumes the per-minute signed-URL budget. Low blast radius — sign failures are rare and it's the user's own budget — but it's a correctness drift from the ledger pattern used elsewhere.
**Fix shape:** record with the default `"started"` up front and call `updateUsageEventOutcome(..., "success")` after the URL is actually signed, or simply move the `recordUsageEvent` call below the sign.
**Pick up when:** any pass touching rate-limit/usage telemetry. Agent-fixable.

### 46. [P3] init-upload's storage_path write isn't checked — a silent failure breaks commit; plus a no-op extension ternary
`src/app/api/audio/init-upload/route.ts:115-118` — after computing the object path the route updates `training_clips.storage_path` from `"pending"` to the real path but doesn't check the error (the insert above and the sign below both *are* checked). `audio/commit` (`route.ts:49-52`) reads `row.storage_path` and downloads from it; if the update silently failed, the path stays `"pending"`, so commit downloads a non-existent object and returns "Object not found in storage" — the clip the user just recorded fails to commit with a confusing error. Adjacent: `:112` has `const ext = mime.includes("webm") ? "webm" : "webm"` — identical branches, a no-op ternary that hard-codes `webm` regardless of mime (dead/placeholder logic; harmless today but misleading, and a latent bug if non-webm clips ever flow through).

**Why it matters:** the unchecked write turns a rare DB hiccup into a lost recording with an unhelpful error, on the core voice-training upload path.
**Fix shape:** capture `{ error }` on the storage_path update and return 500 on failure (match the insert/sign handling). Separately, delete the dead ternary (`const ext = "webm"`) or derive the extension from `mime` if multiple formats are intended.
**Pick up when:** next time the audio-upload pipeline is touched. Agent-fixable.

### 47. [P2] ✅ RESOLVED (Chunk 7, 2026-06-13) — Step 6 forward `/generate` handoff is stubbed — A4 submit dead-ends in production; plus `isFinalOfThree` is hardcoded false
**Resolution:** A4→A5 forward wiring landed (`Step6_A4A5_Wiring_Chunk7.md`). `/messages/new/page.tsx` fetches the ready `voiceProfileId` + saved count; `MessagesNewPageClient.onGenerate` POSTs `/generate` and routes to A6 on success; the orchestrator added the `generating` step (A5) with the honoring→A5 overlapped seam, retry, and Adjust-note. `isFinalOfThree` + `flow_started.saved_count_before` now derive from the real saved count. Live-verified the failure path (fake-vendor 502 → A5.b); success→A6 dev-mocked per the verify decision. Original entry below for history.


`src/app/messages/new/MessagesNewPageClient.tsx` — `handleGenerate` is a placeholder that `console.warn`s and resolves `{ ok: false }`. The A3 chunk (2026-06-13) wired the A2→A3→A4 client spine and exposed the `onGenerate(GenerateRequest)` handoff on `MessageCreationFlow`, but the real cold-start generation is deferred to the A4→A5 chunk. Separately, `MessageCreationFlow.tsx` passes `isFinalOfThree={false}` to A3 unconditionally — the "last of three" variant (ceiling note + warm tone + softer copy) never shows in production because the saved-count is not fetched.

**Why it matters:** on production `/messages/new` a user can walk A2→A3→A4 and tap "Shape it from this" / "Use a generic message", and nothing happens (not-ok returns A4 to input) — the spine is visibly incomplete until generate is wired. And every third-message user sees the default A3 instead of the intended ceiling-moment variant. Neither is a data risk; both are completeness gaps the spine build expects.
**Fix shape:** (1) In the A4→A5 chunk, implement `handleGenerate`: fetch the user's `voiceProfileId` server-side in `/messages/new/page.tsx` (it already fetches recipients), thread it down, POST `/api/messages/generate` with the recipient branch (existing `recipientId` vs pending name/relationship/descriptor) + category + note per `messageGenerateSchema`, and on success `router.push(messageGenerationRoute(generationId))` — resolving the "A5 wait vs A6 preview" landing. (2) Fetch the saved-message count (the same query Q4's vault-cap UX gate needs — see the `/messages/new/page.tsx` note) and pass `isFinalOfThree={savedCount === 2}` through the orchestrator (also replaces the hardcoded `saved_count_before: 0` in `flow_started`).
**Pick up when:** the A4→A5 forward-wiring chunk (next on the Step 6 spine after A3). Both halves live in the same page-layer fetch.

## Discovery notes — triggers that came true (triage 2026-06-13)

Production Onboarding Screen 10 (`src/components/screens/onboarding/Screen10.tsx`) is now live with real Supabase avatar upload (`usePhotoUpload` + the `uploadAvatar` action in `page.tsx`), so several Screen 10 photo follow-ups have had their "Pick up when" triggers fire:

- **#6 (photo fit in circle):** the client-side half shipped — `globals.css:1446` sets `object-fit: cover; object-position: center;` on `.onboarding-photo__img`. Only the server-side thumbnail half remains; #6 should be narrowed to that.
- **#7 (screen-reader announcement on photo success):** appears implemented — `Screen10.tsx:156-158` renders `<p class="sr-only" role="status" aria-live="polite">Profile photo added.`, which is #7's exact fix shape. Recommend the fixer verify and strike.
- **#9 (re-entry shows previously-uploaded photo):** appears addressed — the page mints a signed URL for an existing avatar and Screen 10 renders it via `displayUrl = preview ?? avatarUrl`, replacing the prototype's `resetPhoto()`. Recommend the fixer verify and strike.

These are left for the fixer to strike (resolution strikes are the fixer's lane per the coordination rule); flagged here so they don't linger as falsely-open.

## Step 8 Home B — deferred wiring (from the Home B build, 2026-06-17)

The completed-user hub shipped (`src/components/screens/home/HomeBScreen.tsx`,
`/home` branch, `/dev/home-b`, unit tests). Three connection-pass gaps were
deliberately left, each safe to defer:

### 57. [P3] First-arrival into Home B is param-driven but the upstream handoff isn't wired, and it isn't durable
`src/app/home/page.tsx` reads `?welcome=1` → `firstArrival`, driving the visit-#1 beat (rich→cream ground settle, heavier stagger, the one-time "This is home now." line). **Nothing currently routes to `/home?welcome=1`** — the §6.4 arc lands the user on Home B "right after creating their first message," so the message-save → home handoff (Step 6 A7 / first-breath exit) should append `?welcome=1` on the *first* landing. Also, the beat is **not durable**: a refresh with the param still in the URL re-shows it. A once-per-lifetime guard (a `profiles` flag, e.g. alongside `three_shaped_ceremony_seen_at`, or stripping the param after first paint) would make it true to "visit #1."
**Why it matters:** until wired, the §6.4 "new chapter" moment never fires in production (only the calm steady state shows). Low risk — purely additive.
**Fix shape:** (1) set `?welcome=1` at the first-message→home handoff; (2) optional durable latch so it's once-per-lifetime, not once-per-param.
**Pick up when:** the Step 6/Step 8 connection pass (after the message-creation flow lands its forward routing), or when First Breath's exit destination (FU-25) is decided.

### 58. [P4] Home B settings affordance dead-links until Step 9
`HomeBPageClient`'s `onSettings` is an intentional no-op — the gear renders (the affordance lives on Home B per the handoff) but Step 9 (Settings & Trust, M3) isn't built, so there's no route yet. Wire `onSettings` to the settings route when Step 9 lands. **Pick up when:** Step 9 / M3.

### 60. [P3 · a11y] ✅ RESOLVED (2026-06-17, owner-approved) — Shared primary buttons failed WCAG AA (white text on `--color-mineral`)
Surfaced during the Home B consistency audit. Both the app-standard `.btn-primary` and every bespoke primary `.btn` put near-white text on `--color-mineral` (#7A8088) ≈ **3.98:1 — below the WCAG AA 4.5:1 floor**.
**Resolution:** repointed every text-bearing primary-CTA *fill* from `--color-mineral` → `--color-mineral-dark` (#656B73, white ≈5.38:1), and their hovers → `--color-mineral-darker` (#565C63, added to `@theme` this session). **16 buttons** across the app: globals `.btn-primary`, `.vault-cta`, `.vault-past-due-banner__cta`, `.vault-restore-screen__cta`, `.shelf-btn-primary`/`-play`/`-retry`/`-modal-primary`; and the message-flow `.btn`s in CategorySelector / Generation / SaveConfirmation / ThreeShaped / PersonalNote / PreviewRefine / VaultLimit / Waitlist. **Deliberately left on `--color-mineral`** (decorative / non-text / graphical objects that meet the 3:1 non-text threshold, not the 4.5:1 text rule): progress-bar fills, step/journey number badges, the record checklist icon, status/pulse dots, the audio scrubber thumb + fill, the player play-icon toggle, and the waitlist feature checkmark; plus the dev-only shelf rail. Visual-verified the darker fill + warm shadow on shelf, save-confirmation, onboarding (shared `.btn-primary`), and the message flow — reads warm, not muddy. `HomeBScreen`'s bespoke create CTA already used `--color-mineral-dark`, so it's now consistent with the rest; it keeps its bespoke class for the shimmer + hero treatment.

### 59. [P3 · needs event-naming input] Home B has no analytics instrumentation
The screen emits no events (home-B viewed, create tapped, restore tapped, waitlist tapped, preview-row → shelf). The prototype/handoff didn't specify an event contract (cf. FU-16 for the same gap on B2/B3 surfaces). **Why flag now:** telemetry decisions are cheap during design. **Pick up when:** whoever owns the analytics contract next touches `docs/analytics/` — capture Home B's events there, then instrument.
