# Debug: "Invalid API key" when creating voice from clips

**Status:** RESOLVED

---

## Root cause (two bugs)

### Bug 1: Client-side short-circuit on stale "failed" status

`VoiceCreationView.tsx` checked the voice profile status via GET before calling POST `/start`. When the profile was in "failed" status (from a previous attempt), it **immediately displayed the stored error message** ("Invalid API key") and returned — never calling POST `/start`. Even clicking Retry re-ran the same GET check and hit the same short-circuit.

**Fix:** Removed the `if (getData.status === "failed") { return; }` short-circuit. "failed" now falls through to POST `/start`, which has proper retry logic (backoff, attempt counting). Only "ready" and "processing"/"queued" short-circuit.

### Bug 2: DB trigger blocked retries from "failed" status

The Postgres trigger `enforce_voice_profile_status_transition()` only allowed `failed → archived`. The start route needed `failed → collecting → processing` for retries. When it attempted the transition, Postgres raised: `Invalid voice_profile status transition: failed -> processing`.

**Fix:**
1. Updated the DB trigger to allow `failed → collecting` (migration: `20260214_allow_failed_to_collecting_retry.sql`).
2. Updated the start route to transition `failed → collecting` before the lock update (same pattern as `created → collecting`).

## Key insight

The ElevenLabs API key was **never invalid**. It was never being sent. The "Invalid API key" message was a stale error stored in the database from a much earlier failed attempt, and the UI kept displaying it without ever making a new request to ElevenLabs.

## Files changed

- `src/components/voice/VoiceCreationView.tsx` — removed "failed" short-circuit in GET status check
- `src/app/api/voice-profiles/[id]/start/route.ts` — added `failed → collecting` transition before lock
- `supabase/migrations/20260214_allow_failed_to_collecting_retry.sql` — trigger allows `failed → collecting`
