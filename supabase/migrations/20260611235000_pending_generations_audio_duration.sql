-- Measured audio duration for pending takes (FOLLOW_UPS #37).
--
-- Nothing in the Step 6 pipeline measured the rendered clip's duration, so
-- A6 painted its scrubber from a words-per-minute estimate. ElevenLabs
-- returns CBR mp3 (default mp3_44100_128), so duration derives exactly from
-- byte length; generateAndStoreAudio now computes and stores it here, /commit
-- returns it, and /save copies it to messages.audio_duration_ms (column
-- already existed, never populated).
--
-- Nullable: rows rendered before this migration (and failed renders) have no
-- measurement; readers fall back to the estimate.

begin;

alter table public.pending_generations
  add column audio_duration_ms integer;

comment on column public.pending_generations.audio_duration_ms is
  'Measured duration of the rendered take at audio_path, in ms (derived from CBR mp3 byte length). Null for pre-migration rows and failed renders; copied to messages.audio_duration_ms on save.';

commit;
