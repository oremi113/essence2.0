-- Replace the dormant `message_kind` enum with a user-facing `message_category`.
--
-- Context: `message_kind` (comfort | story | guidance | gratitude | freeform)
-- shipped in 20260213133000_phase3_primitives_state_machines.sql but was never
-- read or written by application code. Session 8 introduces a 7-value
-- user-facing category taxonomy that doesn't align with the old enum, so we
-- drop the old column/type and replace it cleanly.
--
-- Pre-existing rows (all `kind = 'freeform'` by default) get backfilled to
-- `'checking_in'` as the most neutral category; the default is dropped
-- immediately after so future inserts must specify `category` explicitly.

begin;

-- --- Drop the dormant column and its enum ---
alter table public.messages drop column kind;
drop type public.message_kind cascade;

-- --- Create the user-facing category enum ---
create type public.message_category as enum (
  'birthday',
  'encouragement',
  'daily_reminder',
  'future_message',
  'comfort',
  'holiday',
  'checking_in'
);

-- --- Add the column with a transient default for safe backfill ---
alter table public.messages
  add column category public.message_category not null default 'checking_in';

-- Drop the default so future inserts must specify `category` explicitly.
alter table public.messages
  alter column category drop default;

commit;
