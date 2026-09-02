-- Durable evidence of voice-cloning consent (Compliance Pack Part 1).
--
-- Written server-side (service role) at voice-profile creation; never edited by
-- clients. Own-row SELECT only, so a future DSAR/export can read it via the
-- user session. Account deletion erases it via the user_id cascade.
--
-- Grant note: 20260901120000_privacy_hardening revoked default Data API grants
-- on new tables, so the SELECT grant below is required for the own-row policy
-- to be reachable. No write grants — all inserts go through the service role,
-- which bypasses RLS and grants.
begin;

create table public.voice_consent_records (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  voice_profile_id      uuid references public.voice_profiles(id) on delete set null,
  consent_to_clone      boolean not null,
  ownership_attestation boolean not null,
  consent_text_version  text    not null,
  accepted_at           timestamptz not null default now(),
  user_agent            text,
  ip_address            inet
);

create index voice_consent_records_user_id_idx
  on public.voice_consent_records (user_id);

alter table public.voice_consent_records enable row level security;

-- Own-row read only. No client insert/update/delete policy: writes are
-- service-role only.
create policy "own consent records are viewable"
  on public.voice_consent_records for select
  using (auth.uid() = user_id);

grant select on public.voice_consent_records to authenticated;

commit;
