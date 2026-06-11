# Follow-ups

Tech-debt and deferred items surfaced during other work. Revisit when touching the related area.

## RecordingUpload / useUploadPipeline (from PR #33, 2026-04-19)

### 1. Prompt auto-advance uses ref-during-render
`src/components/audio/RecordingUpload.tsx` — the prompt auto-advance block reads/writes a ref during render. It was previously masked by the component's size; after extracting `useUploadPipeline`, the shrunken component now trips `react-hooks/refs`. Worked around with targeted `eslint-disable-next-line` comments.

**Fix:** restructure the auto-advance into a `useEffect` that keys off `promptIndex` and reset-equivalent state.

### 2. Upload failure leaves hook status stuck at `'failed'`
`src/components/audio/RecordingUpload.tsx` — on upload error the component surfaces its own error state but never calls `uploadPipeline.reset()`. The hook's internal `status` stays `'failed'` until a new `upload()` call is initiated.

**Why it's harmless today:** nothing outside `onStageChange` reads hook status.
**Why it could bite:** any future consumer that renders off `status` (retry UI, analytics, progress bar) will see stale `'failed'` state between attempts.
**Fix:** call `uploadPipeline.reset()` in the catch path, or replace local error state with the hook's.

## audio/commit route (from PR #31, 2026-04-19)

### 4. `AUDIO_BUCKET` import is only a fallback
`src/app/api/audio/commit/route.ts:7` — imports `AUDIO_BUCKET` but uses it only as a fallback (`row.storage_bucket || AUDIO_BUCKET`). The `storage_bucket` column is set on insert in `audio/init-upload` and is non-null in practice, so the fallback is dead weight.

**Fix:** drop the fallback and the import, or confirm the column can legitimately be null and document why.

## useUploadPipeline cancel (from PR #38, 2026-04-19)

### 5. `cancel()` lands the hook in `'failed'`, not a cancelled/idle state
`src/lib/upload/useUploadPipeline.ts` — the hook's `try/catch` wraps the whole pipeline, so when `cancel()` triggers an `AbortError`, it hits the catch block like any other error and sets `status: 'failed'`. Consumers calling `cancel()` will observe a failed state with an abort-error message.

**Why it matters:** most cancel-aware hook APIs distinguish abort-caused rejections (typically → `'idle'` or `'cancelled'`) from real failures. Dashboards or retry UIs that key off `status: 'failed'` will falsely fire on user-initiated cancels.
**Fix:** detect `AbortError` in the catch block and either transition to `'idle'` (most common) or introduce a `'cancelled'` status. Update the PR #38 test that currently asserts current behavior.

## Onboarding Screen 10 (from Bucket B1 review, 2026-04-19)

Omissions surfaced during the Screen 10 photo control review. Named as follow-ups rather than folded into the B1 Terminal doc because they're production-layer, adjacent-flow, or accessibility-layer concerns that deserve their own treatment.

### 6. Photo fit inside circle (object-fit + aspect handling)
Real uploads are rarely square. Portrait 9:16 photos, landscape DSLR exports, and panorama captures all hit Supabase Storage at native aspect ratio. The prototype pretends the photo is already square.

**Where it surfaces:** the `<img>` that replaces the empty circle state. Needs `object-fit: cover` + `object-position: center` at minimum. Server-side thumbnail generation (Supabase Storage transform or a separate render step) is the real fix.
**Pick up when:** Screen 10 moves from prototype to first real Supabase Storage integration. Probably during the B1 Terminal pass, but treated here because thumbnail strategy spans onboarding + Screen 9 + Home B + all downstream message cards. One decision, many consumers.

### 7. Screen reader announcement on photo success
When the photo lands, nothing is announced to assistive tech. The stone beating to `ready` is `aria-hidden="true"` by design. "Looking good" is visible text but not in a live region. VoiceOver/TalkBack users get silence on what is supposed to be a small positive moment.

**Fix shape:** add `role="status"` + `aria-live="polite"` to the "Looking good" paragraph, OR use a dedicated `<p class="sr-only" role="status" aria-live="polite">Photo added.</p>` that announces independently of visible copy.
**Pick up when:** accessibility pass on onboarding (not yet scheduled). Deferred out of B1 because it's a pattern decision that should cover all onboarding success beats, not just Screen 10.

### 8. Reduced-motion fallback for stone beat + upload ring
The in-flight breathing ring and the success-state stone beat (idle → ready → idle) both depend on motion. Under `prefers-reduced-motion: reduce`, the ring should be a static mineral-tinted border, and the stone state change should still occur (the color/glow endpoint is semantically meaningful) but without the 1200ms lerp.

