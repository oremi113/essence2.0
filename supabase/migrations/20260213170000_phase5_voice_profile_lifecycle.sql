-- Phase 5: VoiceProfile lifecycle (ElevenLabs creation)
-- Adds: queued status, attempt/backoff and error columns, source_clip snapshot.
-- No audio in Postgres; training_clips already have storage_path, status (uploaded = complete).
--
-- Enum: ADD VALUE IF NOT EXISTS is idempotent (Postgres 9.1+). Safe to re-run if 'queued' already exists.
-- App code uses the same literals: collecting, queued, processing, ready, failed, created, archived.

alter type public.voice_profile_status add value if not exists 'queued';

alter table public.voice_profiles
  add column if not exists last_error_at timestamptz,
  add column if not exists attempt_count int not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists source_clip_count int check (source_clip_count is null or source_clip_count >= 0),
  add column if not exists source_clip_seconds numeric(10,2) check (source_clip_seconds is null or source_clip_seconds >= 0);

comment on column public.voice_profiles.vendor_voice_id is 'ElevenLabs voice id; server-only, do not expose to client';
comment on column public.voice_profiles.attempt_count is 'Number of creation attempts; max 3 with backoff';
comment on column public.voice_profiles.source_clip_count is 'Snapshot of valid clip count at start of creation';
