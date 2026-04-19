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

## usePhotoUpload (from PR #35, 2026-04-19)

### 3. `onUpload` returning `{ error }` is silently ignored
`src/components/screens/onboarding/usePhotoUpload.ts` — the hook's `onUpload` return type declares `{ avatarUrl?; error? }`, but the implementation only destructures `avatarUrl`. If a caller returns `{ error: "..." }`, the hook calls `onSuccess(null)` with the hook's `error` state staying `null` and the preview still shown. Only a *thrown* `onUpload` populates user-visible error state.

**Why it matters:** the type signature implies a contract that isn't honored; any screen that returns error messages (vs throwing) will silently fail-open.
**Fix:** handle the `error` branch inside the hook — set `error` state, keep the file input usable for retry, clear the preview or leave it per product intent.
**Test note:** PR #35 includes a test that documents current behavior so the suite stays green against `main`. Update that test when the hook is fixed.

## audio/commit route (from PR #31, 2026-04-19)

### 4. `AUDIO_BUCKET` import is only a fallback
`src/app/api/audio/commit/route.ts:7` — imports `AUDIO_BUCKET` but uses it only as a fallback (`row.storage_bucket || AUDIO_BUCKET`). The `storage_bucket` column is set on insert in `audio/init-upload` and is non-null in practice, so the fallback is dead weight.

**Fix:** drop the fallback and the import, or confirm the column can legitimately be null and document why.
