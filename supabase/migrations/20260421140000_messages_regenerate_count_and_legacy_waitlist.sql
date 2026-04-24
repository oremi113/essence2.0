-- Session 8 Pass 0.5: schema additions for V1 Vault-only message creation.
--
-- Adds:
--   1. messages.regenerate_count — tracks user-initiated regenerate count (capped at 3 in app layer)
--   2. legacy_waitlist — captures Legacy tier interest from Vault users at message-3 cap
--
-- Note: scheduled_for column was considered and deferred. V1 has no scheduling feature.
-- Adding it now would create a dormant column with no consumer.

begin;

-- ---- regenerate_count ----

alter table public.messages
  add column regenerate_count int not null default 0;

comment on column public.messages.regenerate_count is
  'Number of times the user has regenerated this message variant. Capped at 3 in the app layer (MAX_REGENERATES). Distinct from server-side failure retries.';

-- ---- legacy_waitlist ----

create table public.legacy_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  email text not null,
  joined_at timestamptz not null default now(),
  source text not null default 'c2_legacy_expansion',
  notes text,
  unique (user_id)
);

comment on table public.legacy_waitlist is
  'Waitlist for the Legacy tier. Populated when Vault users hit the 3-message lifetime cap and opt in via the C2 ceremonial moment. Validation signal for Legacy demand before building Legacy infrastructure.';

comment on column public.legacy_waitlist.source is
  'Where the waitlist signup originated. Default c2_legacy_expansion. Future surfaces may add their own source values for attribution.';

comment on column public.legacy_waitlist.notes is
  'Optional. Future use for capturing user-provided context (e.g., what feature they want most). Null in V1.';

-- ---- Indexes ----

-- Most queries will filter by user_id (already enforced by unique constraint).
-- Add an index on joined_at for analytics queries about signup velocity.
create index idx_legacy_waitlist_joined_at on public.legacy_waitlist (joined_at desc);

-- ---- RLS ----

alter table public.legacy_waitlist enable row level security;

-- Users can read and insert their own waitlist row. No update or delete from client.
create policy "users can read their own waitlist row"
  on public.legacy_waitlist
  for select
  using (auth.uid() = user_id);

create policy "users can join the waitlist"
  on public.legacy_waitlist
  for insert
  with check (auth.uid() = user_id);

-- No update or delete policy — waitlist entries are append-only from the user side.
-- Admin operations happen via service-role key, which bypasses RLS.

commit;
