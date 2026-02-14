-- ============================================================
-- Allow voice_profiles to retry from "failed" status
-- Adds: failed → collecting transition (for retries)
--
-- RUN THIS IN SUPABASE DASHBOARD → SQL Editor
-- ============================================================

create or replace function public.enforce_voice_profile_status_transition()
returns trigger
language plpgsql
as $$
declare
  old_status public.voice_profile_status := old.status;
  new_status public.voice_profile_status := new.status;
begin
  if old_status = new_status then
    return new;
  end if;

  -- Allowed transitions:
  -- created    → collecting
  -- collecting → processing | archived
  -- processing → ready | failed
  -- failed     → collecting | archived     ← CHANGED: allow retry
  -- ready      → archived
  if old_status = 'created' and new_status = 'collecting' then
    return new;
  elsif old_status = 'collecting' and (new_status in ('processing','archived')) then
    return new;
  elsif old_status = 'processing' and (new_status in ('ready','failed')) then
    return new;
  elsif old_status = 'failed' and (new_status in ('collecting','archived')) then
    return new;
  elsif old_status = 'ready' and (new_status = 'archived') then
    return new;
  end if;

  raise exception 'Invalid voice_profile status transition: % -> %', old_status, new_status;
end;
$$;
