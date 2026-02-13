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
Generate a Message (audio) using ElevenLabs, store in `messages` bucket, write Message row.

Auth:
Required

Request JSON:
- voiceProfileId (uuid)
- recipientId (uuid, optional)
- title (string, optional)
- prompt (string)

Response JSON:
- messageId (uuid)
- status (string)

Server rules:
- Validate voiceProfile belongs to user
- If recipientId provided, validate it belongs to user
- Enforce plan limits (Vault/Legacy/Guardian) server-side
- Create Message row + storage object deterministically
- Messages are immutable (no client updates)

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
