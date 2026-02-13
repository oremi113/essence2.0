-- Phase 4: Add status values and columns for audio upload pipeline (init -> upload -> commit).
-- Bucket: essence-audio (create in Supabase Dashboard: Storage -> New bucket -> essence-audio, private).

begin;

-- Allow training_clip statuses for the 3-step pipeline: pending_upload, ready, failed, missing
alter type public.training_clip_status add value if not exists 'pending_upload';
alter type public.training_clip_status add value if not exists 'missing';

-- Ensure columns exist for init/commit (idempotent)
alter table public.training_clips add column if not exists prompt_index int;
alter table public.training_clips add column if not exists bytes int check (bytes is null or bytes > 0);

commit;
