# 7. API Contract Stubs (MVP)

All endpoints are server-authoritative.
Client requests. Server decides.

Buckets are private.
All storage access uses signed URLs issued by the server.

Unless stated otherwise: Auth required.

---

## POST /api/storage/training-clips/sign-upload

Purpose:
Return a signed upload URL for a TrainingClip to `training-clips` bucket.

Auth:
Required

Request JSON:
- voiceProfileId (uuid)
- contentType (string) must be `audio/webm`

Response JSON:
- bucket: "training-clips"
- path: training-clips/{userId}/{voiceProfileId}/{trainingClipId}.webm
- trainingClipId (uuid)
- signedUrl (string)
- expiresIn (number, seconds)

Server rules:
- Derive userId from auth (do not accept from client)
- Validate voiceProfile belongs to user
- Generate trainingClipId server-side
- Enforce deterministic path format
- Reject non-webm uploads in MVP

---

## POST /api/training-clips/commit

Purpose:
Client tells server upload finished; server writes TrainingClip metadata row.

Auth:
Required

Request JSON:
- trainingClipId (uuid)
- voiceProfileId (uuid)
- mimeType (string)
- durationSeconds (number)

Response JSON:
- trainingClipId (uuid)
- status (string)

Server rules:
- Validate trainingClipId exists (or create it if you choose that flow)
- Validate voiceProfile belongs to user
- Validate storage object exists at expected path (optional in MVP, recommended later)
- DB stores metadata only (no audio)

---

## POST /api/voice-profiles/process

Purpose:
Trigger synchronous voice processing for MVP.

Auth:
Required

Request JSON:
- voiceProfileId (uuid)

Response JSON:
- voiceProfileId (uuid)
- status (string)

Server rules:
- Validate voiceProfile belongs to user
- Validate minimum required TrainingClips exist for that profile
- Synchronous in MVP (no background jobs)
- ElevenLabs calls server-side only

---

## POST /api/messages/generate

Purpose:
Start a fresh Step 6 generation. Runs the hybrid LLM (text) then ElevenLabs
(audio), and writes the result into a **`pending_generations`** row — NOT a
`messages` row. The message stays ephemeral until `/save`. See
`docs/session-8/Step6_OpenContracts.md` Q1–Q3.

Auth:
Required

Request JSON:
- voiceProfileId (uuid)
- category (message_category enum)
- note (string, optional, ≤ 200 chars)
- Recipient — exactly one branch:
  - recipientId (uuid) — an existing recipient, OR
  - pendingRecipientName (string) + pendingRecipientRelationship (string) — a
    new recipient typed at A2 (NOT persisted as a `recipients` row yet)
- fromGenerationId (uuid, optional) — the edit-note ("Reshape your note") path

Response JSON:
- generationId (uuid)
- textStatus (string: pending | succeeded | failed)
- audioStatus (string: pending | succeeded | failed)

Server rules:
- Derive userId from auth. Validate voiceProfile (and recipientId, if given)
  belong to user.
- Write a `pending_generations` row. Do NOT create a `messages` row. Do NOT
  create a `recipients` row for the pending-recipient branch — that promotion
  happens at `/save` (avoids the "abandoned Sarah" problem, Q1).
- Audio is stored at the pending path
  `messages/{userId}/pending/{generationId}.mp3` (never in DB, paths only).
- **Saved-message quota is NOT gated here** — a 2/3 user may complete a flow;
  the race resolves at `/save` (Q4). Cost controls ARE enforced (see below).
- Edit-note path (`fromGenerationId` present): mint a NEW generationId with
  `regenerate_count = 0`, set `source_generation_id = <prior>` and
  `edit_note_depth = prior.edit_note_depth + 1`, reuse the prior template
  variant (content changed, not style), and **do not** supersede the prior row
  until this one succeeds. On success, mark prior `superseded_at = now()`. On
  failure, the prior preview remains intact and reachable (Q3).