**Pick up when:** Bucket B3 (Reduced-motion fallbacks). Already in scope there — cross-reference this entry so it doesn't get missed.

### 9. Re-entry state for previously-uploaded photo
If a user navigates forward past Screen 10 and then navigates back via Screen 9's "Change" link or browser back, Screen 10 currently resets (`prototypes/voice-recording-flow.html:1890`, `if (n === 10) resetPhoto()`). That's wrong for production. The circle should show the previously-uploaded photo with the "Replace" link visible and the CTA showing "Continue."

**Pick up when:** B1 Terminal doc lands and moves into Session 4 onboarding build. This is a state-persistence concern that lives in the parent `useOnboardingForm` hook, not the Screen 10 component spec.

### 10. File name surfacing on error copy
Current error copy ("That photo didn't come through. Try another, or continue without one.") is file-name-agnostic. For a user picking from multiple similar files, knowing *which* file failed helps recovery. But long file names have layout problems.

**Fix shape (when picked up):** if the file name is under ~24 chars, surface it inline (*"`IMG_4392.heic` didn't come through."*); if over 24, omit. Needs an error-card layout that accommodates a monospace file name without breaking the warm register.
**Pick up when:** low priority. Only matters if telemetry shows repeated errors during photo upload. Not an onboarding-polish concern.

### 11. Network offline state
If the user is fully offline when they tap the circle and pick a file, the upload fails differently than a rate-limited or size-rejected upload. Current error copy covers all three cases generically, which is probably fine, but a dedicated offline message ("You're offline. Try again when you're back online, or continue without a photo.") would be warmer and more accurate.

**Pick up when:** production QA reveals the generic copy doesn't guide users well enough through the offline path. Might never matter — flagged only.

### 12. Photo deletion path
Current spec has "Add photo" and "Replace" but no "Remove." If a user uploads a photo, moves through onboarding, and later decides they want no photo at all, the only path today is upload then delete account. Settings page needs a "Remove photo" control downstream.

**Pick up when:** Settings page Bucket work. Not an onboarding concern — flagged here so it doesn't fall through the cracks between onboarding and settings design passes.

## Onboarding 6 → 7 act transition + Reduced motion (from Bucket B2 / B3 review, 2026-04-20)

Omissions surfaced during review of the act-transition shimmer (B2) and reduced-motion fallbacks (B3) Terminal docs. Neither doc addresses these, and both touch the 6 → 7 handoff or the reduced-motion surface area. Flagged as follow-ups rather than folded back in because they're decision-level (not implementation-level) and deserve a separate pass.

### 13. ~~Screen 7 stone-leads-title choreography vs. act-transition wash timing~~ — RESOLVED 2026-04-20
Declared deferred with explicit pairing constraint in the B2 Terminal doc's "Out of scope" section: when the stone-leads-title choreography is implemented, the stone's leading beat must be pinned at ≤180ms so the wash peak (180–450ms) lands *after* the stone has asserted itself. Preserves the "stone leads, wash confirms, screen settles" ordering. Choreography not implemented in this pass.

### 14. ~~Act-transition wash while an earlier wash is still playing~~ — RESOLVED 2026-04-20
`chrome.tsx` now uses an `actTransitionActive` boolean state that sets `false` only on `onAnimationEnd`. While the wash is playing, rapid re-entries into the 6 → 7 transition are no-ops (`setActTransitionActive(true)` on an already-true state is a no-op setState). Behavior is: one wash at a time, second qualifying arrival within the 900ms window is ignored. Documented in the component comment above the state hooks.

### 15. Act-transition wash on Screen 7 re-entry
If the user goes 7 → back → 6 → 7 again via the back button or `←` key, does the wash replay? With the #14 fix, the answer is now: yes, if the previous wash has finished (≥900ms elapsed since the last 6 → 7 arrival). If the user re-enters within the 900ms window, the in-flight wash continues without restart. This resolves the rapid-back-and-forth case; the "fresh wash on every *completed* re-entry" case remains — which is the defensible design: the user deliberately chose to re-experience the act transition, so the wash accompanies it.

If telemetry later shows users find the re-play distracting, revisit with a `hasPlayedThisSession` ref scoped to the OnboardingScreen mount.
**Pick up when:** observation-driven, not scheduled.

