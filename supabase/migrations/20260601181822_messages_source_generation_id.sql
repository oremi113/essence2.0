-- Session 8 Step 6: idempotency key for /api/messages/save.
--
-- Adds `messages.source_generation_id` — the pending_generations row that
-- produced this message. The unique constraint makes /save idempotent by
-- generation_id: a retried double-tap returns the existing messages row
-- instead of inserting a second immutable artifact (and re-copying audio,
-- and re-billing ElevenLabs).
--
-- Per Step6_OpenContracts.md Q5. `on delete set null` so a cleanup of the
-- pending row (post-Save promotion or expiry sweep) does not break the
-- saved message — the link is informational once Save completes.

begin;

alter table public.messages
  add column source_generation_id uuid unique
    references public.pending_generations(generation_id)
    on delete set null;

comment on column public.messages.source_generation_id is
  'The pending_generations row that produced this message. Unique, so POST /api/messages/save is idempotent by generation_id: replayed requests return the existing message rather than inserting a duplicate immutable artifact or re-copying audio. Set to null if the pending row is later cleaned up.';

commit;
