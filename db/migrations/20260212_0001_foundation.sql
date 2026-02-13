begin;

create extension if not exists "pgcrypto";

-- Status enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_clip_status') then
    create type training_clip_status as enum ('uploaded', 'processing', 'ready', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type message_status as enum ('generating', 'ready', 'failed');
  end if;
end $$;

-- Voice Profiles
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_profiles enable row level security;

create policy "voice_profiles_select_own"
on public.voice_profiles
for select
using (auth.uid() = user_id);

create policy "voice_profiles_insert_own"
on public.voice_profiles
for insert
with check (auth.uid() = user_id);

create policy "voice_profiles_update_own"
on public.voice_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Recipients
create table if not exists public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipients enable row level security;

create policy "recipients_select_own"
on public.recipients
for select
using (auth.uid() = user_id);

create policy "recipients_insert_own"
on public.recipients
for insert
with check (auth.uid() = user_id);

create policy "recipients_update_own"
on public.recipients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Training Clips (metadata only)
create table if not exists public.training_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  status training_clip_status not null default 'uploaded',
  storage_bucket text not null default 'training-clips',
  storage_path text not null,
  mime_type text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_clips enable row level security;

create policy "training_clips_select_own"
on public.training_clips
for select
using (auth.uid() = user_id);

create policy "training_clips_insert_own"
on public.training_clips
for insert
with check (auth.uid() = user_id);

create policy "training_clips_update_own"
on public.training_clips
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Messages (immutable)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_profile_id uuid not null references public.voice_profiles(id) on delete restrict,
  recipient_id uuid references public.recipients(id) on delete set null,
  status message_status not null default 'generating',
  title text,
  prompt text,
  model_provider text not null default 'elevenlabs',
  model_id text,
  storage_bucket text not null default 'messages',
  storage_path text not null,
  mime_type text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select_own"
on public.messages
for select
using (auth.uid() = user_id);

create policy "messages_insert_own"
on
