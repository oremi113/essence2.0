-- 20260901120000_privacy_hardening
--
-- Defence-in-depth pass over the production Supabase project. Nothing here
-- fixes a live breach: RLS is already on for all 9 public tables, every policy
-- is own-row, storage.objects is RLS-on-with-zero-policies (deny by default),
-- and all four buckets are private. This migration removes privileges and
-- surface that nothing in the app actually uses, so that a future RLS mistake
-- has less to work with.
--
-- Audited live against project idqvimiybiskposxhbor on 2026-09-01.

begin;

-- =========================================================================
-- 1. acquire_advisory_lock: unauthenticated DoS lever, unused by the app
-- =========================================================================
-- SECURITY DEFINER + EXECUTE granted to PUBLIC (Supabase default) means anyone
-- holding the publishable anon key can call POST /rest/v1/rpc/
-- acquire_advisory_lock. pg_advisory_xact_lock BLOCKS when the key is already
-- held, so repeated calls pin PostgREST connections until the pool is dry.
--
-- No caller exists in src/ (only the generated types.ts entry), so the safe
-- move is to keep the function for future server-side use but pin its
-- search_path and restrict EXECUTE to service_role.
create or replace function public.acquire_advisory_lock(lock_key bigint)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_advisory_xact_lock(lock_key);
end;
$$;

revoke execute on function public.acquire_advisory_lock(bigint) from public, anon, authenticated;
grant  execute on function public.acquire_advisory_lock(bigint) to service_role;

-- =========================================================================
-- 2. Pin search_path on the remaining functions
-- =========================================================================
-- Low severity (neither anon nor authenticated holds CREATE on any schema, so
-- there is no schema to shadow from), but it removes the lint finding and the
-- door stays shut if a future migration ever grants CREATE.
alter function public.handle_new_user()                          set search_path = public, pg_catalog;
alter function public.healthcheck()                              set search_path = pg_catalog;
alter function public.set_updated_at()                           set search_path = pg_catalog;
alter function public.update_subscriptions_updated_at()          set search_path = pg_catalog;
alter function public.enforce_message_status_transition()        set search_path = public, pg_catalog;
alter function public.enforce_voice_profile_status_transition()  set search_path = public, pg_catalog;
alter function public.prevent_message_mutation_after_saved()     set search_path = public, pg_catalog;

-- =========================================================================
-- 3. Strip privileges anon does not need on any public table
-- =========================================================================
-- Every policy on every public table is `auth.uid() = user_id`, which is NULL
-- (therefore false) for anon. So anon can already read and write nothing —
-- but it still holds the Supabase-default GRANT ALL, and TRUNCATE BYPASSES
-- RLS. Not reachable through PostgREST today; revoked because it costs
-- nothing and RLS is not a defence against it.
revoke all on public.profiles            from anon;
revoke all on public.voice_profiles      from anon;
revoke all on public.training_clips      from anon;
revoke all on public.messages            from anon;
revoke all on public.recipients          from anon;
revoke all on public.pending_generations from anon;
revoke all on public.usage_events        from anon;
revoke all on public.subscriptions       from anon;
revoke all on public.legacy_waitlist     from anon;

-- =========================================================================
-- 4. Trim `authenticated` down to what the policies actually allow
-- =========================================================================
-- TRUNCATE / REFERENCES / TRIGGER are never used by the app on any table, and
-- TRUNCATE ignores RLS.
revoke truncate, references, trigger on public.profiles            from authenticated;
revoke truncate, references, trigger on public.voice_profiles      from authenticated;
revoke truncate, references, trigger on public.training_clips      from authenticated;
revoke truncate, references, trigger on public.messages            from authenticated;
revoke truncate, references, trigger on public.recipients          from authenticated;
revoke truncate, references, trigger on public.pending_generations from authenticated;
revoke truncate, references, trigger on public.usage_events        from authenticated;
revoke truncate, references, trigger on public.subscriptions       from authenticated;
revoke truncate, references, trigger on public.legacy_waitlist     from authenticated;

-- Server-owned tables: the only policy on each is SELECT-own. Writes go
-- through the service role, which bypasses RLS, so `authenticated` never
-- needs write privileges here.
revoke insert, update, delete on public.usage_events  from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

-- Append-only from the user's side: no DELETE policy exists on these, so the
-- privilege is dead weight.
-- Verified 2026-09-01: every row delete in the app (account closure in
-- src/app/app/settings/actions.ts, /api/me) runs through the service client,
-- which bypasses RLS. Neither table has a DELETE policy, so this privilege is
-- already unusable; revoked so it can never be re-enabled by a stray policy.
revoke delete on public.profiles        from authenticated;
revoke update, delete on public.legacy_waitlist from authenticated;

