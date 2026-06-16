-- Phase 8: Hardening + Guardrails
-- 1) usage_events table (rate limiting + audit ledger)
-- 2) idempotency_key on messages
-- 3) advisory lock helper function

-- =========================================================================
-- 1. usage_events — lightweight ledger for rate limiting and cost audit
-- =========================================================================

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  action text not null,               -- 'message_generate', 'voice_create', 'signed_url_playback', 'signed_url_upload'
  request_id text,
  idempotency_key text,
  outcome text not null default 'started',  -- 'started', 'success', 'error', 'rejected'
  created_at timestamptz not null default now(),
  meta jsonb
);

-- Index for rate limit queries: count events per user+action in a time window
create index if not exists idx_usage_events_user_action_time
  on public.usage_events (user_id, action, created_at desc);

-- RLS: users can read their own events; writes happen via service role from server
alter table public.usage_events enable row level security;

create policy "usage_events_select_own"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Server writes via service role bypass RLS, so no INSERT policy needed for
-- the anon/authenticated role. If we want client-side reads only, this is sufficient.

-- =========================================================================
-- 2. idempotency_key on messages
-- =========================================================================

alter table public.messages add column if not exists idempotency_key text;

-- Partial unique index: prevents duplicate in-flight or saved messages with the same key.
-- Excludes 'failed' so retries after failure can reuse the same key.
create unique index if not exists idx_messages_idempotency_key
  on public.messages (idempotency_key)
  where idempotency_key is not null and status not in ('failed');

-- =========================================================================
-- 3. Advisory lock helper (Supabase JS can't call pg_advisory_xact_lock directly)
-- =========================================================================

create or replace function public.acquire_advisory_lock(lock_key bigint)
returns void
language plpgsql
security definer
as $$
begin
  perform pg_advisory_xact_lock(lock_key);
end;
$$;
