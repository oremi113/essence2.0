-- Phase 5: Add attempt tracking and backoff fields to voice_profiles.
-- Safe to run once; uses ADD COLUMN IF NOT EXISTS. Does not rename or drop existing columns.
-- Existing rows: attempt_count defaults to 0; optional backfill for last_error_at.

-- Attempt and backoff (one column per statement for compatibility)
alter table public.voice_profiles add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0);
alter table public.voice_profiles add column if not exists last_attempt_at timestamptz;
alter table public.voice_profiles add column if not exists last_error_at timestamptz;
alter table public.voice_profiles add column if not exists source_clip_count integer check (source_clip_count is null or source_clip_count >= 0);
alter table public.voice_profiles add column if not exists source_clip_seconds integer check (source_clip_seconds is null or source_clip_seconds >= 0);

-- Optional backfill: set last_error_at from updated_at where we have error code but no timestamp
update public.voice_profiles
set last_error_at = updated_at
where last_error_code is not null
  and last_error_at is null;

comment on column public.voice_profiles.attempt_count is 'Number of creation attempts; max 3 with backoff';
comment on column public.voice_profiles.last_attempt_at is 'When the last creation attempt started (transition to processing)';
comment on column public.voice_profiles.last_error_at is 'When last_error_code/message was set';
comment on column public.voice_profiles.source_clip_count is 'Snapshot of valid clip count at start of creation';
