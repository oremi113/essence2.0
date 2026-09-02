-- Onboarding L4: country (privacy-regime signal) + legal-acceptance record.
--
-- Added to the existing profiles table, so RLS + grants are inherited (the
-- privacy-hardening default-privilege change governs new TABLES, not new
-- columns). All nullable — existing rows predate collection.
begin;

alter table public.profiles
  add column if not exists country                text,
  add column if not exists terms_version_accepted text,
  add column if not exists terms_accepted_at       timestamptz;

commit;
