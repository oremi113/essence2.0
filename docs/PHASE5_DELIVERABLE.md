# Phase 5: Voice Creation (ElevenLabs) — Deliverable

## Summary

- **DB:** Added `queued` to `voice_profile_status`; added attempt-tracking columns to `voice_profiles`: `attempt_count`, `last_attempt_at`, `last_error_at`, `source_clip_count`, `source_clip_seconds`. No audio in Postgres; `training_clips` already have `storage_path`, `status` (uploaded = complete).
- **Server:** `lib/elevenlabs.ts` (server-only, `createVoiceFromClips`, timeout 2 min). POST/GET voice-profiles routes with auth, ownership, min-clip validation, idempotency, lock to processing, and retry backoff (5 min, 30 min, 2 h; max 3 attempts). `vendor_voice_id` and `ready_at` set on success; never returned to client.
- **UI:** Record page link "Create voice from clips" → `/app/voice/create?voiceProfileId=...`. Processing screen with poll (2.5 s, 90 s then "Taking longer"), success ("Your voice is yours.", Continue), failure (message, Back; Retry only if `retry_available`).

---

## voice_profiles schema (Phase 5 relevant)

Existing columns (unchanged): `id`, `user_id`, `label`, `status`, `recorded_clip_count`, `required_clip_count`, `vendor_voice_id`, `processing_started_at`, `processing_completed_at`, `last_error_code`, `last_error_message`, `ready_at`, `created_at`, `updated_at`, …

Phase 5 attempt-tracking columns:

| Column | Type | Purpose |
|--------|------|--------|
| `attempt_count` | integer not null default 0 | Creation attempts; incremented only when transitioning to processing (vendor call attempted). Max 3 with backoff. |
| `last_attempt_at` | timestamptz null | Set when transitioning to processing. |
| `last_error_at` | timestamptz null | Set whenever `last_error_code` / `last_error_message` are set. |
| `source_clip_count` | integer null | Snapshot of valid (uploaded) clip count at start of creation. |
| `source_clip_seconds` | integer null | Optional; reserved for future duration snapshot. |

---

## Changed Files (brief notes)

| File | Notes |
|------|--------|
| `supabase/migrations/20260213170000_phase5_voice_profile_lifecycle.sql` | Add `queued` enum value; add lifecycle columns to `voice_profiles`. |
| `supabase/migrations/20260213180000_voice_profiles_attempt_tracking.sql` | Add `attempt_count`, `last_attempt_at`, `last_error_at`, `source_clip_count`, `source_clip_seconds`; optional backfill for `last_error_at`. Idempotent (IF NOT EXISTS). |
| `src/lib/elevenlabs.ts` | **New.** Server-only. `createVoiceFromClips({ name, audioBlobs })` → POST `/v1/voices/add` with FormData; timeout 120 s; safe logging. |
| `src/app/api/voice-profiles/route.ts` | **New.** POST: create profile with `status: "collecting"`, return `voiceProfileId`, `status`. |
| `src/app/api/voice-profiles/[id]/route.ts` | **New.** GET: return `status`, `last_error_code`, `last_error_message`, `retry_available` (no `vendor_voice_id`). |
| `src/app/api/voice-profiles/[id]/start/route.ts` | **New.** POST: validate min 10 clips; idempotent (ready/queued/processing); lock to `queued`; download clips from storage; call ElevenLabs; update `ready` or `failed` with safe error fields and backoff. |
| `src/components/voice/VoiceCreationView.tsx` | **New.** Client: read `voiceProfileId` from query; POST start; poll GET every 2.5 s (max 90 s); processing / taking longer / success / failure UI. |
| `src/app/app/voice/create/page.tsx` | **New.** Auth + render `VoiceCreationView`. |
| `src/app/app/record/RecordingUploadWrapper.tsx` | Link "Create voice from clips" to `/app/voice/create?voiceProfileId=...`. |

---

## How to test locally

