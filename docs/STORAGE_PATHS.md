# 6. Storage Paths and Metadata

All storage buckets are private.

Client never reads or writes directly.
Server issues signed URLs for upload and playback.

Audio is never stored in Postgres.

---

## 6.1 Deterministic Path Strategy

### Training Clips

Bucket: `training-clips`

Path format:

training-clips/{userId}/{voiceProfileId}/{trainingClipId}.webm

Rules:
- `userId` is derived from auth session (server-side)
- `voiceProfileId` must belong to the user
- `trainingClipId` is generated server-side (UUID)
- Extension is always `.webm`
- Client cannot override bucket or path

---

### Messages

Bucket: `messages`

Path format:

messages/{userId}/{voiceProfileId}/{messageId}.mp3

Rules:
- `userId` derived from auth session
- `voiceProfileId` must belong to the user
- `messageId` generated server-side (UUID)
- Extension is always `.mp3`
- Client cannot override bucket or path

---

## 6.2 Database Stores Metadata Only

For both TrainingClips and Messages, database stores:

- storage_bucket (text)
- storage_path (text)
- mime_type (text)
- duration_seconds (integer)
- status (enum)
- created_at (timestamp)

Database does NOT store:
- Raw audio
- Base64 blobs
- Binary data