### 16. Analytics instrumentation for B2 / B3 surfaces
Neither doc specifies events. The act-transition wash is a named gesture and may warrant a `screen_act_transition_viewed` or similar; reduced-motion activation rate is useful for product understanding (how many users hit the RM code paths, which screens, how often does it toggle mid-session). Without guidance, Terminal will either invent events or ship nothing.

**Why flag it now:** telemetry decisions are cheap during design, expensive after a feature ships and retroactive events have to be added.
**Pick up when:** whoever owns the onboarding analytics contract next touches `docs/analytics/`. Not blocking; capture a single line in B2/B3 Terminal docs saying "analytics: see docs/analytics/ — not in scope here."

### 17. Dark mode behavior for act transition + reduced motion
B2 declares dark mode out of scope explicitly. B3 does not — and reduced-motion + dark mode is a plausible user combination (e.g., vestibular issues + night-mode OS-wide). The warm-ceramic BreathStone gradient, the mineral wash color, and the `mix-blend-mode: multiply` layer all read entirely differently against a dark surface.

**Where it surfaces:** `globals.css` palette tokens, `breathStoneEngine.ts` body gradient (locked per design rules), wash overlay color.
**Pick up when:** Bucket C4 dark-mode token map lands. Cross-reference both B2 (wash color/blend) and B3 (ensure RM rules don't assume light surfaces) so the dark-mode pass covers the act-transition surface area.

### 18. BreathStone initialization / lerp-interrupt state during 6 → 7
If the canvas is still initializing (first-paint not yet rendered) or the state lerp is mid-flight when the 6 → 7 trigger fires on a slow device, what does the wash land on top of? On older Android at 4× throttle, the stone may still be lerping idle → guidance when the wash plays, producing a half-warmed body under a peak wash — potentially a muddy mineral-on-cool composite.

**Why flag it now:** low probability, not zero. The 4× throttle verification in B3 exercised RM but not the default-motion slow-device path.
**Pick up when:** next device-QA cycle on real older hardware. Could warrant a settle-wait pattern (`requestIdleCallback` or a timestamp guard) before firing the wash, or it might be a non-issue in practice.

### 19. ~~`prefers-reduced-transparency` for B2's `mix-blend-mode` layer~~ — PARTIAL 2026-04-20
Flagged explicitly in the B2 Terminal doc's "Out of scope" section with a solution shape (solid-color tint fallback that approximates the blended mineral wash). Not implemented; tracked for a future accessibility pass beyond RM.

### 20. ~~Stone state-change timing during the 400ms screen crossfade (6 → 7)~~ — RESOLVED 2026-04-20
Declared explicitly in the B3 Terminal doc's new §8: **t=0 of the crossfade** (synchronous with `setCurrentScreen(n)`), then `settleDelay` (500ms default, 600ms on Screen 11) before the engine begins lerping. Sequence table and rationale recorded in-doc. Same trigger moment under reduced motion; engine snaps instead of lerps. Applies to all cross-screen stone-state flips, not just 6 → 7.

## Supabase migrations (from Session 7b, 2026-04-20)

### 21. Duplicate migration version IDs block CLI `db push`
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

### 22. Should `/api/voice-profiles/[id]/start` gate on paid status?
Session 7c's spec called for a "voice processing trigger" on `checkout.session.completed` (Site A) and on the `created → collecting` transition (Site B), so that paid users would land in `voice_profiles.status = 'processing'`. Both sites were **dropped from 7c** because the repo's `'processing'` status semantically means "ElevenLabs is currently running," and flipping to it without invoking ElevenLabs would leave profiles stuck (the `/start` route's 3-minute staleness check would eventually treat them as timed out).

The real underlying question is a product one: **should voice creation require a paid subscription before ElevenLabs is invoked?**

**Current state:** `/api/voice-profiles/[id]/start` has zero payment gating. Any authenticated user with enough clips can trigger ElevenLabs on their voice profile. Voice creation and payment are entirely decoupled.

**Options if this gets addressed:**
- **(a)** Add a payment check inside `/start`; 401/402 if the user isn't on `trial`/`active`. Simple, but forecloses any "free preview" product decisions.
- **(b)** Keep `/start` open; rely on storage/retention gates downstream (e.g., voice profiles for unpaid users are deleted after N days). More product work, more leeway.
- **(c)** Keep status quo — voice creation is free, only vault storage/delivery gates on payment.

**Pick up when:** product decides how strongly payment should gate voice creation. Not blocking 7c, 7d, or deploy — vault surfaces already gate on subscription state. This is about ElevenLabs cost exposure, not user-facing flow integrity.

## Stripe / restore surface (from Session 7c, 2026-04-21)

### 23. Customer Portal cannot resurrect a deleted subscription — restore screen dead-ends for lapsed users
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

### 24. `VoiceCreationView` success state routes to `/app/messages/new` instead of First Breath
`src/components/voice/VoiceCreationView.tsx:243` — on `status === 'ready'`, the success screen's primary CTA pushes to `/app/messages/new`, skipping the ceremonial First Breath Stone moment at `/app/record/complete` entirely.

**Affected file:** `src/components/voice/VoiceCreationView.tsx` — the `onClick={() => router.push("/app/messages/new")}` in the success branch (~line 243–246).

**Fix shape:** one-line change — swap the push target to `/app/record/complete`. First Breath's server-side guards at `src/app/app/record/complete/page.tsx:14–36` already admit `ready`/`processing`/`queued` profiles, so routing there on success is safe.

**Open question tied to FU-25:** if VoiceCreationView success routes *into* First Breath, FU-25's exit destination question becomes load-bearing.

**Pick up when:** connection pass after Sessions 8/9/10 land the surfaces. Grep-verify that nothing else routes to `/app/messages/new` directly from the voice-creation flow at that time.

### 25. `FirstBreathSequence` exits to `/app/record/complete/stub` — decide final destination
`src/components/screens/FirstBreathSequence.tsx:100` — the CTA handler pushes to `/app/record/complete/stub` with an inline TODO (`// TODO: replace with router.push('/app/checkout') when Session 7 is complete`). Session 7 is complete (7a/7b/7c shipped), but the stub hasn't been replaced because the destination is still a design decision.

**Candidates:**
- `/app/messages/new` — the Session 8 surface. First Breath → immediate message creation.
- Dedicated "vault sealed" screen — ceremonial closure before returning to app surfaces. Fits the arc but adds a screen to build.
- `/home` / `/app` — neutral return. Simplest, but discards the narrative momentum First Breath builds.

**Why deferred:** depends on how Session 8's message-creation flow feels in context. A user who just witnessed the First Breath ceremony may or may not want to immediately type a message — the right next step isn't obvious until Session 8 ships.

**Pick up when:** connection pass, after Session 8 (`/app/messages/new`) is testable end-to-end.

## Supabase generated types not wired up (from Session 8 micro-pass, 2026-04-21)

### 26. DB enum types are hand-written unions; no generated types file
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

### 27. Per-category voice settings not wired into TTS
`src/lib/elevenlabs.ts` `generateSpeech()` accepts only `{ voiceId, text }` — it does not send ElevenLabs voice settings. `src/lib/messageTemplates.ts` defines tuned `voiceSettings` per category (stability/similarity/style/speakerBoost, e.g. comfort is steadier, birthday more expressive), but `/api/messages/generate` and `/regenerate` call `generateSpeech` without them, so every category renders with ElevenLabs defaults.

**Why it matters:** the emotional register tuning (MASTER_SPEC Ch. 8) is the point of per-category voice settings — losing it flattens comfort/birthday/etc. to one delivery.
**Fix shape:** extend `GenerateSpeechParams` with an optional `voiceSettings` and forward it in the TTS request body (`voice_settings`); pass `getCategoryVoiceSettings(category)` from both generation routes. Keep defaults when omitted so existing callers (`/api/messages` POST) are unaffected.
**Pick up when:** first voice-quality pass on Step 6 audio, or when tuning ElevenLabs output.

### 28. Pending audio lives in `essence-audio`, not the contract's `messages` bucket
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

### 30. `db push` blocked by version-collision in early migration history
After fixing the CLI's database connection (added `SUPABASE_DB_PASSWORD` to `.env.local`, which cleared the `cli_login_postgres` permission error), `supabase db push --dry-run` reports: *"Remote migration versions not found in local migrations directory"* and suggests `supabase migration repair --status reverted 20260421` / `supabase db pull`.

**Root cause:** several early migration files use short, non-unique version stubs — e.g. three `20260214*` files all parse to version `20260214`, two `20260412*` files to `20260412`, and `20260421_add_failed_attempt_count.sql` to `20260421`. The remote `supabase_migrations.schema_migrations` table (whose `version` is a primary key) can't hold one row per file when versions collide, so the CLI sees the same version as both "local-only" and "remote-only" and refuses to push. The *schema itself is correct* (verified via `gen types` — all expected tables/columns/enums exist); this is purely a bookkeeping mismatch in the migration-history table.

**Why not fix reactively:** the CLI's suggested `migration repair --status reverted <version>` marks a version as un-applied, which would make `db push` try to RE-RUN an already-applied migration (e.g. re-add `failed_attempt_count`) and error (`column already exists`). Reconciliation needs care, not a one-liner.

**Impact:** low. New migrations are applied reliably via the Dashboard SQL Editor bundle (the method used to apply the 4 Step-6 migrations on 2026-06-10). `db push` is just not usable until history is reconciled. Type generation (`--project-id`) and direct-DB reads work fine.

**Fix shape (do in a dedicated, calm pass — not mid-feature):**
1. Inspect `supabase_migrations.schema_migrations` contents on remote (Dashboard SQL Editor: `select version, name from supabase_migrations.schema_migrations order by version;`).
2. Decide a strategy: either (a) rename the colliding local migration files to unique full timestamps and re-record matching history rows, or (b) `migration repair --status applied <version>` for each version that's actually applied but recorded inconsistently — verifying against the live schema before each repair so nothing gets marked for re-run.
3. Confirm with `db push --dry-run` showing a clean "up to date" before trusting `db push`.

**Pick up when:** before relying on `db push` in CI/automation, or the next time migration history needs to be authoritative. Until then, Dashboard bundle is the path. Supersedes the CLI-auth half of #26 (auth itself is fixed).

## Deferred Audio — "Keep the current one" candidate clear (from Session 8, 2026-06-10)

### 31. "Keep the current one" doesn't clear the candidate server-side — ✅ RESOLVED 2026-06-11
**Resolved by** a `mode: "keep"` on `POST /api/messages/regenerate` that nulls `candidate_text` / `candidate_template_variant` for the generation (no LLM, no TTS, no voice-profile dependency — runs before the profile check). Idempotent: a no-op when no candidate is present, so a redundant call or a refresh-then-keep is safe. Emits a `step6_candidate_kept` server log (see `docs/analytics/2026-06-11-step6-candidate-kept.md`). Covered by two smoke tests in `tests/smoke/messages.spec.ts` (clears a present candidate while leaving the committed take + counts untouched; idempotent no-op with no candidate). The A6 client still needs to call `mode: "keep"` when wiring the "Keep the current one" button — the server half is now in place so the client wiring and durable clear can land together. Original entry below.

Under `DEFERRED_AUDIO_ENABLED`, `/regenerate` writes a candidate into `pending_generations.candidate_text` / `candidate_template_variant`. The A6 "Keep the current one" action (discard the un-heard candidate, return to the committed take) is currently client-only — it stops showing the candidate, but the row's `candidate_*` columns linger until the next `/regenerate` overwrites them, `/commit` promotes them, or `/discard` deletes the row.

**Impact:** low and not user-visible in the happy path. The lingering candidate is never saved (`/save` reads the committed fields only) and never auto-committed. The one rough edge is **resumability**: if the user taps "Keep the current one" and then refreshes, a server-side rehydrate would surface the stale candidate again, contradicting their choice.

**Fix shape:** a tiny server action to null out `candidate_text` / `candidate_template_variant` for the generation — either a `mode: "keep"` on `/regenerate`, or fold it into A6's page hydrate. Cheap; pair it with the A6 build so the client wiring and the server clear land together.

**Pick up when:** building A6 (the screen that owns the candidate-vs-committed UI), since that's where "Keep the current one" is wired.

## RecordingUpload clips-list fetch (from FU-1 refactor, 2026-06-11)

### 32. Clips-list effect uses synchronous-setState-in-effect (eslint-disabled)
`src/components/audio/RecordingUpload.tsx` — the `voiceProfileId`-keyed clips-list data fetch resets list/loading/error state synchronously in the effect body (the conventional pre-fetch pattern). This trips `react-hooks/set-state-in-effect`. It was previously masked: the auto-advance block's ref-during-render code (FU-1) tripped `react-hooks/refs` *first*, so the analyzer never reached this effect. Removing those disables in the FU-1 refactor unmasked it; worked around with a block-level `eslint-disable react-hooks/set-state-in-effect` around the effect.

**Why it's harmless today:** the synchronous resets run once per `voiceProfileId` change, so the cascading-render the rule guards against doesn't materialize.
**Fix shape:** migrate the clips list to a data-fetching library (SWR / TanStack Query) or a `key`-based remount so loading/empty state is derived rather than synced via effect — removes the need for the disable. The same pattern likely recurs in other inline `fetch`-in-effect lists.
**Pick up when:** a data-fetching-library adoption pass, or the next time this component's clips list is touched.