-- =========================================================================
-- 5. Default privileges: stop new objects from auto-granting to anon
-- =========================================================================
-- Sections 3 and 4 clean up the 9 tables that exist today. Without this
-- section that cleanup is a one-time snapshot: Postgres default privileges in
-- schema public currently hand the full grant set (arwdDxtm — including the
-- RLS-bypassing TRUNCATE) to anon and authenticated on EVERY newly created
-- table, and EXECUTE on every new function. That is the mechanism behind the
-- dashboard's "Automatically expose new tables" toggle
-- (Integrations -> Data API -> Settings), which Supabase's own inline text
-- recommends disabling.
--
-- Scoped `for role postgres` because that is the role migrations run as, and
-- ALTER DEFAULT PRIVILEGES only affects objects created by the named role.
-- The parallel supabase_admin defaults are Supabase-managed and left alone.
--
-- CONSEQUENCE — read before adding a table or an RPC:
--   After this, a new table or function has NO Data API access until it is
--   granted explicitly. If a future migration adds a table and the app starts
--   returning 401/permission-denied against it, this is why. The fix is an
--   explicit grant alongside the CREATE, matching the policies on it, e.g.
--
--     grant select, insert, update on public.new_table to authenticated;
--
--   That is the intended trade: access becomes a decision rather than a
--   default. Server code using the service role is unaffected either way,
--   since service_role bypasses both RLS and these grants.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Functions default to EXECUTE for PUBLIC/anon/authenticated — that default is
-- exactly how public.acquire_advisory_lock (section 1) ended up callable by
-- anyone holding the publishable anon key. Existing functions keep the grants
-- they already have; this only governs functions created from here on.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- =========================================================================
-- 6. Storage table grants: NOT DOABLE FROM A MIGRATION — and not needed
-- =========================================================================
-- anon and authenticated do hold the full grant set on storage.objects and
-- storage.buckets. An earlier draft of this migration tried to revoke them.
-- Verified 2026-09-01 that it cannot work and would have failed silently:
--
--   storage.objects / storage.buckets are owned by supabase_storage_admin,
--   and those grants were issued BY supabase_storage_admin. `postgres` (the
--   role migrations run as) is not a member of it, and REVOKE only removes
--   grants issued by the revoking role. Postgres answers a REVOKE it cannot
--   satisfy with `WARNING: not all privileges could be revoked` — a WARNING,
--   not an ERROR. The migration would report success and change nothing.
--
-- Leaving it out rather than shipping a statement that lies about its effect.
-- The protection it duplicated is already in place: RLS is ENABLED on
-- storage.objects with ZERO policies, which denies anon and authenticated
-- regardless of their table grants. All storage traffic in this app goes
-- through the Storage API as either the service role or a signed URL, and the
-- storage service authenticates as supabase_storage_admin, so it is unaffected.
--
-- If this ever needs doing for real it is a Supabase support request, not a
-- migration.

-- =========================================================================
-- 7. Bucket-level upload caps
-- =========================================================================
-- /api/audio/init-upload hands the browser a signed upload URL; the client
-- chooses its own Content-Type and byte count. These limits are enforced by
-- the storage service itself, so they hold even if a route guard regresses.
--
-- Unlike section 6, these DO work as `postgres`: verified 2026-09-01 that the
-- role holds SELECT/UPDATE/DELETE on storage.buckets. Note these are UPDATEs
-- against existing rows — in a fresh environment (local stack, CI) the buckets
-- do not exist yet and both statements match zero rows. Bucket creation has
-- always been a dashboard step here; see the header note in
-- 20260418_add_avatar_storage.sql.
--
-- essence-audio stays `audio/*` rather than an exact list because the browser
-- sends `audio/webm;codecs=opus` (RecordingUpload.tsx) and Safari may send
-- audio/mp4 — an exact allowlist would reject valid recordings. `audio/*`
-- still blocks the cases that matter (HTML, SVG, JS, images).
update storage.buckets
   set file_size_limit    = 26214400,          -- 25 MB
       allowed_mime_types = array['audio/*']
 where id = 'essence-audio';

-- profile-photos mirrors AVATAR_ALLOWED_MIME / AVATAR_MAX_BYTES in
-- src/lib/profile/avatar-shared.ts (2 MB), with headroom so the app-level
-- check stays the one that produces the friendly error.
update storage.buckets
   set file_size_limit    = 5242880,           -- 5 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'profile-photos';

-- =========================================================================
-- 8. Dropping the unused buckets: NOT DOABLE FROM SQL — use the Storage API
-- =========================================================================
-- `messages` and `training-clips` were created 2026-02-13, hold zero objects,
-- and are referenced nowhere in src/ — everything consolidated into
-- essence-audio (see the note in src/lib/audio/storage-paths.ts on
-- pendingGenerationAudioPath). They should go.
--
-- But not from here. A first attempt at `delete from storage.buckets` failed
-- on 2026-09-01 with:
--
--   ERROR: Direct deletion from storage tables is not allowed.
--          Use the Storage API instead. (SQLSTATE 42501)
--
-- Supabase installs a BEFORE DELETE statement trigger on storage.buckets
-- (`protect_buckets_delete` -> storage.protect_delete()) that blocks this by
-- design. Because the whole migration runs in one transaction, that single
-- statement rolled back sections 1-7 with it.
--
-- The deletion is done instead via the Storage API:
--   DELETE {SUPABASE_URL}/storage/v1/bucket/messages
--   DELETE {SUPABASE_URL}/storage/v1/bucket/training-clips
-- authenticated with the service role key. Buckets are dashboard/API-managed
-- in this project anyway (see 20260418_add_avatar_storage.sql), so bucket
-- lifecycle living outside migrations is the existing convention, not a new
-- exception.
--
-- NOTE the asymmetry: section 7's UPDATE against storage.buckets IS allowed.
-- The protect trigger fires only on DELETE; the other trigger on this table
-- (enforce_bucket_name_length_trigger) fires on INSERT OR UPDATE OF name, and
-- section 7 does not touch name.

commit;
