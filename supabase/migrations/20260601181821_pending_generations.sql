-- Session 8 Step 6: in-flight state for the message-creation flow.
--
-- Adds `pending_generations` — a server-owned ephemeral row that holds
-- everything generated between A2 (recipient pick) and A7 (Save). Messages
-- are immutable, so we cannot use a draft `messages` row; this table is the
-- durable home for in-flight inputs/outputs, lifecycle flags, lineage links,
-- and TTL for cleanup.
--
-- Recipients are NOT promoted into `recipients` until Save — newly typed
-- recipients live here as `pending_recipient_name` + `pending_recipient_relationship`
-- so aborted flows do not leak permanent contacts into Settings.
--
-- Per Step6_OpenContracts.md Q1. RLS allows owners to select/insert/update
-- their own rows; deletes happen server-side via the service role (Save
-- promotion + the expiry/cleanup job), so no client delete policy is added.

begin;

-- ---- pending_generations table ----

create table public.pending_generations (
  generation_id        uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  voice_profile_id     uuid not null references public.voice_profiles(id) on delete cascade,

  -- Recipient (one of these branches is populated)
  recipient_id                   uuid references public.recipients(id) on delete set null,
  pending_recipient_name         text,
  pending_recipient_relationship text,

  -- Content
  category             public.message_category not null,
  note                 text,                       -- nullable; <= 200 chars (enforced at app layer)
  template_variant     text not null,              -- e.g. "birthday.v2"
  generated_text       text,                       -- nullable until text gen succeeds
  audio_path           text,                       -- nullable until audio gen succeeds

  -- Lifecycle
  text_status          text not null default 'pending', -- 'pending' | 'succeeded' | 'failed'
  audio_status         text not null default 'pending', -- 'pending' | 'succeeded' | 'failed'
  regenerate_count     int  not null default 0,    -- capped at MAX_REGENERATES (3) in app layer
  edit_note_depth      int  not null default 0,    -- capped at MAX_EDIT_NOTE_DEPTH (2) in app layer
  source_generation_id uuid references public.pending_generations(generation_id),
  superseded_at        timestamptz,                -- set when this lineage member is replaced
  saved_message_id     uuid references public.messages(id), -- set when promoted to a message

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  expires_at           timestamptz not null default (now() + interval '24 hours')
);

comment on table public.pending_generations is
  'Server-owned ephemeral state for the Step 6 message-creation flow (A2 -> A7). Holds in-flight recipient/content/lifecycle data until Save promotes it into an immutable messages row, or until the expiry/cleanup job removes it. Recipients typed mid-flow live here (pending_recipient_*) and are only promoted to recipients rows on Save.';

comment on column public.pending_generations.recipient_id is
  'Set when the user picked an existing recipient at A2. Mutually exclusive with pending_recipient_name in practice (app-layer invariant).';

comment on column public.pending_generations.pending_recipient_name is
  'Set when the user typed a new recipient at A2. Promoted to a recipients row only on Save, so aborted flows do not leak permanent contacts.';

comment on column public.pending_generations.template_variant is
  'Generation template id (e.g. "birthday.v2"). Stable across system retries; rerolled only on user-initiated Regenerate.';

comment on column public.pending_generations.regenerate_count is
  'Number of user-initiated regenerates within this generation_id. Capped at MAX_REGENERATES (3) in the app layer. Distinct from system retries.';

comment on column public.pending_generations.edit_note_depth is
  'Lineage depth across edit-note hops. Incremented when a new pending_generations row is forked via fromGenerationId. Capped at MAX_EDIT_NOTE_DEPTH (2) to close the regenerate-cap bypass loop.';

comment on column public.pending_generations.source_generation_id is
  'Link to the prior pending_generations row when this row was forked via the "Reshape your note" path (A6 -> A4). Forms the lineage chain.';

comment on column public.pending_generations.superseded_at is
  'Set when a successful replacement (edit-note fork) takes over as the active row. Superseded rows are retained until the expiry job removes them.';

comment on column public.pending_generations.saved_message_id is
  'Set on first successful Save. Short-circuits subsequent /save calls for idempotency.';

comment on column public.pending_generations.expires_at is
  'Defaults to created_at + 24h. The cleanup job (manual prune in V1, periodic post-MVP) deletes rows past this timestamp.';

-- ---- Partial indexes ----

-- Active in-flight rows for a user (not saved, not superseded). Drives
-- per-user pending caps (MAX_ACTIVE_PENDING_PER_USER) and "resume your
-- in-progress message" lookups.
create index idx_pending_generations_user_active
  on public.pending_generations (user_id)
  where saved_message_id is null and superseded_at is null;

-- Expiry sweep target. Saved rows do not need cleanup (they were promoted);
-- everything else is fair game once expires_at passes.
create index idx_pending_generations_expires_at
  on public.pending_generations (expires_at)
  where saved_message_id is null;

-- ---- updated_at trigger ----

drop trigger if exists trg_pending_generations_updated_at on public.pending_generations;
create trigger trg_pending_generations_updated_at
before update on public.pending_generations
for each row execute function public.set_updated_at();

-- ---- RLS ----

alter table public.pending_generations enable row level security;

-- Users can read their own pending rows (resume flow, hydrate /generate
-- responses).
create policy "users can read their own pending generations"
  on public.pending_generations
  for select
  using (auth.uid() = user_id);

-- Users can create pending rows for themselves. Server endpoints run with
-- the user's session, so this still applies on the /generate path.
create policy "users can create their own pending generations"
  on public.pending_generations
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own rows. The server mutates status fields,
-- counts, and lifecycle markers; the with-check clause prevents reparenting
-- a row to another user.
create policy "users can update their own pending generations"
  on public.pending_generations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy on purpose. Save promotion and the expiry/cleanup job
-- both run with the service-role key, which bypasses RLS. Clients have no
-- need (and no business) deleting pending_generations directly.

commit;
