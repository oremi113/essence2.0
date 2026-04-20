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
