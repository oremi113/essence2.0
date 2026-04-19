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