1. **Env:** Set `ELEVENLABS_API_KEY` in `.env` (server-only).
2. **DB:** Run Supabase migrations (e.g. `npx supabase db push`). Ensure `20260213170000_phase5_voice_profile_lifecycle.sql` and `20260213180000_voice_profiles_attempt_tracking.sql` are applied so `voice_profiles` has attempt-tracking columns.
3. **Record:** Sign in, go to `/app/record`, select a voice profile, record and commit at least **10** clips (status `uploaded`).
4. **Create voice:** Click "Create voice from clips". You should land on `/app/voice/create?voiceProfileId=...`.
5. **Processing:** See "Preparing your voice" and spinner; after 90 s see "Taking longer" if still in progress.
6. **Success:** When ElevenLabs returns, see "Your voice is yours." and Continue → back to record.
7. **Failure:** If &lt; 10 clips: clear "INSUFFICIENT_CLIPS" message. If vendor fails: see error and Retry only when `retry_available` (after backoff).
8. **Idempotency:** Open create page twice for same profile; second load should not double-start (either already ready or polling same run).
9. **No secrets:** Confirm `vendor_voice_id` / ElevenLabs voice id never appears in network responses to client or in client-rendered UI.

---

## Manual test steps (attempt tracking and backoff)

1. **INSUFFICIENT_CLIPS → attempt_count stays 0**  
   Start with &lt; 10 uploaded clips for a profile. POST start → 400, `code: "INSUFFICIENT_CLIPS"`. Check DB: `attempt_count` remains 0, `last_attempt_at` unchanged.

2. **Success path → attempt_count 1, ready_at set**  
   With 10+ uploaded clips, POST start → 200, status progresses to ready. Check DB: `attempt_count` = 1, `last_attempt_at` set, `vendor_voice_id` and `ready_at` set.

3. **Vendor failure → failed, last_error_at set**  
   Force failure (e.g. invalid `ELEVENLABS_API_KEY`). POST start → 4xx/5xx, status failed. Check DB: `attempt_count` incremented, `last_error_code` / `last_error_message` / `last_error_at` set.

4. **Retry blocked by backoff**  
   Immediately POST start again for the same failed profile → 429 "Retry not available yet". Wait for backoff (e.g. 5 min after first failure) then retry → allowed (if attempt_count &lt; 3).

---

## Commit checkpoints

0. **Commit: Phase 5 — add voice_profiles attempt tracking fields**  
   - `supabase/migrations/20260213180000_voice_profiles_attempt_tracking.sql`  
   - `src/app/api/voice-profiles/[id]/start/route.ts` (set `ready_at` on success)  
   - `docs/PHASE5_DELIVERABLE.md`  
   - Message: `Phase 5: add voice_profiles attempt tracking fields`

1. **Commit 1 — DB schema + VoiceProfile lifecycle**  
   - `supabase/migrations/20260213170000_phase5_voice_profile_lifecycle.sql`  
   - Message: `Phase 5: voice profile lifecycle migration (queued, attempt_count, backoff columns)`

2. **Commit 2 — Server routes + ElevenLabs module**  
   - `src/lib/elevenlabs.ts`  
   - `src/app/api/voice-profiles/route.ts`  
   - `src/app/api/voice-profiles/[id]/route.ts`  
   - `src/app/api/voice-profiles/[id]/start/route.ts`  
   - Message: `Phase 5: voice-profiles API and ElevenLabs createVoiceFromClips (server-only)`

3. **Commit 3 — UI processing and success/failure states**  
   - `src/components/voice/VoiceCreationView.tsx`  
   - `src/app/app/voice/create/page.tsx`  
   - `src/app/app/record/RecordingUploadWrapper.tsx`  
   - Message: `Phase 5: voice create UI (processing, success, failure, poll)`

---

## PR steps

- Push branch and open PR titled **Phase 5: VoiceProfile creation (ElevenLabs)**.
- In the PR description, include this acceptance checklist:

  - [ ] Clips collected → start creation → voice created → VoiceProfile status `ready`.
  - [ ] Minimum clip validation blocks start when &lt; 10 valid (uploaded) clips.
  - [ ] ElevenLabs API key only on server; never exposed to client.
  - [ ] ElevenLabs voice id stored in DB only; not returned to client.
  - [ ] Failure handling shows clear message; Retry only when `retry_available`; no thrash loops.
  - [ ] UI: processing screen, "Taking longer" after 90 s, success with Continue, failure with Back and optional Retry.
