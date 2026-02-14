-- Run this in Supabase Dashboard → SQL Editor (against the same project as your app).
-- Fixes: "Could not start voice creation. Ensure database migrations are applied..."
-- Safe to run multiple times (IF NOT EXISTS).

alter type public.voice_profile_status add value if not exists 'queued';

alter table public.voice_profiles add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0);
alter table public.voice_profiles add column if not exists last_attempt_at timestamptz;
alter table public.voice_profiles add column if not exists last_error_at timestamptz;
alter table public.voice_profiles add column if not exists source_clip_count integer check (source_clip_count is null or source_clip_count >= 0);
alter table public.voice_profiles add column if not exists source_clip_seconds integer check (source_clip_seconds is null or source_clip_seconds >= 0);
