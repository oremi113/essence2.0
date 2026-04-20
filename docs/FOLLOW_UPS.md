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
