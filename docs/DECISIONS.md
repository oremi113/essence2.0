# Decisions (Phase 0)

This file locks foundational choices so we don’t re-decide them mid-build.

## Architecture locks
- Next.js App Router on Vercel
- Supabase Auth + Postgres + Storage
- ElevenLabs API key is server-only (never exposed to browser)
- SQL direct, no ORM
- Synchronous processing for MVP (no job system yet)
- Audio files never stored in DB (only references/paths)
- Server decides, client requests
- If a PR violates a lock, it does not merge
- If unsure, open a draft PR and ask before coding further
- Messages are immutable (edits create a new version or new message)
- MVP first, no scope creep beyond MVP

# ElevenLabs + service role rule**
- ElevenLabs API key is **server-only env var** (never `NEXT_PUBLIC_*`)
- All ElevenLabs calls go through `app/api/*`
- Any file touching service role or ElevenLabs key must begin with `import "server-only"`
- Client components may call only your own API routes, never third-party directly

- `app/api/*` = privileged actions (auth, storage, ElevenLabs)
- `src/lib/server/*` = privileged helpers (must be server-only)
- `src/lib/supabase/client.ts` = browser-safe only
- `src/components/*` = UI only, no business logic, no secrets

## Where decisions live
- This file is the source of truth.
- Any change requires a PR that updates this file.

## Non-goals for Phase 0
- No product UI polish
- No feature logic
- No background processing
- No production secrets in repo


## 5.2 MVP scope boundaries

### MVP includes (vertical slice only)
- Onboarding
- Voice training (record + upload clips)
- Voice creation (process into a usable voice profile)
- Generate 1 message
- Playback
- Basic memory shelf view (list and play)

### Will NOT build in MVP (explicit)
- Multi-user / shared archive access (Guardian sharing)
- Scheduling or occasion reminders (Legacy+)
- Message delivery workflows (email/SMS/notifications)
- Family accounts, roles, invitations
- Multiple voice profiles UI (Guardian UI)
- Automatic plan upgrades/downgrades, Stripe integration
- Usage counters, monthly resets, background jobs/cron
- Editing messages after generation (messages are immutable)
- Advanced search, filters, tags, folders, collections
- Analytics dashboards, retention tooling
- Admin panels (beyond manual DB edits)
- Any non-essential UI polish, animations, or extra onboarding screens

### Enforcement rule
If a feature is not in “MVP includes”, it cannot be added without updating this doc first.


## 5.3 Primitive definitions

### User

- The authenticated account holder.
- Identified by `auth.users.id` (Supabase).
- Owns all data in the system.
- Tier access (`vault`, `legacy`, `guardian`) is determined by `user_entitlements`.
- All authorization decisions derive from the authenticated user.

---

### VoiceProfile

- A trained, reusable voice identity derived from TrainingClips.
- Belongs to exactly one User.
- A User may have multiple VoiceProfiles (required for Guardian tier).
- Messages are generated using a specific VoiceProfile.
- Contains metadata only (no raw audio stored in DB).

Relationship:
- `voice_profiles.user_id -> auth.users.id`

---

### TrainingClip

- A single recorded audio sample used to train a VoiceProfile.
- Belongs to one User and one VoiceProfile.
- Raw audio stored in Supabase Storage.
- Database stores metadata only:
  - `storage_bucket`
  - `storage_path`
  - `mime_type`
  - `duration_seconds`
  - `status`
- Audio is never stored in Postgres.

Relationship:
- `training_clips.user_id -> auth.users.id`
- `training_clips.voice_profile_id -> voice_profiles.id`

---

### Message

- A generated audio output created using a VoiceProfile.
- Belongs to one User and one VoiceProfile.
- May optionally reference a Recipient.
- Raw audio stored in Supabase Storage.
- Database stores metadata only.
- Messages are immutable after creation.
- Message generation is server-authoritative.

Relationship:
- `messages.user_id -> auth.users.id`
- `messages.voice_profile_id -> voice_profiles.id`
- `messages.recipient_id -> recipients.id (nullable)`

---

### Recipient

- A named person associated with a Message.
- Belongs to one User.
- Represents the intended emotional recipient of a message.
- Does not own or control content.
- May support shared archive logic in future Guardian tier.

Relationship:
- `recipients.user_id -> auth.users.id`

---

## API request validation: Zod (2026-04-19)

- API route bodies are validated with Zod schemas wired through `defineRoute`'s `bodySchema` option. Hand-rolled parsers are not added for new routes.
- Schemas live in `src/lib/api/schemas.ts` (or adjacent to the route if single-use).
- On validation failure the factory throws `AppError(VALIDATION_ERROR, ...)` → 400 with `{ error, code, retryable }`. Routes needing a different shape pass `invalidBodyResponse`.
- Context: PR #31 consolidated route boilerplate but explicitly deferred validation ("No Zod" guardrail, scoped to that PR). PR #37 completed the validation half of that plan. The two-step sequence was intentional — each PR had a clean scope — not a reversal.

