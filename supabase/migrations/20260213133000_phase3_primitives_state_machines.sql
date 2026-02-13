-- ============================================================
-- ESSENCE Phase 3: Primitives + State Machines (Postgres/Supabase)
-- Tables:
--   profiles, voice_profiles, training_clips, recipients, messages
-- Includes:
--   enums, constraints, indexes, RLS, state-transition + immutability triggers
--
-- DIAGNOSIS (root cause of partial apply):
-- Enums were created in a DO block without schema qualification. In contexts
-- where search_path does not list public first (or DO runs in another schema),
-- the type may not be visible to CREATE TABLE, causing "type ... does not exist"
-- on the first table that uses an enum (voice_profiles). Fix: create and
-- reference all enums with public. and check existence by (typname + nspname).
-- ============================================================

begin;

-- CHANGED: Phase 3 reset block (drops prior 0001/0003 objects so this migration can run cleanly)
drop table if exists public.messages cascade;
drop table if exists public.training_clips cascade;
drop table if exists public.recipients cascade;
drop table if exists public.voice_profiles cascade;
drop table if exists public.profiles cascade;

drop type if exists public.message_status cascade;
drop type if exists public.training_clip_status cascade;

-- Recommended CHANGED: drop the other Phase 3 enums too (if any prior versions existed)
drop type if exists public.voice_profile_status cascade;
drop type if exists public.recipient_status cascade;
drop type if exists public.message_kind cascade;

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- ---------- Enums (idempotent) ----------
-- CHANGED: create type with explicit public. so enums exist in public and resolve for create table (avoids search_path / DO block context issues)
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname = 'voice_profile_status') then
    create type public.voice_profile_status as enum (
      'created',          -- row exists, no clips yet
      'collecting',       -- voice journey in progress
      'processing',       -- server-side voice creation in progress
      'ready',            -- preserved voice usable
      'failed',           -- terminal failure (can retry by creating new profile or reprocessing)
      'archived'          -- hidden/retired from active use
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname = 'training_clip_status') then
    create type public.training_clip_status as enum (
      'recorded',         -- client recorded successfully
      'uploading',        -- upload in progress (optional)
      'uploaded',         -- stored externally, metadata saved
      'rejected',         -- invalid audio or failed validation
      'deleted'           -- soft delete (metadata retained)
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname = 'recipient_status') then
    create type public.recipient_status as enum (
      'active',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname = 'message_status') then
    create type public.message_status as enum (
      'generating',       -- server generating text/audio
      'saving',           -- persisting metadata + storage paths
      'saved',            -- immutable artifact
      'failed',           -- generation failed (no artifact)
      'unavailable'       -- artifact exists but audio missing/unplayable
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname = 'message_kind') then
    create type public.message_kind as enum (
      'comfort',
      'story',
      'guidance',
      'gratitude',
      'freeform'
    );
  end if;
end$$;

-- ---------- Shared helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Profiles (User/Profile) ----------
-- Supabase: auth.users is the source of truth for identity.
-- profiles extends it with app-specific fields.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- lightweight, non-sensitive display info
  display_name text,
  locale text,
  timezone text,

  -- optional: for UX flows (not billing enforcement)
  onboarding_completed_at timestamptz,

  -- safety flags (server controlled)
  is_suspended boolean not null default false,
  suspended_reason text
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_created_at on public.profiles(created_at);

-- ---------- VoiceProfile ----------
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- who/what this preserved voice represents
  label text not null,                 -- "Mom", "Me", "Dad"
  subject_name text,                   -- optional richer naming
  relationship text,                   -- optional (daughter, son, etc.)
  notes text,

  status public.voice_profile_status not null default 'created',  -- CHANGED: qualify enum for resolution

  -- capture progress
  required_clip_count int not null default 25 check (required_clip_count > 0),
  recorded_clip_count int not null default 0 check (recorded_clip_count >= 0),

  -- external voice vendor references (server-only writes)
  vendor text not null default 'elevenlabs',
  vendor_voice_id text,                -- e.g. ElevenLabs voice id
  vendor_model_id text,                -- optional
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  last_error_code text,
  last_error_message text,

  -- server-authoritative readiness gate
  ready_at timestamptz
);

drop trigger if exists trg_voice_profiles_updated_at on public.voice_profiles;
create trigger trg_voice_profiles_updated_at
before update on public.voice_profiles
for each row execute function public.set_updated_at();

create index if not exists idx_voice_profiles_user_id_created_at
  on public.voice_profiles(user_id, created_at desc);

create index if not exists idx_voice_profiles_user_id_status
  on public.voice_profiles(user_id, status);

create index if not exists idx_voice_profiles_status
  on public.voice_profiles(status);

