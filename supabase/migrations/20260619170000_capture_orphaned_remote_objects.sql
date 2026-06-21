-- Capture objects that exist on the remote database but were never recorded as
-- migrations. Surfaced by the #26 types drift-check: the first from-migrations
-- type generation diverged from the committed, remote-generated types.ts,
-- proving the migrations did not fully reproduce the remote schema.
--
-- 1. public.healthcheck() — used in production by /api/health
--    (`supabase.rpc("healthcheck")`, src/app/api/health/route.ts). Without it, a
--    database rebuilt purely from migrations (a fresh environment, the local
--    stack, CI) has no healthcheck function and /api/health fails. Definition
--    pulled verbatim from remote; no explicit grants, matching the house pattern
--    for public.acquire_advisory_lock (Supabase default privileges grant
--    execute to anon/authenticated/service_role automatically).
--
-- 2. training_clip_status enum values 'pending_upload' and 'missing' — present
--    on remote (after 'deleted'), unused in code today, captured here to keep
--    migrations == remote. `add value if not exists` mirrors
--    20260213160000_add_training_clip_status_values.sql.

create or replace function public.healthcheck()
  returns text
  language sql
  stable
as $$
  select 'ok';
$$;

alter type public.training_clip_status add value if not exists 'pending_upload';
alter type public.training_clip_status add value if not exists 'missing';