- Cost controls (Q4), all 429 with `{ code: 'cost_limit_blocked', limit_kind }`:
  - edit-note depth cap — `limit_kind: 'edit_note_depth'` (MAX_EDIT_NOTE_DEPTH, default 2)
  - one active pending per user — `limit_kind: 'pending_max'` (MAX_ACTIVE_PENDING_PER_USER, default 1)
  - hourly generation cap — `limit_kind: 'hourly_max'` (MAX_GENERATIONS_PER_USER_PER_HOUR, default 20)

---

## POST /api/messages/regenerate

Purpose:
Re-roll within an existing generation. Two modes: a user-driven content re-roll
(A6 "Regenerate") and a system-driven audio retry after a partial failure (Q2).

Auth:
Required

Request JSON:
- generationId (uuid)
- mode (string: "variant" | "retry_audio", default "variant")

Response JSON:
- generationId (uuid) — unchanged; this mutates the same lineage member
- textStatus (string)
- audioStatus (string)
- regenerateCount (number)

Server rules:
- Validate the `pending_generations` row belongs to user and is still active
  (not saved, not superseded).
- `mode: "variant"` (user Regenerate): pick a *different* template variant,
  re-run LLM + audio, increment `regenerate_count`. Enforce the regenerate cap
  — `regenerate_count ≤ MAX_REGENERATES` (default 3); exceeding returns 429
  `{ code: 'cost_limit_blocked', limit_kind: 'regenerate_cap' }`.
- `mode: "retry_audio"` (system retry after audio-only failure): reuse the
  cached `generated_text`, same variant, re-run audio only. **Does not** change
  `regenerate_count` — it counts user decisions to re-roll content, not infra
  retries.
- Split `retry_audio` into its own `/retry-audio` route only if the handler
  logic gets tangled (Q2). For MVP it is a mode flag here.

---

## POST /api/messages/save

Purpose:
Promote a `pending_generations` row to a permanent, immutable `messages` row.
Idempotent (Q5).

Auth:
Required

Request JSON:
- generationId (uuid)

Response JSON:
- messageId (uuid)
- status (string)

Server rules:
- **Idempotent by generation_id.** `messages.source_generation_id` carries a
  unique constraint. If a `messages` row already exists for this generationId
  (or `pending_generations.saved_message_id` is already set), return it — do
  NOT insert again, do NOT re-copy audio. Double-taps and mobile retries are
  safe.
- **Saved-message quota enforced here** (security gate, race-safe). On cap:
  403 `{ code: 'vault_limit_reached' }`; client routes to C3
  (`/messages/limit`). Also block on lapsed subscription.
- Promote the pending-recipient branch: if `pending_recipient_name` is set,
  create-or-look-up the `recipients` row now, then point the message at it.
- Audio promotion order (deliberate — every prefix is recoverable):
  1. Copy `messages/{userId}/pending/{generationId}.mp3`
     → `messages/{userId}/{messageId}.mp3`
  2. Insert `messages` row with the permanent audio_path and
     `source_generation_id = generationId`
  3. Set `pending_generations.saved_message_id = messageId`
  4. Delete the pending storage object (failure here is non-fatal — an orphan
     object is cheaper than missing audio)
- Messages are immutable (no client updates ever).

---

## POST /api/messages/discard

Purpose:
Discard an in-flight generation (A6.d confirm). Tears down pending state. Q5.

Auth:
Required

Request JSON:
- generationId (uuid)

Response JSON:
- status (string)

Server rules:
- Validate the `pending_generations` row belongs to user.
- Delete the pending storage object (best effort), then delete the
  `pending_generations` row.
- No idempotency needed — replays are harmless.

---

## GET /api/messages/{messageId}/play

Purpose:
Return signed read URL for a message audio file.

Auth:
Required

Response JSON:
- messageId (uuid)
- signedUrl (string)
- expiresIn (number, seconds)

Server rules:
- Validate message belongs to user
- Return signed read URL for deterministic path