-- ---------- TrainingClip ----------
create table if not exists public.training_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  voice_profile_id uuid not null references public.voice_profiles(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- prompt metadata
  prompt_index int not null check (prompt_index >= 1),
  prompt_stage int check (prompt_stage is null or prompt_stage between 1 and 3),

  -- client-side recording metadata
  duration_ms int check (duration_ms is null or duration_ms > 0),
  sample_rate_hz int check (sample_rate_hz is null or sample_rate_hz > 0),
  mime_type text,                      -- "audio/webm", etc.

  status public.training_clip_status not null default 'recorded',  -- CHANGED: qualify enum

  -- external storage pointer (NO AUDIO IN DB)
  storage_bucket text not null default 'audio',
  storage_path text not null,          -- deterministic key, e.g. "users/{uid}/voice_profiles/{vpid}/training/{clipid}.webm"
  content_sha256 text,                 -- optional integrity
  bytes int check (bytes is null or bytes > 0),

  -- validation signals (server-side)
  validation_score numeric(5,2) check (validation_score is null or validation_score between 0 and 100),
  rejection_reason text
);

drop trigger if exists trg_training_clips_updated_at on public.training_clips;
create trigger trg_training_clips_updated_at
before update on public.training_clips
for each row execute function public.set_updated_at();

-- prevent duplicate prompt slot per voice profile (one clip per prompt_index)
create unique index if not exists uq_training_clips_voice_profile_prompt
  on public.training_clips(voice_profile_id, prompt_index)
  where status <> 'deleted';

create index if not exists idx_training_clips_voice_profile_id_created_at
  on public.training_clips(voice_profile_id, created_at desc);

create index if not exists idx_training_clips_user_id_created_at
  on public.training_clips(user_id, created_at desc);

create index if not exists idx_training_clips_status
  on public.training_clips(status);

-- ---------- Recipient ----------
create table if not exists public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status public.recipient_status not null default 'active',  -- CHANGED: qualify enum

  name text not null,
  relationship text,                   -- "daughter", "friend", etc.
  notes text
);

drop trigger if exists trg_recipients_updated_at on public.recipients;
create trigger trg_recipients_updated_at
before update on public.recipients
for each row execute function public.set_updated_at();

create index if not exists idx_recipients_user_id_created_at
  on public.recipients(user_id, created_at desc);

create index if not exists idx_recipients_user_id_status
  on public.recipients(user_id, status);

-- ---------- Message (Immutable artifact once saved) ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,

  voice_profile_id uuid not null references public.voice_profiles(id) on delete restrict,
  recipient_id uuid references public.recipients(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status public.message_status not null default 'generating',  -- CHANGED: qualify enum
  kind public.message_kind not null default 'freeform',  -- CHANGED: qualify enum

  -- content (text metadata is OK; audio never stored here)
  title text,
  body_text text,                      -- optional transcript / text version (cap at app layer)
  body_char_count int generated always as (char_length(coalesce(body_text, ''))) stored,

  -- audio artifact pointer (NO AUDIO IN DB)
  storage_bucket text not null default 'audio',
  storage_path text,                   -- set when saved, deterministic: "users/{uid}/voice_profiles/{vpid}/messages/{msgid}.mp3"
  audio_duration_ms int check (audio_duration_ms is null or audio_duration_ms > 0),
  audio_bytes int check (audio_bytes is null or audio_bytes > 0),
  audio_sha256 text,

  -- ops + UX
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  last_error_code text,
  last_error_message text,

  -- shelf signals
  played_count int not null default 0 check (played_count >= 0),
  last_played_at timestamptz
);

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create index if not exists idx_messages_user_id_created_at
  on public.messages(user_id, created_at desc);

create index if not exists idx_messages_voice_profile_id_created_at
  on public.messages(voice_profile_id, created_at desc);

create index if not exists idx_messages_recipient_id_created_at
  on public.messages(recipient_id, created_at desc);

create index if not exists idx_messages_user_id_status
  on public.messages(user_id, status);

-- quick "most replayed"
create index if not exists idx_messages_user_id_played_count
  on public.messages(user_id, played_count desc);

-- ---------- State Machine Enforcement ----------
-- Minimal DB-level transition checks to prevent impossible jumps.
create or replace function public.enforce_voice_profile_status_transition()
returns trigger
language plpgsql
as $$
declare
  old_status public.voice_profile_status := old.status;  -- CHANGED: qualify enum
  new_status public.voice_profile_status := new.status;
begin
  if old_status = new_status then
    return new;
  end if;

  -- Allowed transitions:
  -- created -> collecting
  -- collecting -> processing | archived
  -- processing -> ready | failed
  -- failed -> archived
  -- ready -> archived
  if old_status = 'created' and new_status = 'collecting' then
    return new;
  elsif old_status = 'collecting' and (new_status in ('processing','archived')) then
    return new;
  elsif old_status = 'processing' and (new_status in ('ready','failed')) then
    return new;
  elsif old_status = 'failed' and (new_status = 'archived') then
    return new;
  elsif old_status = 'ready' and (new_status = 'archived') then
    return new;
  end if;

  raise exception 'Invalid voice_profile status transition: % -> %', old_status, new_status;
