-- Fix: prevent_message_mutation_after_saved() still references messages.kind,
-- which 20260421120000_messages_category.sql dropped (replaced by category).
-- plpgsql resolves record fields at runtime, so since that drop EVERY update
-- to a saved messages row raises `record "new" has no field "kind"` —
-- including updates the guard is meant to ALLOW (non-artifact fields) and the
-- `on delete set null` cascade onto messages.source_generation_id when a
-- promoted pending_generations row is cleaned up.
--
-- Surfaced by the A6 Chunk-2 live smoke pass (2026-06-11); diagnosis and
-- repro in FOLLOW_UPS #39. The fix recreates the function with `category`
-- (kind's user-facing replacement, equally artifact-defining) in the
-- immutable-field comparison. The trigger itself (trg_messages_immutable)
-- is unchanged.

begin;

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
      or (new.category is distinct from old.category)
    then
      raise exception 'Message is immutable after saved';
    end if;
  end if;

  return new;
end;
$$;

commit;