end;
$$;

drop trigger if exists trg_voice_profiles_status_transition on public.voice_profiles;
create trigger trg_voice_profiles_status_transition
before update of status on public.voice_profiles
for each row execute function public.enforce_voice_profile_status_transition();

create or replace function public.enforce_message_status_transition()
returns trigger
language plpgsql
as $$
declare
  old_status public.message_status := old.status;  -- CHANGED: qualify enum
  new_status public.message_status := new.status;
begin
  if old_status = new_status then
    return new;
  end if;

  -- Allowed transitions:
  -- generating -> saving | failed
  -- saving -> saved | failed | unavailable
  -- saved -> unavailable (if later discovered audio missing)
  if old_status = 'generating' and (new_status in ('saving','failed')) then
    return new;
  elsif old_status = 'saving' and (new_status in ('saved','failed','unavailable')) then
    return new;
  elsif old_status = 'saved' and (new_status in ('unavailable')) then
    return new;
  end if;

  raise exception 'Invalid message status transition: % -> %', old_status, new_status;
end;
$$;

drop trigger if exists trg_messages_status_transition on public.messages;
create trigger trg_messages_status_transition
before update of status on public.messages
for each row execute function public.enforce_message_status_transition();

-- Enforce immutability once saved:
-- Prevent changes to artifact-defining fields after status becomes 'saved'
create or replace function public.prevent_message_mutation_after_saved()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'saved' then
    if (new.body_text is distinct from old.body_text)
      or (new.title is distinct from old.title)
      or (new.voice_profile_id is distinct from old.voice_profile_id)
      or (new.recipient_id is distinct from old.recipient_id)
      or (new.storage_bucket is distinct from old.storage_bucket)
      or (new.storage_path is distinct from old.storage_path)
      or (new.audio_duration_ms is distinct from old.audio_duration_ms)
      or (new.audio_bytes is distinct from old.audio_bytes)
      or (new.audio_sha256 is distinct from old.audio_sha256)
      or (new.kind is distinct from old.kind)
    then
      raise exception 'Message is immutable after saved';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_immutable on public.messages;
create trigger trg_messages_immutable
before update on public.messages
for each row execute function public.prevent_message_mutation_after_saved();

-- ---------- RLS ----------
-- Profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Voice Profiles
alter table public.voice_profiles enable row level security;

drop policy if exists "voice_profiles_crud_own" on public.voice_profiles;
create policy "voice_profiles_crud_own"
on public.voice_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Training Clips
alter table public.training_clips enable row level security;

drop policy if exists "training_clips_crud_own" on public.training_clips;
create policy "training_clips_crud_own"
on public.training_clips
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Recipients
alter table public.recipients enable row level security;

drop policy if exists "recipients_crud_own" on public.recipients;
create policy "recipients_crud_own"
on public.recipients
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Messages
alter table public.messages enable row level security;

drop policy if exists "messages_crud_own" on public.messages;
create policy "messages_crud_own"
on public.messages
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;


-- ========== Verification checklist (run after migration) ==========
-- 5 tables: select table_name from information_schema.tables where table_schema = 'public' and table_name in ('profiles','voice_profiles','training_clips','recipients','messages') order by 1;
-- 5 enums: select n.nspname, t.typname, array_agg(e.enumlabel order by e.enumsortorder) from pg_type t join pg_enum e on t.oid = e.enumtypid join pg_namespace n on t.typnamespace = n.oid where n.nspname = 'public' and t.typname in ('voice_profile_status','training_clip_status','recipient_status','message_status','message_kind') group by n.nspname, t.typname order by 1, 2;
-- Triggers: select event_object_table, trigger_name from information_schema.triggers where trigger_schema = 'public' and event_object_table in ('profiles','voice_profiles','training_clips','recipients','messages') order by event_object_table, trigger_name;
-- RLS on all 5: select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('profiles','voice_profiles','training_clips','recipients','messages') order by 1;
-- Policies: select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('profiles','voice_profiles','training_clips','recipients','messages') order by tablename, policyname;
-- Unique partial index (training_clips): select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'training_clips' and indexname = 'uq_training_clips_voice_profile_prompt';


-- ========== Optional later (not implemented) ==========
-- Backfill existing auth.users into public.profiles (user_id, display_name, etc.) if migrating from 0003 without dropping data.
-- Add delete policies for voice_profiles, training_clips, recipients, messages if soft-delete or audit requirements appear.
-- Consider partitioning messages by created_at if volume grows.
-- Add comment on table/column for docs (e.g. storage_path format).
-- Consider SECURITY DEFINER for set_updated_at if RLS causes trigger to run with restricted role.
